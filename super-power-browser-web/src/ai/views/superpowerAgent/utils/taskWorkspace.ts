// Windows workspace paths are case insensitive; keep POSIX paths case sensitive.
export function workspaceKey(value?: string): string {
  const path = (value || "").trim().replace(/\\/g, "/").replace(/\/+$/, "");
  return /^[a-z]:/i.test(path) || path.startsWith("//") ? path.toLowerCase() : path;
}

export function sameWorkspace(left?: string, right?: string): boolean {
  return workspaceKey(left) === workspaceKey(right);
}
