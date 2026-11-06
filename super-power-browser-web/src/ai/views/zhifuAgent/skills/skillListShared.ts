import {
  bindSkillStore,
  getSkillStoreClassifyList,
  getSkillStoreSubClassifyList,
  reportSkillDownload,
  SKILL_PLATFORM_PARENT_ID,
  unbindSkillStore,
  type SkillStoreClassifyItem,
  type SkillStoreItem,
} from "@/ai/api/zhifuAgent";
import { skillIdentity } from "@/ai/store/modules/zhifu-agent.store";
import { zhifuInstallRemoteSkill } from "@/ai/utils/electronApi";

export const SKILL_PAGE_SIZE = 20;

export function pickList<T>(res: any): T[] {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  return [];
}

export function readSkillPage(res: any, pageNo: number, pageSize = SKILL_PAGE_SIZE) {
  const data = res?.data;
  const list: SkillStoreItem[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.list)
      ? data.list
      : [];
  const total = Number(data?.total ?? data?.count ?? res?.total);
  const hasNext = Number.isFinite(total) ? pageNo * pageSize < total : list.length >= pageSize;
  return { list, hasNext };
}

export function skillPackageUrl(source: Partial<SkillStoreItem> | null | undefined) {
  const record = source as Record<string, unknown> | null | undefined;
  for (const key of [
    "file_url",
    "skills_url",
    "skillsUrl",
    "fileUrl",
    "download_url",
    "url",
    "filename",
  ]) {
    const url = String(record?.[key] || "").trim();
    if (/^https:\/\//i.test(url) || /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/api\/ai\/skills\/files\//i.test(url)) return url;
  }
  return "";
}

export function toClassifyItems(res: any): SkillStoreClassifyItem[] {
  return pickList<any>(res).flatMap((item) => {
    const id = Number(item?.id ?? item?.category_id ?? item?.categories_id);
    const name = String(item?.title ?? item?.name ?? item?.category_name ?? "").trim();
    return id > 0 && name ? [{ id, name }] : [];
  });
}

/** 场景和平台分类。商店筛选用，上传弹窗打开时再取 */
export async function loadSkillClassifyOptions() {
  const [categoryRes, platformRes] = await Promise.all([
    getSkillStoreClassifyList({ page: 1, limit: 100 }).catch(() => null),
    getSkillStoreSubClassifyList({
      parent_id: SKILL_PLATFORM_PARENT_ID,
      page: 1,
      limit: 100,
    }).catch(() => null),
  ]);
  return {
    categories: categoryRes ? toClassifyItems(categoryRes) : [],
    platforms: platformRes ? toClassifyItems(platformRes) : [],
  };
}

/** 把 v1.2.0 这类版本拆成数字。无法识别时返回空 */
function parseSkillVersion(value?: string) {
  const text = String(value || "")
    .trim()
    .replace(/^[vV]/, "");
  if (!text) return null;
  const parts = text.split(".").map((part) => {
    const matched = part.match(/^\d+/);
    return matched ? Number(matched[0]) : NaN;
  });
  if (!parts.length || parts.some((part) => Number.isNaN(part))) return null;
  return parts;
}

/** 接口版本高于本地已安装版本时才需要更新 */
export function skillNeedsUpdate(remoteVersion?: string, localVersion?: string) {
  const remote = parseSkillVersion(remoteVersion);
  const local = parseSkillVersion(localVersion);
  if (!remote || !local) return false;
  const length = Math.max(remote.length, local.length);
  for (let index = 0; index < length; index += 1) {
    const left = remote[index] ?? 0;
    const right = local[index] ?? 0;
    if (left !== right) return left > right;
  }
  return false;
}

export function findInstalledSkill<T extends { scope: string; name: string }>(
  localSkills: T[],
  name: string
) {
  const identity = skillIdentity(name);
  return localSkills.find(
    (item) => item.scope === "workspace" && skillIdentity(item.name) === identity
  );
}

/** 打开当前聊天，并把工作区里已安装的技能放进输入框 */
export function useInstalledSkillInChat(
  store: {
    localSkills: { id: string; name: string; scope: string }[];
    pendingSkill: { id: string | number; name: string; scope: string } | null;
    openPage: (page: "chat") => void;
  },
  name: string
) {
  const installed = findInstalledSkill(store.localSkills, name);
  if (!installed) return;
  store.pendingSkill = {
    id: installed.id,
    name: installed.name,
    scope: "workspace",
  };
  store.openPage("chat");
}

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function openSkillShare(
  dialog: { openByStoreId: (id: number, name: string) => Promise<unknown> } | undefined,
  skill: Pick<SkillStoreItem, "id" | "name">,
  sharingId: { value: number | null }
) {
  if (sharingId.value) return;
  sharingId.value = skill.id;
  try {
    await dialog?.openByStoreId(skill.id, skill.name);
  } finally {
    sharingId.value = null;
  }
}

/** 绑定商店技能并安装到当前工作区。安装失败会解绑 */
export async function installListedSkill(options: {
  skill: SkillStoreItem;
  getWorkspace: () => string;
  selectWorkspace: () => Promise<unknown>;
  onSelectError: (cause: unknown) => void;
  freshPackageUrl: (skill: SkillStoreItem) => Promise<string>;
  loadSkills: () => Promise<unknown>;
  reload: () => Promise<unknown>;
  onError: (message: string) => void;
  missingUrlMessage: string;
  /** 覆盖工作区里已经安装的同名技能 */
  replace?: boolean;
}): Promise<boolean> {
  const { skill } = options;
  let workspace = options.getWorkspace();
  if (!workspace) {
    try {
      await options.selectWorkspace();
    } catch (cause) {
      options.onSelectError(cause);
    }
    workspace = options.getWorkspace();
    if (!workspace) return false;
  }
  const bound: any = await bindSkillStore(skill.id);
  const url =
    skillPackageUrl(bound?.data) ||
    (await options.freshPackageUrl(skill)) ||
    skillPackageUrl(skill);
  if (!url) {
    await unbindSkillStore(skill.id).catch(() => {});
    options.onError(options.missingUrlMessage);
    return false;
  }
  try {
    await zhifuInstallRemoteSkill({
      url,
      id: skill.id,
      fileMd5: skill.file_md5 || bound?.data?.file_md5,
      scope: "workspace",
      workspace,
      replace: options.replace,
    });
  } catch (cause) {
    await unbindSkillStore(skill.id).catch(() => {});
    throw cause;
  }
  await reportSkillDownload(skill.id).catch(() => {});
  await Promise.all([options.loadSkills(), options.reload()]);
  return true;
}
