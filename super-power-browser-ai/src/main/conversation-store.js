import { DatabaseSync } from "node:sqlite";
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  renameSync,
  statfsSync,
  statSync,
  openSync,
  fsyncSync,
  closeSync,
  cpSync,
} from "node:fs";
import { join, resolve, isAbsolute } from "node:path";
import { createHash } from "node:crypto";

const identity = (value) => {
  if (typeof value !== "string" || !value.trim() || value.length > 500)
    throw Error("会话账号标识无效");
  return value;
};
const validate = (items) => {
  if (
    !Array.isArray(items) ||
    items.some(
      (item) =>
        !item ||
        typeof item.id !== "string" ||
        !item.id ||
        !Array.isArray(item.messages) ||
        (item.tools !== undefined && !Array.isArray(item.tools)),
    )
  )
    throw Error("会话数据格式无效，原记录未修改");
  if (new Set(items.map((item) => item.id)).size !== items.length)
    throw Error("会话标识重复，原记录未修改");
  const text = JSON.stringify(items);
  if (Buffer.byteLength(text) > 128 * 1024 * 1024)
    throw Error("会话数据过大，原记录未修改");
  return text;
};

export class ConversationStore {
  constructor(directory) {
    this.rootDirectory = directory;
    this.locationFile = join(directory, "conversation-storage.json");
    if (existsSync(this.locationFile)) {
      const saved = JSON.parse(readFileSync(this.locationFile, "utf8"));
      if (!saved.directory || !isAbsolute(saved.directory))
        throw Error("会话存储目录配置无效");
      directory = saved.directory;
      if (!existsSync(join(directory, "conversations.sqlite")))
        throw Error("会话数据库所在磁盘不可用，请连接原磁盘后重试");
    }
    this.directory = directory;
    this.filePath = join(directory, "conversations.sqlite");
  }
  readSpace(directory) {
    return statfsSync(directory);
  }
  storageInfo() {
    let freeBytes = null;
    try {
      const info = this.readSpace(this.directory);
      freeBytes = Number(info.bavail) * Number(info.bsize);
    } catch {}
    return {
      path: this.filePath,
      directory: this.directory,
      freeBytes,
      lowSpace: freeBytes !== null && freeBytes < 256 * 1024 * 1024,
    };
  }
  writeLocation(directory) {
    mkdirSync(this.rootDirectory, { recursive: true });
    const temp = this.locationFile + ".tmp";
    writeFileSync(temp, JSON.stringify({ version: 1, directory }));
    const descriptor = openSync(temp, "r+");
    try {
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    renameSync(temp, this.locationFile);
  }
  migrate(directory) {
    if (!isAbsolute(directory)) throw Error("请选择有效的本地目录");
    if (
      resolve(directory).toLowerCase() === resolve(this.directory).toLowerCase()
    )
      return this.storageInfo();
    const source = this.open();
    const previousPath = this.filePath;
    mkdirSync(directory, { recursive: true });
    const target = join(directory, "conversations.sqlite");
    if (existsSync(target))
      throw Error("目标目录已有会话数据库，请选择空目录，避免覆盖");
    const space = this.readSpace(directory);
    if (
      Number(space.bavail) * Number(space.bsize) <
      Math.max(statSync(this.filePath).size * 2, 64 * 1024 * 1024)
    )
      throw Error("目标磁盘空间不足");
    const digest = (db) => {
      const hash = createHash("sha256");
      for (const table of ["accounts", "conversations", "migrations"]) {
        hash.update(table);
        for (const row of db
          .prepare("SELECT * FROM " + table + " ORDER BY 1,2")
          .iterate())
          hash.update(JSON.stringify(row));
      }
      return hash.digest("hex");
    };
    const original = digest(source);
    source.prepare("VACUUM INTO ?").run(target);
    const copied = new DatabaseSync(target);
    try {
      if (
        copied.prepare("PRAGMA integrity_check").get().integrity_check !==
          "ok" ||
        digest(copied) !== original ||
        digest(source) !== original
      )
        throw Error("数据库转移校验失败，原数据库保持不变");
      const backups = join(this.directory, "conversation-backups");
      if (existsSync(backups))
        cpSync(backups, join(directory, "conversation-backups"), {
          recursive: true,
          errorOnExist: true,
          force: false,
        });
      copied.exec(
        "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;",
      );
      this.writeLocation(directory);
    } catch (error) {
      copied.close();
      throw error;
    }
    this.db = copied;
    this.directory = directory;
    this.filePath = target;
    source.close();
    return { ...this.storageInfo(), previousPath };
  }
  open() {
    if (this.db) return this.db;
    mkdirSync(this.directory, { recursive: true });
    this.db = new DatabaseSync(this.filePath);
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS conversations(account_id TEXT NOT NULL, id TEXT NOT NULL, position INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(account_id,id));
      CREATE TABLE IF NOT EXISTS migrations(account_id TEXT NOT NULL, source_id TEXT NOT NULL, PRIMARY KEY(account_id,source_id));`);
    return this.db;
  }
  transaction(action) {
    const db = this.open();
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = action(db);
      db.exec("COMMIT");
      return result;
    } catch (error) {
      // SQLITE_FULL can automatically roll back; keep the original disk error.
      try {
        db.exec("ROLLBACK");
      } catch {}
      throw error;
    }
  }
  load({
    accountId,
    sourceId = "",
    legacy,
    page,
    conversationId,
    excludeIds,
    kind = "all",
  }) {
    identity(accountId);
    const db = this.open();
    if (legacy !== undefined) {
      identity(sourceId);
      const text = validate(legacy);
      if (
        !db
          .prepare(
            "SELECT 1 FROM migrations WHERE account_id=? AND source_id=?",
          )
          .get(accountId, sourceId)
      ) {
        const backupDir = join(this.directory, "conversation-backups");
        mkdirSync(backupDir, { recursive: true });
        const name = createHash("sha256")
          .update(JSON.stringify([accountId, sourceId, text]))
          .digest("hex");
        const backup = join(backupDir, `migration-${name}.json`);
        if (!existsSync(backup))
          writeFileSync(
            backup,
            JSON.stringify({
              accountId,
              sourceId,
              conversations: JSON.parse(text),
            }),
            { flag: "wx" },
          );
        this.transaction((db) => {
          db.prepare("INSERT OR IGNORE INTO accounts(id) VALUES(?)").run(
            accountId,
          );
          let position =
            Number(
              db
                .prepare(
                  "SELECT COALESCE(MAX(position),-1) AS n FROM conversations WHERE account_id=?",
                )
                .get(accountId).n,
            ) + 1;
          const insert = db.prepare(
            "INSERT OR IGNORE INTO conversations VALUES(?,?,?,?)",
          );
          for (const item of legacy)
            insert.run(accountId, item.id, position++, JSON.stringify(item));
          db.prepare("INSERT INTO migrations VALUES(?,?)").run(
            accountId,
            sourceId,
          );
          db.prepare("UPDATE accounts SET revision=revision+1 WHERE id=?").run(
            accountId,
          );
        });
      }
    }
    if (conversationId !== undefined) {
      identity(conversationId);
      const row = db
        .prepare("SELECT data FROM conversations WHERE account_id=? AND id=?")
        .get(accountId, conversationId);
      return { conversations: row ? [JSON.parse(row.data)] : [] };
    }
    if (page !== undefined) {
      const filters = {
        all: "1",
        ordinary:
          "COALESCE(json_extract(data,'$.scheduledTaskId'),'')='' AND COALESCE(json_extract(data,'$.skillTrial'),0) IN (0,'')",
        skill:
          "COALESCE(json_extract(data,'$.scheduledTaskId'),'')='' AND COALESCE(json_extract(data,'$.skillTrial'),0) NOT IN (0,'')",
        scheduled: "COALESCE(json_extract(data,'$.scheduledTaskId'),'')<>''",
      };
      if (!Object.hasOwn(filters, kind)) throw Error("会话筛选条件无效");
      const filter = filters[kind];
      const offset = Math.max(0, Number(page) || 0) * 30;
      return this.transaction((db) => ({
        conversations: db
          .prepare(
            `SELECT json_remove(data,'$.messages','$.tools') AS data FROM conversations WHERE account_id=? AND (${filter}) AND id NOT IN (SELECT value FROM json_each(?)) ORDER BY COALESCE(json_extract(data,'$.isMainConversation'),0) DESC, COALESCE(json_extract(data,'$.lastMessageAt'),json_extract(data,'$.createdAt'),0) DESC, id LIMIT 30 OFFSET ?`,
          )
          .all(
            accountId,
            JSON.stringify(excludeIds || []),
            excludeIds ? 0 : offset,
          )
          .map((row) => ({
            ...JSON.parse(row.data),
            messages: [],
            tools: [],
            _summary: true,
          })),
        revision: Number(
          db.prepare("SELECT revision FROM accounts WHERE id=?").get(accountId)
            ?.revision || 0,
        ),
        related:
          offset === 0
            ? db
                .prepare(
                  "SELECT json_remove(data,'$.messages','$.tools') AS data FROM conversations WHERE account_id=? AND (json_extract(data,'$.scheduledTaskId') IS NOT NULL OR json_extract(data,'$.channel') IS NOT NULL OR COALESCE(json_extract(data,'$.unreadCount'),0)>0)",
                )
                .all(accountId)
                .map((row) => ({
                  ...JSON.parse(row.data),
                  messages: [],
                  tools: [],
                  _summary: true,
                }))
            : [],
        total: Number(
          db
            .prepare(
              `SELECT COUNT(*) n FROM conversations WHERE account_id=? AND (${filter})`,
            )
            .get(accountId).n,
        ),
        hasMore:
          Number(
            db
              .prepare(
                `SELECT COUNT(*) n FROM conversations WHERE account_id=? AND (${filter}) AND id NOT IN (SELECT value FROM json_each(?))`,
              )
              .get(accountId, JSON.stringify(excludeIds || [])).n,
          ) > (excludeIds ? 30 : offset + 30),
        path: this.filePath,
      }));
    }
    // Read records and their revision from the same transaction, including when
    // another client process shares this database.
    return this.transaction((db) => ({
      conversations: db
        .prepare(
          "SELECT data FROM conversations WHERE account_id=? ORDER BY position",
        )
        .all(accountId)
        .map((row) => JSON.parse(row.data)),
      revision: Number(
        db.prepare("SELECT revision FROM accounts WHERE id=?").get(accountId)
          ?.revision || 0,
      ),
      legacyImported: legacy !== undefined,
      path: this.filePath,
    }));
  }
  save({
    accountId,
    conversations,
    expectedRevision,
    partial = false,
    deletedIds = [],
  }) {
    identity(accountId);
    validate(conversations);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
      throw Error("会话版本无效，请重新加载");
    return this.transaction((db) => {
      db.prepare("INSERT OR IGNORE INTO accounts(id) VALUES(?)").run(accountId);
      const revision = Number(
        db.prepare("SELECT revision FROM accounts WHERE id=?").get(accountId)
          .revision,
      );
      if (revision !== expectedRevision)
        throw Error("会话已在其他页面更新，为避免覆盖，请重新打开会话页面");
      if (partial) {
        for (const id of deletedIds) {
          identity(id);
          db.prepare(
            "DELETE FROM conversations WHERE account_id=? AND id=?",
          ).run(accountId, id);
        }
        let position =
          Number(
            db
              .prepare(
                "SELECT COALESCE(MAX(position),-1) n FROM conversations WHERE account_id=?",
              )
              .get(accountId).n,
          ) + 1;
        for (const item of conversations) {
          const row = db
            .prepare(
              "SELECT data,position FROM conversations WHERE account_id=? AND id=?",
            )
            .get(accountId, item.id);
          const old = row ? JSON.parse(row.data) : {};
          const data = item._summary
            ? {
                ...old,
                ...item,
                messages: [
                  ...new Map(
                    [...(old.messages || []), ...item.messages].map((x) => [
                      x.id || JSON.stringify(x),
                      x,
                    ]),
                  ).values(),
                ],
                tools: [
                  ...new Map(
                    [...(old.tools || []), ...(item.tools || [])].map((x) => [
                      x.id || JSON.stringify(x),
                      x,
                    ]),
                  ).values(),
                ],
              }
            : { ...item };
          delete data._summary;
          db.prepare(
            "INSERT OR REPLACE INTO conversations VALUES(?,?,?,?)",
          ).run(
            accountId,
            item.id,
            row?.position ?? position++,
            JSON.stringify(data),
          );
        }
        db.prepare("UPDATE accounts SET revision=revision+1 WHERE id=?").run(
          accountId,
        );
        return { revision: revision + 1 };
      }
      db.prepare("DELETE FROM conversations WHERE account_id=?").run(accountId);
      const insert = db.prepare("INSERT INTO conversations VALUES(?,?,?,?)");
      conversations.forEach((item, index) =>
        insert.run(accountId, item.id, index, JSON.stringify(item)),
      );
      db.prepare("UPDATE accounts SET revision=revision+1 WHERE id=?").run(
        accountId,
      );
      return { revision: revision + 1 };
    });
  }
  exportData({ accountId, conversations }) {
    identity(accountId);
    validate(conversations);
    const all = new Map(
      this.load({ accountId }).conversations.map((item) => [item.id, item]),
    );
    for (const item of conversations)
      if (!item._summary) all.set(item.id, item);
    conversations = [...all.values()];
    return JSON.stringify(
      {
        version: 1,
        accountId,
        exportedAt: new Date().toISOString(),
        conversations,
      },
      null,
      2,
    );
  }
  close() {
    this.db?.close();
    this.db = null;
  }
}
