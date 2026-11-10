/** Diagnostics cross Electron IPC; nested Vue proxies must become plain JSON first. */
export function toPlainDiagnosticData(value: Record<string, unknown>): Record<string, unknown> {
  const ancestors: object[] = [];
  return JSON.parse(
    JSON.stringify(value, function (this: unknown, _key, item) {
      if (typeof item === "bigint") return item.toString();
      if (item instanceof Error) return item.message;
      if (typeof item === "object" && item !== null) {
        while (ancestors.length && ancestors.at(-1) !== this) ancestors.pop();
        if (ancestors.includes(item)) return "[Circular]";
        ancestors.push(item);
      }
      return item;
    })
  );
}
