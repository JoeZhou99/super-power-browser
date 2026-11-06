import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/core";
import MarkdownIt from "markdown-it";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import powershell from "highlight.js/lib/languages/powershell";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import i18n from "@/ai/lang";
import { stripThinkingMarkup } from "./streamText";

export { stripThinkingMarkup };

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("powershell", powershell);
hljs.registerLanguage("python", python);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);

const LANGUAGE_NAMES: Record<string, string> = {
  bash: "Bash",
  sh: "Shell",
  shell: "Shell",
  css: "CSS",
  html: "HTML",
  xml: "XML",
  js: "JavaScript",
  javascript: "JavaScript",
  jsx: "JSX",
  json: "JSON",
  ps1: "PowerShell",
  powershell: "PowerShell",
  py: "Python",
  python: "Python",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
};

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  ps1: "powershell",
  sh: "bash",
  shell: "bash",
  html: "xml",
};

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char
  );

const SCHEDULED_RUN_PREFIX = /^\[(?:定时任务自动执行|Scheduled run)\]\s*/;

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

md.renderer.rules.code_inline = (tokens, index) => {
  const path = tokens[index].content;
  const escaped = md.utils.escapeHtml(path);
  if (/^(?:[A-Za-z]:[\\/]|\/).+\.(?:xlsx?|csv|pdf|docx|txt|png|jpg)$/i.test(path)) {
    const title = md.utils.escapeHtml(i18n.global.t("zhifuAgent.chat.openResultFile"));
    return `<a href="#" data-result-file="${escaped}" title="${title}">📄 ${escaped}</a>`;
  }
  return `<code>${escaped}</code>`;
};

md.renderer.rules.link_open = (tokens, index, options, _env, renderer) => {
  tokens[index].attrSet("target", "_blank");
  tokens[index].attrSet("rel", "noopener noreferrer");
  return renderer.renderToken(tokens, index, options);
};

md.renderer.rules.fence = (tokens, index) => {
  const token = tokens[index];
  const requested = token.info.trim().split(/\s+/)[0].toLowerCase();
  const language = LANGUAGE_ALIASES[requested] || requested;
  const highlighted =
    language && hljs.getLanguage(language)
      ? hljs.highlight(token.content, { language, ignoreIllegals: true }).value
      : md.utils.escapeHtml(token.content);
  const label =
    LANGUAGE_NAMES[requested] || requested || i18n.global.t("zhifuAgent.chat.plainText");
  const copyLabel = i18n.global.t("zhifuAgent.chat.copy");
  const copyTitle = i18n.global.t("zhifuAgent.chat.copyCode");
  return `<div class="code-block"><div class="code-toolbar"><span class="code-language"><span aria-hidden="true">&lt;/&gt;</span> ${escapeHtml(label)}</span><button type="button" class="code-copy" title="${escapeHtml(copyTitle)}"><span class="code-copy-icon" aria-hidden="true"></span><span class="code-copy-label">${escapeHtml(copyLabel)}</span></button></div><pre><code>${highlighted}</code></pre></div>`;
};

const PURIFY_OPTIONS = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["style", "link", "base", "meta"],
  ADD_ATTR: ["target", "rel", "title", "data-result-file"],
};

const markdownCache = new WeakMap<object, { content: string; role?: string; html: string }>();

interface ShopExecutionResult {
  ok: boolean;
  mallId: string | number;
  result: string;
  error?: string;
}

function resultHtml(result: ShopExecutionResult, raw: string) {
  const text = String(
    result.ok ? result.result || "" : result.error || result.result || "执行失败"
  );
  const [summary, ...verification] = text.split(/[；;]\s*验证[：:]/);
  const detail = verification.join("；验证：");
  const count = detail.match(/结果数量\s*[=:：]\s*(\d+)/)?.[1];
  const link = summary.match(/https?:\/\/[^\s|<>"；]+/);
  let url = "";
  if (link) {
    try {
      const parsed = new URL(link[0]);
      if (["http:", "https:"].includes(parsed.protocol)) url = parsed.href;
    } catch {
      url = "";
    }
  }
  const readable = url
    ? summary
        .replace(link?.[0] || "", "")
        .replace(/\s*\|\s*$/, "")
        .trim()
    : summary;
  return `<section class="shop-result-display"><p>${escapeHtml(readable)}</p>${count ? `<p class="shop-result-summary">找到 ${escapeHtml(count)} 条结果</p>` : ""}${url ? `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">查看结果 ↗</a></p>` : ""}<details class="shop-result-details"><summary>查看详情</summary><p>店铺 ID：${escapeHtml(result.mallId)}</p>${detail ? `<p>${escapeHtml(detail)}</p>` : ""}<pre><code>${escapeHtml(raw)}</code></pre></details></section>`;
}

/** 只格式化完整的店铺执行结果，普通回复和未写完的流式内容保持原样 */
export function renderShopResults(source: string, renderMarkdown: (_text: string) => string) {
  const pattern = /\{\s*"shopExecutionResult"\s*:/g;
  let output = "";
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    let depth = 0;
    let quoted = false;
    let escaped = false;
    let end = -1;
    for (let i = match.index; i < source.length; i += 1) {
      const char = source[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === "{") depth += 1;
      else if (char === "}" && --depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end < 0) break;
    const raw = source.slice(match.index, end);
    let result: ShopExecutionResult | undefined;
    try {
      result = JSON.parse(raw).shopExecutionResult;
    } catch {
      continue;
    }
    if (
      !result ||
      typeof result.ok !== "boolean" ||
      !result.mallId ||
      typeof result.result !== "string"
    ) {
      continue;
    }
    let before = source.slice(cursor, match.index);
    let after = end;
    if (/```(?:json)?\s*$/.test(before) && /^\s*```/.test(source.slice(end))) {
      before = before.replace(/```(?:json)?\s*$/, "");
      after += source.slice(end).match(/^\s*```/)?.[0].length || 0;
    }
    const heading = /(^|\n)## 店铺：([^\n]+?)（ID：([^）]+)）\s*\n\s*状态：([^\n]+)\s*$/;
    const section = before.match(heading);
    if (section && section[3].trim() === String(result.mallId)) {
      before = before.replace(
        heading,
        (_all, newline, name, _id, status) => `${newline}### ${name} · ${String(status).trim()}\n\n`
      );
    }
    output += renderMarkdown(before) + resultHtml(result, raw);
    cursor = after;
    pattern.lastIndex = after;
  }
  return output + renderMarkdown(source.slice(cursor));
}

/** 按消息对象缓存渲染结果，内容和角色都未变时不再重复解析 Markdown */
export function renderCachedAgentMarkdown(
  message: { role?: string; scheduledRunAt?: number },
  source: string
) {
  const content =
    message.role === "user" && message.scheduledRunAt
      ? (source || "").replace(SCHEDULED_RUN_PREFIX, "")
      : source || "";
  const cached = markdownCache.get(message);
  if (cached?.content === content && cached.role === message.role) return cached.html;
  const text = message.role === "assistant" ? stripThinkingMarkup(content) : content;
  const html = text.trim()
    ? message.role === "assistant"
      ? renderShopResults(text, renderAgentMarkdown)
      : renderAgentMarkdown(text)
    : "";
  markdownCache.set(message, { content, role: message.role, html });
  return html;
}

/** Agent 消息 Markdown 渲染：禁用原文 HTML、自动识别链接，输出经 DOMPurify 净化 */
export function renderAgentMarkdown(source: string) {
  const text = source ?? "";
  if (!text.trim()) return "";
  try {
    return DOMPurify.sanitize(md.render(text), PURIFY_OPTIONS) as string;
  } catch {
    return `<pre>${escapeHtml(text)}</pre>`;
  }
}

/** 处理消息区内代码块复制按钮点击，返回 true 表示已处理 */
export async function handleCodeCopyClick(event: MouseEvent) {
  const button = (event.target as HTMLElement | null)?.closest?.(
    ".code-copy"
  ) as HTMLElement | null;
  if (!button) return false;
  const code = button.closest(".code-block")?.querySelector("code")?.textContent || "";
  await navigator.clipboard.writeText(code);
  const label = button.querySelector(".code-copy-label");
  const copied = i18n.global.t("zhifuAgent.chat.copied");
  button.classList.add("copied");
  button.title = copied;
  if (label) label.textContent = copied;
  window.setTimeout(() => {
    button.classList.remove("copied");
    button.title = i18n.global.t("zhifuAgent.chat.copyCode");
    if (label) label.textContent = i18n.global.t("zhifuAgent.chat.copy");
  }, 1800);
  return true;
}
