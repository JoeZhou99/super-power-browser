/** 去掉思考标记。未写完的标签连同其后内容一起隐藏，避免流式过程中露出推理 */
export const stripThinkingMarkup = (value: unknown) =>
  String(value || "")
    .replace(/<thinking\b[^>]*>[\s\S]*?(?:<\/thinking\s*>|$)/gi, "")
    .replace(/<\/thinking\s*>/gi, "")
    .replace(/<\/?(?:t|th|thi|thin|think|thinki|thinkin|thinking)\s*$/i, "");

/** 合并流式片段：累计文本覆盖，重复短语不再追加 */
export const mergeStreamText = (currentValue: unknown, nextValue: unknown) => {
  const current = String(currentValue || "");
  const next = String(nextValue || "");
  if (!next || current === next) return current || next;
  if (next.length > current.length && next.startsWith(current)) return next;
  const normalizedNext = next.trim();
  if (normalizedNext.length >= 4 && current.trimEnd().endsWith(normalizedNext)) return current;
  return current + next;
};

/** 把整段被重复粘贴的回复收成一份 */
export const collapseRepeatedText = (value: unknown) => {
  const text = String(value || "").trim();
  const match = text.match(/^([\s\S]+?)(?:\s*\1){1,}$/);
  const repeated = match?.[1]?.trim() || "";
  return repeated.length >= 4 ? repeated : text;
};
