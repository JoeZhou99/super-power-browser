import { stat } from 'node:fs/promises'

const normalize = value => String(value || '').trim().toLocaleLowerCase()

export async function inspectTaskSkills(task, skillService, { checkDirectory = stat } = {}) {
  const workspace = String(task.workspace || '').trim()
  let workspaceState = 'missing'
  try { workspaceState = (await checkDirectory(workspace)).isDirectory() ? 'ready' : 'not-directory' }
  catch (cause) { workspaceState = cause.code === 'ENOENT' || !workspace ? 'missing' : 'unreadable' }
  const requested = Array.isArray(task.skillNames) ? task.skillNames : []
  let skills = []
  let scanError = ''
  if (workspaceState === 'ready') {
    try { skills = await skillService.list({ workspace }) }
    catch { scanError = '无法读取技能列表，请检查工作区与技能目录的访问权限。' }
  }
  const bindings = requested.map(name => {
    const matches = skills.filter(skill => [skill.id, skill.name].some(value => normalize(value) === normalize(name)))
    const usable = matches.find(skill => skill.enabled && !skill.invalid)
    const status = workspaceState !== 'ready' || scanError ? 'not-checked' : usable ? 'ready' : matches.some(skill => skill.invalid) ? 'invalid' : matches.length ? 'disabled' : 'missing'
    return { requested: name, status, matches: matches.map(({ id, name, scope, path, enabled, invalid }) => ({ id, name, scope, path, enabled, invalid: Boolean(invalid) })) }
  })
  let error = ''
  if (workspaceState !== 'ready') error = `定时任务的工作区${workspaceState === 'missing' ? '不存在' : workspaceState === 'not-directory' ? '不是文件夹' : '无法访问'}：${workspace || '未设置'}。请在任务设置中确认工作区并重新保存；不会自动改用其他工作区。`
  else if (scanError) error = scanError
  else {
    const labels = { missing: '未安装', disabled: '已禁用', invalid: '内容无效或无法读取' }
    const unavailable = bindings.filter(binding => binding.status !== 'ready')
    if (unavailable.length) error = `定时任务无法启动：${unavailable.map(binding => `技能“${binding.requested}”${labels[binding.status]}`).join('；')}。请在任务绑定的工作区“${workspace}”检查技能并重新保存任务。`
  }
  return {
    checkedAt: Date.now(), workspace, workspaceState, bindings, scanError, error,
    selectedSkills: bindings.filter(binding => binding.status === 'ready').map(binding => skills.find(skill => skill.enabled && !skill.invalid && [skill.id, skill.name].some(value => normalize(value) === normalize(binding.requested)))),
  }
}

export function taskDiagnosticSummary(task, preflight) {
  return {
    id: task.id, title: task.title, workspace: task.workspace, enabled: task.enabled,
    skillNames: task.skillNames || [], pushPlatforms: task.pushPlatforms || [],
    lastStatus: task.lastStatus, lastRunAt: task.lastRunAt, preflight,
    runs: (task.runs || []).slice(-3).map(({ startedAt, completedAt, runAt, status, result, diagnostics }) => ({ startedAt, completedAt, runAt, status, result, diagnostics })),
  }
}
