export interface TaskShop {
  id: string;
  name: string;
  platform: string;
  account: string;
  logo?: string;
}

/** 按店铺 ID 去重，丢掉没有 ID 的项，并补齐名称和平台字段 */
export function normalizeTaskShops(shops: unknown): TaskShop[] {
  const unique = new Map<string, TaskShop>();
  for (const shop of Array.isArray(shops) ? shops : []) {
    const id = String(shop?.id ?? "").trim();
    if (!id) continue;
    const next: TaskShop = {
      id,
      name: String(shop.name || id),
      platform: String(shop.platform || ""),
      account: String(shop.account || ""),
    };
    if (shop.logo) next.logo = String(shop.logo);
    unique.set(id, next);
  }
  return [...unique.values()];
}

/** 同时执行的店铺数，非法值回落到 2，合法范围 1 到 8 */
export function normalizeShopConcurrency(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 8 ? number : 2;
}

/** 单次任务超时分钟数，非法值回落到 10，合法范围 1 到 120 */
export function normalizeExecutionTimeout(value: unknown) {
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 120 ? minutes : 10;
}
