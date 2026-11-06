export function toolObject(output) {
  if (typeof output === 'string') { try { return toolObject(JSON.parse(output)) } catch { return null } }
  if (Array.isArray(output)) return output.map(toolObject).find(Boolean) || null
  if (!output || typeof output !== 'object') return null
  if (typeof output.ok === 'boolean') return output
  return toolObject(output.text ?? output.content ?? output.output)
}

// Only shortcut a narrowly defined search-to-file request, never an arbitrary skill.
export function canDeliverDirectly(input) {
  const prompt = input.shopPrompt || input.prompt || ''
  return input.shops?.length === 1 && !input.skillNames?.length && !input.images?.length && !input.files?.length &&
    /搜索|search/i.test(prompt) && /excel|xlsx/i.test(prompt) && /第一条|first result/i.test(prompt) &&
    !/分析|对比|比较|总结|截图|发送|邮件|多个|分别|然后|之后|analy[sz]|compare|summary|screenshot|email|then/i.test(prompt)
}

export function directDelivery(output, events, mallId) {
  const final = toolObject(output)
  if (!final?.ok || String(final.mallId) !== String(mallId) || !final.readId || !final.shopExecutionResult?.ok) return null
  const exports = events.filter(event => event.toolName === 'browser_export_excel').map(event => toolObject(event.output)).filter(value =>
    value?.ok && String(value.mallId) === String(mallId) && value.result?.verified && value.result.readId === final.readId && final.files?.includes(value.result.path))
  if (!exports.length) return null
  const files = [...new Map(exports.map(value => [value.result.path, value.result])).values()]
  return `已完成，结果文件已生成并回读校验。\n\n${final.shopExecutionResult.result}\n\n${files.map(file => `- ${file.rowCount} 行 × ${file.columnCount} 列：\`${file.path}\``).join('\n')}`
}
