export function normalizeTaskShops(shops) {
  const unique = new Map();
  for (const shop of Array.isArray(shops) ? shops : []) {
    const id = String(shop?.id ?? '').trim();
    if (!id) continue;
    unique.set(id, { id, name: String(shop.name || id), platform: String(shop.platform || ''), account: String(shop.account || '') });
  }
  return [...unique.values()];
}

export function taskShopContext(shops, results) {
  if (!shops.length) return '';
  const connections = shops.map(shop => {
    const result = results.find(item => String(item.mallId) === String(shop.id));
    if (result?.ok === false) throw new Error(`店铺「${shop.name}」连接失败：${result.message || result.error || '未返回失败原因'}`);
    if (!result?.ok || !result.isopen || !result.cdpUrl || String(result.browserId) !== String(shop.id)) {
      const reason = !result ? '未收到店铺打开结果' : !result.isopen ? '浏览器未报告打开成功' : !result.cdpUrl ? '未返回 CDP 地址' : String(result.browserId) !== String(shop.id) ? '浏览器 ID 与店铺不匹配' : '打开结果未确认成功';
      throw new Error(`店铺「${shop.name}」未返回有效且匹配的浏览器连接信息：${reason}`);
    }
    return { ...shop, ...result };
  });
  return `[任务关联店铺及连接信息]\n${JSON.stringify(connections, null, 2)}\n项目已打开或复用这些店铺。按 mallId/browserId 使用各自的连接，不串用实例，不调用 open_mall 或新启动浏览器。优先使用项目内置 browser_* 工具按技能步骤操作页面，最终用 browser_result 返回实际已验证结果；读取技能说明不等于执行成功。连接失败时报告具体错误，不声称完成。既有 Node.js 技能脚本可通过 browser_run_skill_script 执行，工具注入当前店铺连接。提交、修改、支付等操作失败不得自动重试。`;
}

// Limit concurrency while preserving selected-shop order in the final report.
export function normalizeShopConcurrency(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 8 ? number : 2;
}

export function isUserStopError(cause) {
  if (cause?.cancelled === true) return true
  const message = String(cause?.message || cause || "").trim()
  return message === "任务已停止" || message === "用户拒绝了该操作" || message === "用户停止了任务"
}

export async function executeTaskForShops(shops, execute, concurrency = 2) {
  const targets = normalizeTaskShops(shops);
  if (!targets.length) {
    try {
      const output = await execute(null);
      if (output && typeof output === 'object' && output.status === 'cancelled') {
        return { status: 'cancelled', outcomes: [], output: output.output || '任务已停止。' };
      }
      return { status: 'success', output };
    } catch (cause) {
      if (!isUserStopError(cause)) throw cause;
      return { status: 'cancelled', outcomes: [], output: cause.output || '任务已停止。' };
    }
  }
  const sections = new Array(targets.length);
  const outcomes = new Array(targets.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < targets.length) {
    const index = nextIndex++;
    const shop = targets[index];
    try {
      const result = await execute(shop);
      const output = typeof result === 'object' && result !== null ? result.output : result;
      outcomes[index] = { shopId: shop.id, status: result?.status || 'success', error: result?.error || '' };
      const label = { success: '已完成', error: '失败', unverified: '未确认', cancelled: '已停止' }[outcomes[index].status] || '未确认';
      sections[index] = `## 店铺：${shop.name}（ID：${shop.id}）\n\n状态：${label}\n\n${output || '任务已执行，但未返回文本结果。'}${outcomes[index].error ? `\n\n${outcomes[index].error}` : ''}`;
    } catch (cause) {
      if (isUserStopError(cause)) {
        outcomes[index] = { shopId: shop.id, status: 'cancelled', error: '' };
        sections[index] = `## 店铺：${shop.name}（ID：${shop.id}）\n\n状态：已停止\n\n${cause.output || '任务已停止。'}`;
      } else {
        outcomes[index] = { shopId: shop.id, status: 'error', error: cause.message || String(cause) };
        sections[index] = `## 店铺：${shop.name}（ID：${shop.id}）\n\n执行失败：${cause.message || String(cause)}`;
      }
    }
  }
  };
  await Promise.all(Array.from({ length: Math.min(normalizeShopConcurrency(concurrency), targets.length) }, worker));
  const succeeded = outcomes.filter(item => item.status === 'success').length;
  const cancelled = outcomes.filter(item => item.status === 'cancelled').length;
  const errored = outcomes.some(item => item.status === 'error');
  const status = succeeded === targets.length
    ? 'success'
    : succeeded > 0
      ? 'partial'
      : cancelled === targets.length
        ? 'cancelled'
        : errored
          ? 'error'
          : cancelled > 0
            ? 'cancelled'
            : 'unverified';
  return { status, outcomes, output: sections.join('\n\n') };
}
