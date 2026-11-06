/** 去掉 Electron 远程调用包装，只保留最后一段 Error: 后的说明。 */
function readableError(value: string) {
  let text = value.trim();
  for (let i = 0; i < 4; i += 1) {
    const next = text
      .replace(/^Error:\s*/i, "")
      .replace(/^Error invoking remote method ['"][^'"]*['"]:\s*/i, "")
      .trim();
    if (next === text) break;
    text = next;
  }
  return text;
}

/** 对话里拒绝审批是用户主动停止，不按任务失败处理。 */
export function isApprovalDenied(cause: unknown) {
  const raw = readableError(
    cause instanceof Error
      ? cause.message
      : typeof cause === "string"
        ? cause
        : String((cause as { message?: string })?.message || cause || "")
  );
  return /用户拒绝了该操作/.test(raw);
}

/** Translate execution failures for users; keep the original tool output for diagnostics. */
export function userError(cause: unknown, fallback = ""): string {
  const raw = readableError(cause instanceof Error ? cause.message : String(cause || fallback));
  if (isApprovalDenied(raw)) return "任务已停止。";
  if (
    /用户拒绝|user (?:denied|rejected)|app denied permission|permission denied by user/i.test(raw)
  )
    return "你未允许本次操作，任务暂时无法继续。如需继续，请重新发送任务，并在权限提示中允许相关操作。";
  if (/ECONNREFUSED|CDP.*(?:失败|failed)|browser.*disconnected/i.test(raw))
    return "暂时无法连接店铺浏览器，请确认店铺已正常打开后重试。";
  if (/ENOENT|no such file|file not found/i.test(raw))
    return "未找到需要的文件，文件可能已被移动或删除。请重新选择文件后再试。";
  if (/EACCES|EPERM|access denied|permission denied/i.test(raw))
    return "无法访问所需文件或目录，请检查访问权限，以及文件是否正被其他程序占用。";
  if (/401|invalid.api.key|unauthorized/i.test(raw))
    return "模型服务验证失败，请检查模型配置中的密钥是否正确、有效。";
  if (/429|rate.limit|too many requests/i.test(raw))
    return "模型服务请求过于频繁或额度不足，请稍后再试，并检查服务额度。";
  if (/timeout|timed out|ETIMEDOUT/i.test(raw))
    return "操作等待超时，请检查网络或店铺页面状态后重试。";
  if (/fetch failed|ENOTFOUND|ECONNRESET/i.test(raw))
    return "网络连接失败，请检查网络和服务地址后重试。";
  if (
    /tool call\(s\) failed|\{"(?:error|message)"\s*:|TypeError:|Cannot read properties|\bat .*\([^\n]+:\d+:\d+\)/i.test(
      raw
    )
  )
    return "部分操作未能完成，请检查所需文件、店铺状态和操作权限后重试。";
  return raw;
}
