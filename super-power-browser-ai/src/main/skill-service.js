import { app, dialog } from "electron"
import extract from "extract-zip"
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { createHash, randomBytes } from "node:crypto"
import { basename, dirname, extname, join, relative, resolve } from "node:path"
import { tmpdir } from "node:os"
import { parseSkillConfigFromMarkdown } from "@cline/sdk"

export const normalizeSkillId = (value) => {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "local-skill"
}

const yamlText = (value) => JSON.stringify(String(value || "").trim())

export const buildSkillMarkdown = ({ name, description, triggers = [], instructions, permissions = [] }) => {
  const cleanName = String(name || "").trim()
  const cleanDescription = String(description || "").trim()
  const cleanInstructions = String(instructions || "").trim()
  if (!cleanName) throw new Error("请填写技能名称")
  if (!cleanDescription) throw new Error("请填写技能描述")
  if (!cleanInstructions) throw new Error("请填写执行说明")

  const triggerLines = triggers.map((item) => String(item).trim()).filter(Boolean).map((item) => `- ${item}`).join("\n") || "- 用户明确提出相关需求时"
  const permissionLines = permissions.map((item) => String(item).trim()).filter(Boolean).map((item) => `- ${item}`).join("\n") || "- 生成文字内容"
  return `---\nname: ${yamlText(cleanName)}\ndescription: ${yamlText(cleanDescription)}\n---\n\n# ${cleanName}\n\n## 使用场景\n\n${triggerLines}\n\n## 执行说明\n\n${cleanInstructions}\n\n## 涉及的操作\n\n${permissionLines}\n\n以上为操作说明，不代表已授予权限。实际执行须遵循会话授权和工具审批。\n`
}

export const updateSkillMarkdown = ({ name, description, content }) => {
  const cleanName = String(name || "").trim()
  const cleanDescription = String(description || "").trim()
  if (!cleanName) throw new Error("请填写技能名称")
  if (!cleanDescription) throw new Error("请填写技能描述")
  const body = String(content || "").replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/, "").trim()
  if (!body) throw new Error("技能说明不能为空")
  const requiresShop = readFrontmatter(content)['requires-shop'] === 'true'
  return `---\nname: ${yamlText(cleanName)}\ndescription: ${yamlText(cleanDescription)}\n${requiresShop ? 'requires-shop: true\n' : ''}---\n\n${body}\n`
}

/** 读取 frontmatter。兼容 description: > 和 description: | 这种多行写法 */
function readFrontmatter(content) {
  const body = String(content || "").replace(/^\uFEFF/, "")
  const match = body.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const lines = match[1].split(/\r?\n/)
  const data = {}
  for (let index = 0; index < lines.length; index += 1) {
    const found = lines[index].match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!found) continue
    const key = found[1]
    let value = found[2].trim()
    if (value === ">" || value === ">-" || value === "|" || value === "|-") {
      const folded = value.startsWith(">")
      const block = []
      while (index + 1 < lines.length) {
        const next = lines[index + 1]
        if (!/^(\s|$)/.test(next)) break
        index += 1
        block.push(next.trim())
      }
      value = block.filter(Boolean).join(folded ? " " : "\n").trim()
    } else if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    data[key] = value
  }
  return data
}

/** 技能目录下的全部文件，相对路径用 /，内容用 base64，避免脚本等二进制被截断 */
async function listSkillFiles(root) {
  const files = []
  const walk = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const absolute = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(absolute)
        continue
      }
      if (!entry.isFile()) continue
      const path = relative(root, absolute).split(/[\\/]/).join("/")
      if (!path || path === ".." || path.startsWith("../")) continue
      files.push({ path, data: (await readFile(absolute)).toString("base64") })
    }
  }
  await walk(root)
  files.sort((left, right) => left.path.localeCompare(right.path))
  return files
}

export const parseSkillMetadata = (content, fallbackName) => {
  const parsed = parseSkillConfigFromMarkdown(content, fallbackName)
  const frontmatter = readFrontmatter(content)
  const inlineName = content.match(/^#{1,6}\s*(?:技能)?(?:名称|名字)\s*[：:]\s*(.+?)\s*$/im)?.[1]?.trim()
  const inlineDescription = content.match(/^#{0,6}\s*(?:技能)?描述\s*[：:]\s*(.+?)\s*$/im)?.[1]?.trim()
  const descriptionSection = content.match(/^#{1,6}\s*(?:技能)?描述\s*$\r?\n+([\s\S]*?)(?=^#{1,6}\s|\s*$)/im)?.[1]
  const sectionDescription = descriptionSection
    ?.split(/\r?\n\s*\r?\n/)
    .map((value) => value.trim())
    .find(Boolean)
  return {
    ...parsed,
      requiresShop: frontmatter['requires-shop'] === 'true',
    name: frontmatter.name || (parsed.name && parsed.name !== fallbackName ? parsed.name : (inlineName || parsed.name || fallbackName)),
    description: [frontmatter.description, parsed.description].find((value) => value && value !== ">" && value !== "|") || inlineDescription || sectionDescription,
  }
}

export async function findSkillFile(root) {
  const entries = await readdir(root, { withFileTypes: true })
  const entry = entries.find((item) => item.isFile() && item.name.toLocaleLowerCase() === "skill.md")
  return entry ? join(root, entry.name) : null
}

async function pathExists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/** 已安装技能的版本号，读技能目录里的 _meta.json */
async function readInstalledVersion(skillRoot) {
  try {
    const raw = await readFile(join(skillRoot, "_meta.json"), "utf8")
    const meta = JSON.parse(String(raw).replace(/^\uFEFF/, ""))
    const version = meta?.version
    return typeof version === "string" || typeof version === "number" ? String(version).trim() : ""
  } catch {
    return ""
  }
}

/** 技能目录的创建时间。文件系统没有 birthtime 时退回变更时间。 */
async function skillCreatedAt(skillRoot) {
  try {
    const info = await stat(skillRoot)
    const time = info.birthtimeMs || info.ctimeMs || info.mtimeMs || 0
    return Number.isFinite(time) && time > 0 ? time : 0
  } catch {
    return 0
  }
}

export async function findSkillRoots(root, depth = 0) {
  if (depth > 4) return []
  if (await findSkillFile(root)) return [root]
  const entries = await readdir(root, { withFileTypes: true })
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => findSkillRoots(join(root, entry.name), depth + 1)),
  )
  return nested.flat()
}

export class SkillService {
  constructor(dataDir = "") {
    this.statePath = join(dataDir || app.getPath("userData"), "skills-state.json")
  }

  getDirectory(scope, workspace) {
    if (scope === "workspace") {
      if (!workspace) throw new Error("请先选择工作区")
      return join(workspace, ".agents", "skills")
    }
    return join(app.getPath("home"), ".agents", "skills")
  }

  async readState() {
    try {
      return JSON.parse(await readFile(this.statePath, "utf8"))
    } catch {
      return { disabled: [] }
    }
  }

  async writeState(state) {
    await mkdir(dirname(this.statePath), { recursive: true })
    await writeFile(this.statePath, JSON.stringify(state, null, 2), "utf8")
  }

  stateKey(scope, id) {
    return `${scope}:${id}`
  }

  async readSkill(skillRoot, scope, state) {
    const skillFile = await findSkillFile(skillRoot)
    if (!skillFile) throw new Error("缺少 SKILL.md 或 skill.md")
    const content = await readFile(skillFile, "utf8")
    const id = basename(skillRoot)
    const parsed = parseSkillMetadata(content, id)
    return {
      id,
      name: parsed.name || id,
      description: parsed.description || "无描述",
        requiresShop: parsed.requiresShop === true,
      scope,
      path: skillRoot,
      file: skillFile,
      version: await readInstalledVersion(skillRoot),
      enabled: !state.disabled.includes(this.stateKey(scope, id)) && !parsed.disabled,
    }
  }

  async list({ workspace } = {}) {
    const state = await this.readState()
    const locations = [
      { scope: "global", path: this.getDirectory("global") },
      ...(workspace ? [{ scope: "workspace", path: this.getDirectory("workspace", workspace) }] : []),
    ]
    const skills = []
    for (const location of locations) {
      if (!await pathExists(location.path)) continue
      const entries = await readdir(location.path, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const skillRoot = join(location.path, entry.name)
        if (!await findSkillFile(skillRoot)) continue
        const createdAt = await skillCreatedAt(skillRoot)
        try {
          skills.push({ ...(await this.readSkill(skillRoot, location.scope, state)), createdAt })
        } catch (cause) {
          skills.push({
            id: entry.name,
            name: entry.name,
            description: `无法解析：${cause.message}`,
            scope: location.scope,
            path: skillRoot,
            enabled: false,
            invalid: true,
            createdAt,
          })
        }
      }
    }
    return skills.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || a.name.localeCompare(b.name))
  }

  /** 读取用户选中的 .md 或 .zip，返回技能名称和描述，不写入工作区 */
  async previewFile({ filePath, filename, contentBase64 } = {}) {
    let target = String(filePath || "").trim()
    let ownedDirectory = null
    if (!target && contentBase64) {
      ownedDirectory = await mkdtemp(join(tmpdir(), "localflow-skill-upload-"))
      target = join(ownedDirectory, basename(String(filename || "skill.zip")))
      await writeFile(target, Buffer.from(String(contentBase64), "base64"))
    }
    if (!target) throw new Error("请选择技能文件")
    const lower = target.toLowerCase()
    let content = ""
    let fallbackName = basename(target, extname(target))
    let temporaryRoot = null
    try {
      const info = await stat(target)
      if (!info.isFile()) throw new Error("请选择技能文件")
      if (lower.endsWith(".md")) {
        content = await readFile(target, "utf8")
      } else if (lower.endsWith(".zip")) {
        temporaryRoot = await mkdtemp(join(tmpdir(), "localflow-skill-preview-"))
        await extract(target, { dir: resolve(temporaryRoot) })
        const candidates = await findSkillRoots(temporaryRoot)
        if (!candidates.length) throw new Error("所选内容中没有找到 SKILL.md")
        const skillFile = await findSkillFile(candidates[0])
        content = await readFile(skillFile, "utf8")
        fallbackName = basename(candidates[0])
      } else {
        throw new Error("请选择 .zip 技能包或 .md 技能文件")
      }
      const parsed = parseSkillMetadata(content, fallbackName)
      return {
        name: String(parsed.name || fallbackName || "").trim(),
        description: String(parsed.description || "").trim(),
      }
    } finally {
      if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true })
      if (ownedDirectory) await rm(ownedDirectory, { recursive: true, force: true })
    }
  }

  async pickAndInstall({ kind, scope, workspace }) {
    const selection = kind === "zip"
      ? await dialog.showOpenDialog({
          title: "选择 Skill ZIP",
          properties: ["openFile"],
          filters: [{ name: "ZIP 压缩包", extensions: ["zip"] }],
        })
      : await dialog.showOpenDialog({
          title: "选择包含 SKILL.md 的文件夹",
          properties: ["openDirectory"],
        })
    if (selection.canceled || !selection.filePaths[0]) return { canceled: true }

    let sourceRoot = selection.filePaths[0]
    let temporaryRoot = null
    try {
      if (kind === "zip") {
        temporaryRoot = await mkdtemp(join(tmpdir(), "localflow-skill-"))
        await extract(sourceRoot, { dir: resolve(temporaryRoot) })
        sourceRoot = temporaryRoot
      }
      const candidates = await findSkillRoots(sourceRoot)
      if (!candidates.length) throw new Error("所选内容中没有找到 SKILL.md")

      const destinationRoot = this.getDirectory(scope, workspace)
      await mkdir(destinationRoot, { recursive: true })
      const installed = []
      for (const candidate of candidates) {
        const skillFile = await findSkillFile(candidate)
        const content = await readFile(skillFile, "utf8")
        const parsed = parseSkillMetadata(content, basename(candidate))
        const nameId = normalizeSkillId(parsed.name)
        const id = nameId === "local-skill" ? normalizeSkillId(basename(candidate)) : nameId
        const destination = join(destinationRoot, id)
        if (await pathExists(destination)) {
          throw new Error(`Skill “${parsed.name || id}” 已存在，请先卸载旧版本`)
        }
        await cp(candidate, destination, { recursive: true, errorOnExist: true })
        installed.push({ id, name: parsed.name || id })
      }
      return { canceled: false, installed }
    } finally {
      if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true })
    }
  }

  async installBundled({ id, scope = "workspace", workspace }) {
    const appRoot = process.env.TRIDENT_APP_ROOT || app.getAppPath()
    const source = app.isPackaged && !process.env.TRIDENT_APP_ROOT
      ? join(process.resourcesPath, "skills", id)
      : join(appRoot, "src", "skills", id)
    if (!await pathExists(join(source, "SKILL.md"))) throw new Error(`内置技能不存在：${id}`)
    const destinationRoot = this.getDirectory(scope, workspace)
    await mkdir(destinationRoot, { recursive: true })
    const destination = join(destinationRoot, normalizeSkillId(id))
    if (await pathExists(destination)) return { canceled: false, installed: [{ id, alreadyInstalled: true }] }
    await cp(source, destination, { recursive: true, errorOnExist: true })
    return { canceled: false, installed: [{ id, scope, path: destination }] }
  }

  async installRemote({ url, id, scope = "workspace", workspace, fileMd5, replace = false }) {
    const address = new URL(url)
    const local = ['127.0.0.1','localhost','[::1]'].includes(address.hostname) && address.pathname.startsWith('/api/ai/skills/files/')
    if (address.protocol !== 'https:' && !(local && address.protocol === 'http:')) throw new Error('技能下载地址必须使用 HTTPS')
    const response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(60000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
        Accept: "application/zip,application/octet-stream,*/*",
      },
    })
    if (!response.ok) throw new Error(`技能下载失败：HTTP ${response.status}`)
    const chunks = []; let length = 0
    for await (const chunk of response.body) {
      length += chunk.length
      if (length > 50 * 1024 * 1024) throw new Error('技能包不能超过 50 MB')
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    if (fileMd5 && createHash("md5").update(buffer).digest("hex") !== fileMd5.toLowerCase()) throw new Error("技能包校验失败")
    const temporaryRoot = await mkdtemp(join(tmpdir(), "localflow-remote-skill-"))
    const archive = join(temporaryRoot, "skill.zip")
    await writeFile(archive, buffer)
    try {
      const extracted = join(temporaryRoot, "extracted")
      await mkdir(extracted, { recursive: true })
      await extract(archive, { dir: extracted })
      const candidates = await findSkillRoots(extracted)
      if (!candidates.length) throw new Error("技能包中没有找到 SKILL.md")
      const destinationRoot = this.getDirectory(scope, workspace)
      await mkdir(destinationRoot, { recursive: true })
      const installed = []
      for (const candidate of candidates) {
        const skillFile = await findSkillFile(candidate)
        const content = await readFile(skillFile, "utf8")
        const parsed = parseSkillMetadata(content, basename(candidate))
        const nameId = normalizeSkillId(parsed.name)
        const skillId = nameId === "local-skill" ? normalizeSkillId(id || basename(candidate)) : nameId
        const destination = join(destinationRoot, skillId)
        if (await pathExists(destination)) {
          if (!replace) continue
          await rm(destination, { recursive: true, force: true })
        }
        await cp(candidate, destination, { recursive: true, errorOnExist: true })
        installed.push({ id: skillId, name: parsed.name || skillId, path: destination })
      }
      return { canceled: false, installed }
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true })
    }
  }

  async create({ scope = "workspace", workspace, ...draft }) {
    const destinationRoot = this.getDirectory(scope, workspace)
    await mkdir(destinationRoot, { recursive: true })
    const preferredId = normalizeSkillId(draft.name)
    const id = preferredId === "local-skill" ? `localflow-skill-${randomBytes(3).toString("hex")}` : preferredId
    const destination = join(destinationRoot, id)
    if (await pathExists(destination)) throw new Error(`Skill “${draft.name}” 已存在，请修改名称后重试`)
    const content = buildSkillMarkdown(draft)
    await mkdir(destination)
    await writeFile(join(destination, "SKILL.md"), content, "utf8")
    return { id, name: String(draft.name).trim(), scope, path: destination }
  }

  resolveSkillRoot({ id, scope, workspace }) {
    const root = resolve(this.getDirectory(scope, workspace))
    const target = resolve(root, id)
    if (dirname(target) !== root) throw new Error("无效的 Skill 路径")
    return target
  }

  async get({ id, scope, workspace, includeFiles = false }) {
    const target = this.resolveSkillRoot({ id, scope, workspace })
    const file = await findSkillFile(target)
    if (!file) throw new Error("Skill 不存在")
    const content = await readFile(file, "utf8")
    const parsed = parseSkillMetadata(content, id)
    const skill = { id, scope, name: parsed.name || id, description: parsed.description || "", content, file }
    if (includeFiles) skill.files = await listSkillFiles(target)
    return skill
  }

  async update({ id, scope, workspace, name, description, content }) {
    const skill = await this.get({ id, scope, workspace })
    const updated = updateSkillMarkdown({ name, description, content })
    await writeFile(skill.file, updated, "utf8")
    return { id, scope, name: String(name).trim(), description: String(description).trim(), path: dirname(skill.file) }
  }

  async toggle({ id, scope, enabled }) {
    const state = await this.readState()
    const key = this.stateKey(scope, id)
    const disabled = new Set(state.disabled)
    if (enabled) disabled.delete(key)
    else disabled.add(key)
    await this.writeState({ ...state, disabled: [...disabled] })
    return true
  }

  async uninstall({ id, scope, workspace }) {
    const target = this.resolveSkillRoot({ id, scope, workspace })
    if (!await findSkillFile(target)) throw new Error("Skill 不存在")
    await rm(target, { recursive: true, force: true })
    const state = await this.readState()
    const key = this.stateKey(scope, id)
    await this.writeState({ ...state, disabled: state.disabled.filter((item) => item !== key) })
    return true
  }

  async enabledNames(workspace) {
    const skills = await this.list({ workspace })
    return skills.filter((skill) => skill.enabled && !skill.invalid).map((skill) => skill.name)
  }
}
