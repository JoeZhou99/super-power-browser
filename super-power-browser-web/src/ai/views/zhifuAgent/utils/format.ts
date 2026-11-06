import i18n from "@/ai/lang";
import { KNOWN_TOOLS } from "../constants";
import type { ChatMessage, ToolItem } from "../type";

const t = (key: string, params?: Record<string, any>) =>
  params ? i18n.global.t(key, params) : i18n.global.t(key);

export const formatTool = (name?: string) => {
  if (name && KNOWN_TOOLS.includes(name)) return t(`zhifuAgent.tools.${name}`);
  return name || t("zhifuAgent.tools.default");
};

export const summarizeInput = (input: any) => {
  if (typeof input === "string") return input;
  if (!input) return "";
  const value =
    input.command || input.path || input.filePath || input.patch || JSON.stringify(input, null, 2);
  return String(value).slice(0, 360);
};

export const formatDuration = (message: ChatMessage, now: number) => {
  const end = message.completedAt || now;
  const totalSeconds = Math.max(1, Math.floor((end - message.createdAt) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes
    ? t("zhifuAgent.chat.durationMinutes", { minutes, seconds })
    : t("zhifuAgent.chat.durationSeconds", { seconds });
};

export const formatMessageTime = (timestamp: number) =>
  new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(timestamp)
  );

export const toolGroupStatus = (tools: ToolItem[], executionStatus?: string) => {
  if (executionStatus === "success") {
    return tools.some((tool) => tool.status === "error")
      ? "已完成，过程中有步骤调整"
      : t("zhifuAgent.tools.groupDone");
  }
  if (tools.some((tool) => tool.status === "running")) return t("zhifuAgent.chat.runState.running");
  if (tools.some((tool) => tool.status === "error"))
    return t("zhifuAgent.tools.groupPartialFailed");
  if (tools.some((tool) => tool.status === "cancelled"))
    return t("zhifuAgent.chat.runState.stopped");
  return t("zhifuAgent.tools.groupDone");
};

export const toolStatusLabel = (tool: ToolItem) =>
  tool.status === "cancelled"
    ? t("zhifuAgent.chat.runState.stopped")
    : t(`zhifuAgent.tools.status${tool.status.charAt(0).toUpperCase()}${tool.status.slice(1)}`);
