// Match the UI's workspace identity: Windows is case insensitive, POSIX is not.
export function taskInWorkspace(task, workspace) {
  const key = value => {
    const path = String(value || '').trim().replace(/\\/g, '/').replace(/\/+$/, '')
    return /^[a-z]:/i.test(path) || path.startsWith('//') ? path.toLowerCase() : path
  }
  const current = key(workspace)
  return Boolean(current) && key(task?.workspace) === current
}
