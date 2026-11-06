export const FAST_BROWSER_WORKFLOW = `执行效率要求：
- 输入关键词后回车搜索可用 browser_fill(text, submitKey: "Enter") 一次完成；若已单独填写，先获取新 snapshot，再用新的 ref 按键。REF_EXPIRED 且 actionPerformed=false 表示该次按键/点击尚未执行，应刷新快照后继续，不是自动重试已执行的提交。
- 获取页面数据后，直接使用读取返回的 readId；不要为重新获取已有链接反复 snapshot/read。
- 导出 Excel 必须优先 browser_export_excel，直接传 readId（可选 linkIndices/tableIndex 或 headers、rows）；不检查 Excel COM、Python/Node 包，不临时编写导出脚本，不再用 Excel 打开验证。工具已生成真正的 xlsx 并回读校验。
- 导出成功后用 browser_result(readId, linkIndex 可选) 提交，不必填写 expectedUrl/expectedText，不要把结果链接误作当前页面 URL。
- 只做用户要求的操作，简洁报告结果与文件路径，减少逐步复述和无必要的环境检查。`

export function taskReasoningEffort(settings, { prompt = '', skillNames = [], shopResults = [] }) {
  const current = settings.reasoningEffort || undefined
  // Unknown aliases may map to providers that reject reasoning parameters.
  const model = settings.modelId || ''
  const knownModel = /^(?:gpt-5(?:\.\d+)?(?:-\d{4}-\d{2}-\d{2})?|o[134](?:-mini)?(?:-\d{4}-\d{2}-\d{2})?)$/i.test(model)
  const simpleExport = /(?:搜索|search)/i.test(prompt) && /(?:excel|xlsx|表格)/i.test(prompt)
  return current === 'medium' && knownModel && shopResults.length && !skillNames.length && simpleExport ? 'low' : current
}
