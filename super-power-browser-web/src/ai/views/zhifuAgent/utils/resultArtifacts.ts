export function toolResultFiles(output: unknown): string[] {
  if (typeof output === "string") {
    try {
      return toolResultFiles(JSON.parse(output));
    } catch {
      return [];
    }
  }
  if (Array.isArray(output)) return output.flatMap(toolResultFiles);
  if (!output || typeof output !== "object") return [];
  const value = output as Record<string, any>;
  if (value.ok === false || value.success === false || value.isError || value.error) return [];
  if (value.success === true && typeof value.query === "string") {
    return /^(?:[A-Za-z]:[\\/]|\/)[^\r\n]+\.(?:xlsx?|csv|pdf|docx|txt|png|jpe?g|webp|gif)$/i.test(
      value.query
    )
      ? [value.query]
      : [];
  }
  if (value.ok === true) {
    return [value.result?.path, ...(Array.isArray(value.files) ? value.files : [])].filter(
      (path): path is string => typeof path === "string" && /^(?:[A-Za-z]:[\\/]|\/)/.test(path)
    );
  }
  return toolResultFiles(value.text ?? value.content ?? value.output);
}

/** Only successful structured tool results establish a file; prose is never proof. */
export function confirmedResultFiles(
  tools: { status: string; name: string; output?: unknown }[]
): string[] {
  const hasSummary = tools.some(
    (tool) =>
      tool.name === "export_shop_summary" &&
      tool.status === "done" &&
      toolResultFiles(tool.output).length > 0
  );
  return [
    ...new Set(
      tools
        .filter(
          (tool) =>
            tool.status === "done" &&
            [
              "export_shop_summary",
              "browser_export_excel",
              "browser_screenshot",
              "browser_result",
              "read_files",
            ].includes(tool.name)
        )
        .sort(
          (a, b) =>
            Number(b.name === "export_shop_summary") - Number(a.name === "export_shop_summary")
        )
        .flatMap((tool) =>
          toolResultFiles(tool.output).filter(
            (path) =>
              !hasSummary || tool.name === "export_shop_summary" || !/\.(xlsx?|csv)$/i.test(path)
          )
        )
    ),
  ];
}

export function renderConfirmedFileLinks(html: string, paths: string[]): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("a[data-result-file]").forEach((link) => {
    const path = link.getAttribute("data-result-file") || "";
    if (paths.includes(path)) link.replaceWith("见下方文件");
    else {
      const text = doc.createElement("code");
      text.textContent = path;
      link.replaceWith(text);
    }
  });
  doc.querySelectorAll("a").forEach((link) => {
    if (paths.some((path) => link.textContent?.includes(path))) link.replaceWith("见下方文件");
  });
  return doc.body.innerHTML;
}
export function resultFileName(path: string): string {
  return (path.split(/[\\/]/).pop() || path).replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
    ""
  );
}

export function resultFileDetails(output: unknown, path: string): string[] {
  if (typeof output === "string") {
    try {
      return resultFileDetails(JSON.parse(output), path);
    } catch {
      return [];
    }
  }
  if (Array.isArray(output)) return output.flatMap((value) => resultFileDetails(value, path));
  if (!output || typeof output !== "object") return [];
  const value = output as Record<string, any>;
  if (value.ok === false || value.isError) return [];
  if (value.ok === true && value.result?.path === path) {
    const { rowCount, bytes } = value.result;
    return [
      Number.isInteger(rowCount) && rowCount >= 0 ? `${rowCount} 行` : "",
      typeof bytes === "number" && Number.isFinite(bytes) && bytes >= 0
        ? bytes < 1024
          ? `${bytes} B`
          : bytes < 1048576
            ? `${(bytes / 1024).toFixed(1)} KB`
            : `${(bytes / 1048576).toFixed(1)} MB`
        : "",
    ].filter(Boolean);
  }
  return resultFileDetails(value.text ?? value.content ?? value.output, path);
}

/** Keep each verified image with its shop; leave shared artifacts after all shops. */
export function groupShopArtifacts(html: string, files: string[]) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const sections: { id: string; html: string; files: string[] }[] = [];
  let current: { id: string; html: string; files: string[] } | undefined;
  let summary = "";
  for (const node of Array.from(doc.body.childNodes)) {
    const element = node as Element;
    const title = /^H[12]$/.test(element.tagName || "") ? element.textContent || "" : "";
    const match = /店铺[：:].*?ID[：:]\s*([^）)\s]+)/i.exec(title);
    if (match && current?.id !== match[1]) {
      current = { id: match[1], html: "", files: [] };
      sections.push(current);
    }
    if (/^所有店铺操作汇总/.test(title)) current = undefined;
    const text = element.outerHTML ?? node.textContent ?? "";
    if (current) current.html += text;
    else summary += text;
  }
  if (!sections.length) return { sections: [], tail: html, remaining: files };
  const remaining = files.filter((path) => {
    const normalized = path.replace(/\\/g, "/");
    const section = sections.find((item) => normalized.includes("_" + item.id + "/"));
    if (!section) return true;
    section.files.push(path);
    return false;
  });
  return { sections, tail: summary, remaining };
}
