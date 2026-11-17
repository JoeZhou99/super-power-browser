// Hide provider reasoning markup while retaining the raw stream for chunk merging.
export const stripThinkingMarkup = (value) => String(value || "")
  .replace(/<thinking\b[^>]*>[\s\S]*?(?:<\/thinking\s*>|$)/gi, "")
  .replace(/<\/thinking\s*>/gi, "")
  .replace(/<\/?(?:t|th|thi|thin|think|thinki|thinkin|thinking)\s*$/i, "")

export const mergeStreamText = (currentValue, nextValue) => {
  const current = String(currentValue || "")
  const next = String(nextValue || "")
  if (!next || current === next) return current || next
  if (next.length > current.length && next.startsWith(current)) return next
  const normalizedNext = next.trim()
  // Some providers emit the same completed sentence several times with
  // different surrounding whitespace. Keep very small token chunks appendable,
  // but treat a repeated phrase as cumulative output regardless of its length.
  if (normalizedNext.length >= 4 && current.trimEnd().endsWith(normalizedNext)) return current
  return current + next
}

export const collapseRepeatedText = (value) => {
  const text = String(value || "").trim()
  const match = text.match(/^([\s\S]+?)(?:\s*\1){1,}$/)
  return match?.[1].trim().length >= 4 ? match[1].trim() : text
}
