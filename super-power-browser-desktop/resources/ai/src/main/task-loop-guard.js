// Application-owned state lives on one active task, never on the SDK session.
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  return value
}

export function createTaskLoopHooks(getTask, reportError) {
  return {
    beforeTool({ toolCall, input }) {
      const task = getTask()
      if (!task || task.controller.signal.aborted) return { stop: true, reason: '任务已停止' }
      const signature = JSON.stringify([toolCall.toolName, canonical(input)])
      const state = task.loopGuard ||= { signature: '', count: 0 }
      state.count = state.signature === signature ? state.count + 1 : 1
      state.signature = signature
      if (state.count >= 5) {
        const reason = '本次任务连续重复执行相同操作，已停止以避免循环。已保留当前结果，请检查任务要求后重新发送。'
        task.executionError = reason
        reportError(reason)
        return { stop: true, reason }
      }
      if (state.count === 3) return { appendContext: '本次任务已连续多次调用相同工具和参数。请依据已有结果直接作答；只有确有必要时才继续调用，不要无意义地重复操作。' }
    },
  }
}
