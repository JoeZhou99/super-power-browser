/** Only expose permissions whose prerequisites are also assignable for this member type. */
export function permissionGroupsForType(groups, memberType) {
  const allowed = new Map(groups.flatMap(group => group.children)
    .filter(node => node.minMemberType <= memberType).map(node => [node.code, node]));
  let changed;
  do {
    changed = false;
    for (const [code, node] of allowed) {
      if (node.dependencies.some(dependency => !allowed.has(dependency))) {
        allowed.delete(code);
        changed = true;
      }
    }
  } while (changed);
  return groups.map(group => ({ ...group, children: group.children.filter(node => allowed.has(node.code)) }))
    .filter(group => group.children.length);
}

export function normalizePermissions(groups, memberType, selected) {
  const nodes = permissionGroupsForType(groups, memberType).flatMap(group => group.children);
  const index = new Map(nodes.map(node => [node.code, node]));
  const result = new Set();
  const add = code => {
    if (!index.has(code) || result.has(code)) return;
    result.add(code);
    index.get(code).dependencies.forEach(add);
  };
  selected.forEach(add);
  return nodes.filter(node => result.has(node.code)).map(node => node.code);
}

export function changePermissions(groups, memberType, current, codes, checked) {
  if (checked) return normalizePermissions(groups, memberType, [...current, ...codes]);
  const nodes = permissionGroupsForType(groups, memberType).flatMap(group => group.children);
  const selected = new Set(normalizePermissions(groups, memberType, current));
  codes.forEach(code => selected.delete(code));
  let changed;
  do {
    changed = false;
    for (const node of nodes) {
      if (selected.has(node.code) && node.dependencies.some(code => !selected.has(code))) {
        selected.delete(node.code);
        changed = true;
      }
    }
  } while (changed);
  return nodes.filter(node => selected.has(node.code)).map(node => node.code);
}
