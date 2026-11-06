import type { Conversation } from "../type";

export type ConversationKind = "ordinary" | "skill" | "scheduled";
export function conversationKind(item: Conversation): ConversationKind {
  return item.scheduledTaskId ? "scheduled" : item.skillTrial ? "skill" : "ordinary";
}
export function conversationDisplayTitle(item: Conversation): string {
  const kind = conversationKind(item);
  const title =
    kind === "skill"
      ? item.title.replace(/^(?:技能试跑|Skill trial)\s*[·:：]\s*/i, "")
      : kind === "scheduled"
        ? item.title.replace(/^(?:定时任务|Scheduled task)\s*[:：·]\s*/i, "")
        : item.title;
  return title.trim() || item.title;
}
export function recentConversationList(items: Conversation[], kind: ConversationKind | "all") {
  return items
    .filter(
      (item) => !item.isMainConversation && (kind === "all" || conversationKind(item) === kind)
    )
    .sort((a, b) => conversationActivityAt(b) - conversationActivityAt(a));
}

export function conversationActivityAt(item: Conversation): number {
  const valid = (value: number | undefined) =>
    Number.isFinite(value) && Number(value) > 0 ? Number(value) : 0;
  const messageTime = (item.messages || []).reduce(
    (latest, message) =>
      Math.max(
        latest,
        valid(message.createdAt),
        item.scheduledTaskId ? 0 : valid(message.completedAt)
      ),
    0
  );
  // Scheduled results use the run start time, matching the execution time in the message.
  // Notification receipt time can be much later when historical results are synchronized.
  if (item.scheduledTaskId && messageTime) return messageTime;
  return Math.max(messageTime, valid(item.lastMessageAt), valid(item.createdAt));
}
export function duplicateConversationTitles(items: Conversation[]): Set<string> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.isMainConversation) continue;
    const title = conversationDisplayTitle(item);
    counts.set(title, (counts.get(title) || 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([title]) => title));
}
