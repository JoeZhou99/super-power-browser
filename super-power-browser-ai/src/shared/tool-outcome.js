// Inspect actual tool results, never the assistant's final prose.
function outputText(output) {
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) return output.map(outputText).join('\n');
  if (output && typeof output === 'object') return outputText(output.result ?? output.text ?? output.content ?? output.stdout ?? '');
  return '';
}

function executionEvidence(output, mallId) {
  const direct = output?.shopExecutionResult;
  const candidates = direct ? [direct] : [];
  for (const line of outputText(output).split(/\r?\n/)) {
    try { candidates.push(JSON.parse(line).shopExecutionResult); } catch {}
  }
  return candidates.filter(item => item && String(item.mallId) === String(mallId) && typeof item.ok === 'boolean' && (item.ok ? Boolean(item.result) : Boolean(item.error))).at(-1);
}

export function toolFailure(event) {
  const output = event.output;
  if (event.error) return String(event.error.message || event.error);
  if (output && typeof output === 'object') {
    if (output.isError || output.ok === false || output.success === false) return String(output.error?.message || output.error || output.message || '工具返回失败');
    if (typeof output.exitCode === 'number' && output.exitCode !== 0) return `工具退出码 ${output.exitCode}`;
  }
  const text = outputText(output);
  const exit = text.match(/\[Command exited with code (-?\d+)\]/);
  if (exit && Number(exit[1]) !== 0) return `工具退出码 ${exit[1]}`;
  if (/ECONNREFUSED|无法连接到远程服务器|connect ECONNRESET|Connection refused/i.test(text)) return '工具实际连接浏览器失败';
  return '';
}

export function shopExecutionOutcome(events, mallId) {
  const executions = events.filter(event => event.kind === 'tool-end' && !['skills', 'read_file', 'read_files', 'list_files', 'search_files'].includes(event.toolName));
  const evidenceIndex = executions.findLastIndex(event => executionEvidence(event.output, mallId));
  const finalEvidenceEvent = executions[evidenceIndex];
  if (finalEvidenceEvent) {
    const evidence = executionEvidence(finalEvidenceEvent.output, mallId);
    const failure = executions.slice(evidenceIndex).map(toolFailure).filter(Boolean).join('；');
    return evidence.ok && !failure ? { status: 'success', error: '' } : { status: 'error', error: failure || evidence.error };
  }
  const errors = executions.map(toolFailure).filter(Boolean);
  if (errors.length) return { status: 'error', error: errors.join('；') };
  return { status: 'unverified', error: '未收到与当前店铺匹配的结构化操作结果，无法确认任务完成' };
}
