import { markRaw } from "vue";
import {
  newId,
  errorMessage,
  skillIdentity,
  useSuperPowerAgentStore,
} from "@/ai/store/modules/superpower-agent.store";
import {
  superpowerApproveTool,
  superpowerClearApprovals,
  superpowerListSkills,
  superpowerRunAgent,
  superpowerStopAgent,
  type SuperPowerAgentMode,
  type SuperPowerApprovalScope,
} from "@/ai/utils/electronApi";
import { LOCAL_PROVIDERS, SUPERPOWER_STORAGE_KEYS } from "../../constants";
import { isApprovalDenied } from "../../utils/userError";
import type { PendingFile, PendingImage, SelectedSkill } from "../../type";
import { collapseRepeatedText, stripThinkingMarkup } from "../../utils/streamText";
import { normalizeTaskShops } from "../../utils/taskShops";
import type { SelectedShop } from "../components/ShopSelect.vue";
import { isMallOpenOnlyRequest, type MallOpenResult } from "../utils/shop";
import { useModelPlanAccess } from "@/ai/views/modelManage/composables/useModelPlanAccess";

export interface SendPromptPayload {
  autoCloseShops?: boolean;
  text: string;
  images: PendingImage[];
  files: PendingFile[];
  skills: SelectedSkill[];
  shops: SelectedShop[];
}

export function useAgentRun() {
  const store = useSuperPowerAgentStore();
  const { t } = useI18n();
  const { showTrial, refresh: refreshPlanAccess } = useModelPlanAccess();

  const canSend = (payload: SendPromptPayload) =>
    store.conversationStorageReady &&
    !store.conversationStorageBusy &&
    !store.activeConversation?._summary &&
    !!(
      payload.text.trim() ||
      payload.skills.length ||
      payload.images.length ||
      payload.files.length ||
      payload.shops.length
    );

  function shopContext(shops: SelectedShop[], results: MallOpenResult[]) {
    if (!results.length) {
      const lines = shops.map((shop) => {
        const line = t("superpowerAgent.composer.shopLine", {
          id: shop.id,
          name: shop.name,
          platform: shop.platform || "",
        });
        return shop.account
          ? `${line}${t("superpowerAgent.composer.shopAccount", { account: shop.account })}`
          : line;
      });
      return [
        `[${t("superpowerAgent.composer.shopSelectedTitle")}]`,
        lines.join("\n"),
        "[店铺操作要求] 项目层会按店铺并发队列逐家打开、验证并执行。每家店铺只使用项目传入的对应浏览器连接，不串用实例，不再次调用 open_mall，也不要新启动浏览器。连接失败时说明具体错误，不声称已完成。",
      ].join("\n");
    }
    const lines = shops.map((shop) => {
      const line = t("superpowerAgent.composer.shopLine", {
        id: shop.id,
        name: shop.name,
        platform: shop.platform || "",
      });
      return shop.account
        ? `${line}${t("superpowerAgent.composer.shopAccount", { account: shop.account })}`
        : line;
    });
    const connections = results.map((result) => {
      const shop = shops.find((item) => String(item.id) === String(result.mallId));
      return {
        mallId: result.mallId,
        browserId: result.browserId,
        mallName: shop?.name,
        platform: shop?.platform,
        status: result.status,
        isopen: result.isopen,
        reused: Boolean(result.reused),
        cdpUrl: result.cdpUrl,
        WebDriverPort: result.WebDriverPort,
        KernalNumber: result.KernalNumber,
        message: result.message,
      };
    });
    return [
      `[${t("superpowerAgent.composer.shopSelectedTitle")}]`,
      lines.join("\n"),
      `[${t("superpowerAgent.composer.shopConnection")}]`,
      JSON.stringify(connections, null, 2),
      `[${t("superpowerAgent.composer.shopRequirement")}] ${t("superpowerAgent.composer.shopInstruction")}`,
    ].join("\n");
  }

  function fillOpenMessage(result: MallOpenResult) {
    if (result.message) return result;
    if (!result.mallId) {
      return { ...result, message: t("superpowerAgent.composer.shopMissingId") };
    }
    return {
      ...result,
      message: result.ok
        ? t("superpowerAgent.composer.shopOpened")
        : t("superpowerAgent.composer.shopOpenFailed", { id: result.mallId }),
    };
  }

  /** 返回 true 表示已开始运行，调用方可清空输入框 */
  async function sendPrompt(payload: SendPromptPayload) {
    if (!canSend(payload) || store.running) return false;
    store.error = "";
    // Model validation is performed with the persisted provider settings after
    // workspace/account preparation, so missing workspace errors stay precise.
    await store.ensureModelKeySaved();
    if (!store.workspace) {
      await store.selectWorkspace().catch((cause) => {
        store.error = errorMessage(cause);
      });
      if (!store.workspace) return false;
    }
    const { settings } = store;
    if (!settings.hasApiKey && !settings.apiKey && !LOCAL_PROVIDERS.includes(settings.providerId)) {
      await refreshPlanAccess().catch(() => undefined);
      if (showTrial.value) {
        store.requestBenefitClaim();
        return false;
      }
      store.requestPlanBuy();
      return false;
    }

    let pendingSkills = [...payload.skills];
    const pendingShops: SelectedShop[] = normalizeTaskShops(payload.shops);
    if (!pendingShops.length && pendingSkills.length) {
      try {
        const latest = await superpowerListSkills({ workspace: store.workspace });
        const required = latest.filter(
          (skill) =>
            skill.requiresShop === true &&
            pendingSkills.some(
              (selected) => skillIdentity(selected.name) === skillIdentity(skill.name)
            )
        );
        if (required.length) {
          store.error = `技能“${required.map((skill) => skill.name).join("、")}”需要店铺，请先选择店铺后再发送。`;
          return false;
        }
      } catch (cause) {
        store.error = errorMessage(cause);
        return false;
      }
    }
    let conversation = store.activeConversation;
    if (
      conversation.skillTrial &&
      conversation.messages.length &&
      (pendingSkills.length || pendingShops.length)
    ) {
      if (!pendingSkills.length) pendingSkills.push({ ...conversation.skillTrial.skill });
      const previous = [...conversation.messages].reverse().find((item) => item.role === "user");
      const ids = (items: { id?: string | number; name?: string }[]) =>
        items
          .map((item) => String(item.id || item.name))
          .sort()
          .join("|");
      if (
        previous &&
        pendingSkills[0] &&
        (ids(previous.shops || []) !== ids(pendingShops) ||
          ids(previous.skills || []) !== ids(pendingSkills))
      ) {
        conversation = store.forkSkillTrial(pendingSkills[0]);
      }
    }
    const text = payload.text.trim();
    const skillMentions = pendingSkills.map((skill) => `#${skill.name}`).join(" ");
    const projectOnlyMallOpen =
      store.effectiveMode !== "plan" &&
      pendingShops.length > 0 &&
      isMallOpenOnlyRequest({
        text,
        hasSkills: pendingSkills.length > 0,
        hasAttachments: payload.images.length > 0,
        hasFiles: payload.files.length > 0,
      });
    const attachmentRequest = [
      payload.files.length ? "读取本次所附文件" : "",
      payload.images.length ? "查看本次所附图片" : "",
    ]
      .filter(Boolean)
      .join("并");
    const fallbackText = attachmentRequest
      ? [
          `请先${attachmentRequest}，结合附件内容${pendingSkills.length ? `使用「${pendingSkills.map((skill) => skill.name).join("、")}」执行任务` : "进行分析"}。`,
          pendingShops.length ? "涉及店铺操作时，仅使用已选择的店铺。" : "",
        ]
          .filter(Boolean)
          .join("")
      : pendingShops.length
        ? pendingSkills.length
          ? t("superpowerAgent.chat.fallbackShopWithSkills", {
              skills: pendingSkills.map((skill) => skill.name).join("、"),
            })
          : t("superpowerAgent.chat.fallbackShop")
        : payload.images.length
          ? t("superpowerAgent.chat.fallbackImage")
          : payload.files.length
            ? t("superpowerAgent.chat.fallbackFile")
            : t("superpowerAgent.chat.fallbackSkill");
    const displayText = text || fallbackText;
    const history = conversation.messages
      .filter((message) => !message.streaming && ["user", "assistant"].includes(message.role))
      .map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        shops: message.shops?.map(({ id, name }) => ({ id, name })),
        skills: message.skills?.map(({ id, name }) => ({ id, name })),
        files: message.files?.map(({ name, path }) => ({ name, path })),
        attachments: message.attachments?.map(({ name }) => ({ name })),
      }));
    const messageId = newId();
    conversation.messages.push({
      id: messageId,
      role: "user",
      content: displayText,
      createdAt: Date.now(),
      workspace: store.workspace,
      shops: pendingShops.map(({ id, name }) => ({ id, name })),
      skills: pendingSkills.map(({ id, name, scope }) => ({ id, name, scope })),
      attachments: payload.images.map(({ id, name, type, preview, dataUrl }) => ({
        id,
        name,
        type,
        preview,
        source: dataUrl,
      })),
      files: payload.files.map(({ id, name, path }) => ({ id, name, path })),
    });
    if (conversation.autoTitle) {
      conversation.title = (
        text ||
        pendingShops[0]?.name ||
        pendingSkills[0]?.name ||
        t(payload.images.length ? "superpowerAgent.chat.imageAnalysis" : "superpowerAgent.chat.fileAnalysis")
      ).slice(0, 24);
      conversation.autoTitle = false;
    }

    const runId = newId();
    store.conversationRuns[conversation.id] = {
      runId,
      controller: markRaw(new AbortController()),
      toolCount: 0,
    };
    const run = store.conversationRuns[conversation.id];
    const isCurrent = () =>
      store.conversationRuns[conversation.id]?.runId === runId && !run.controller.signal.aborted;
    const workspace = store.workspace;
    const mode = store.effectiveMode;
    conversation.executionState = "queued";
    const assistant = store.currentAssistant(conversation);
    const finishAssistant = () => {
      assistant.content = collapseRepeatedText(stripThinkingMarkup(assistant.content));
      assistant.streaming = false;
      assistant.completedAt ||= Date.now();
      delete assistant.statusLabel;
    };
    assistant.statusLabel = t("superpowerAgent.chat.waitingSlot");
    store.persist();
    store.scrollToBottom();
    // 消息已进入会话后立即返回，输入框不必等店铺打开完成才清空
    void continueAcceptedPrompt();
    return true;

    async function continueAcceptedPrompt() {
      let release: (() => void) | undefined;
      try {
        await store.flushConversations();
        if (!isCurrent()) return;
        release = await store.conversationQueue.acquire({
          limit: settings.conversationConcurrency,
          signal: run.controller.signal,
        });
        if (!isCurrent()) return;
        conversation.executionState = "running";
        assistant.statusLabel = t(
          pendingShops.length && mode !== "plan"
            ? "superpowerAgent.chat.openingShops"
            : "superpowerAgent.chat.thinking"
        );
        if (pendingSkills.length) {
          const latestSkills = await superpowerListSkills({ workspace });
          store.localSkills = latestSkills;
          const available = new Set(
            latestSkills
              .filter((skill) => skill.enabled && !skill.invalid)
              .map((skill) => skillIdentity(skill.name))
          );
          const unavailable = pendingSkills.filter(
            (skill) => !available.has(skillIdentity(skill.name))
          );
          if (unavailable.length) {
            throw new Error(
              t("superpowerAgent.chat.skillsUnavailable", {
                skills: unavailable.map((skill) => skill.name).join("、"),
              })
            );
          }
        }

        if (!isCurrent()) return;
        /* Shop opening and lifecycle ownership are handled by the desktop host.
        let mallOpenResults: MallOpenResult[] = [];
        if (mode !== "plan" && pendingShops.length) {
          shopUsageTokens = await superpowerBeginShopUsage(pendingShops);
          if (!isCurrent()) return;
          mallOpenResults = (
            await Promise.all(
              pendingShops.map((shop) =>
                openMallFromPage(shop.id)
                  .then(async (result) => {
                    if (
                      !result.ok ||
                      !isCurrent() ||
                      !projectOnlyMallOpen ||
                      !payload.autoCloseShops
                    )
                      return result;
                    let closeMessage: string;
                    try {
                      closeMessage = await superpowerFinishShopUsage({
                        token: shopUsageTokens[String(shop.id)],
                        connection: result,
                      });
                    } catch {
                      closeMessage = "店铺已打开，但关闭浏览器失败，请检查客户端后手动关闭。";
                    }
                    return {
                      ...result,
                      message: [fillOpenMessage(result).message, closeMessage]
                        .filter(Boolean)
                        .join("\n"),
                    };
                  })
                  .catch((cause) => mallOpenFailure(shop, cause))
              )
            )
          ).map(fillOpenMessage);
          if (!isCurrent()) return;
          const failed = mallOpenResults.find((result) => !result.ok);
          if (failed && (pendingShops.length === 1 || projectOnlyMallOpen)) {
            throw new MallOpenError(mallOpenResults);
          }
        }

        if (projectOnlyMallOpen) {
          assistant.content = mallOpenResults
            .map(
              (result, index) => `${pendingShops[index]?.name || result.mallId}：${result.message}`
            )
            .join("\n");
          assistant.executionStatus = "completed";
          return;
        }

        */
        if (!isCurrent()) return;
        if (pendingShops.length) assistant.statusLabel = t("superpowerAgent.chat.thinking");
        const context = pendingShops.length ? shopContext(pendingShops, []) : "";
        const requestText = [skillMentions, context, text || fallbackText]
          .filter(Boolean)
          .join("\n\n");

        await store.whenSettingsWritten?.();
        const result = await superpowerRunAgent({
          conversationId: conversation.id,
          history,
          messageId,
          runId,
          autoCloseShops: mode !== "plan" && payload.autoCloseShops === true,
          openOnly: projectOnlyMallOpen,
          prompt: requestText,
          images: payload.images.map((item) => item.dataUrl),
          files: payload.files.map((item) => item.path),
          skillNames: pendingSkills.map((item) => item.name),
          workspace,
          mode,
          shops: pendingShops.map(({ id, name, platform, account }) => ({
            id,
            name,
            platform,
            account,
          })),
          shopResults: [],
          shopPrompt: [skillMentions, text || fallbackText].filter(Boolean).join("\n\n"),
        });
        if (result?.stopped || result?.status === "cancelled" || isApprovalDenied(result?.error)) {
          assistant.executionStatus = "cancelled";
          conversation.executionState = "stopped";
        } else if (isCurrent()) {
          if (result.output) assistant.content = result.output;
          if (result.closeMessage) assistant.content += `\n\n${result.closeMessage}`;
          if (result.status)
            assistant.executionStatus = result.status === "error" ? "failed" : result.status;
          if (
            result.status === "success" &&
            !result.error &&
            conversation.id === store.activeId &&
            run.errorMessage &&
            store.error === run.errorMessage
          )
            store.error = "";
          if (result.error) {
            const rawError = typeof result.error === "string" ? result.error : String(result.error);
            const friendlyError = (result.status === "error" && /\u5e97\u94fa.*\u6253\u5f00\u5931\u8d25/u.test(rawError)
              ? rawError
              : errorMessage(result.error)
            ).replace(/\\n/g, "\n");
            if (conversation.id === store.activeId) store.error = friendlyError;
            if (!assistant.content.includes(friendlyError))
              assistant.content += `\n\n${friendlyError}`;
          }
        }
      } catch (cause) {
        if (isApprovalDenied(cause) || run.controller.signal.aborted) {
          assistant.executionStatus = "cancelled";
          conversation.executionState = "stopped";
          if (conversation.id === store.activeId && isApprovalDenied(cause)) store.error = "";
        } else if (isCurrent()) {
          const message = errorMessage(cause);
          assistant.executionStatus = "failed";
          if (conversation.id === store.activeId) store.error = message;
          if (!assistant.content)
            assistant.content = t("superpowerAgent.chat.requestFailed", { message });
        }
      } finally {
        finishAssistant();
        release?.();
        if (store.conversationRuns[conversation.id]?.runId === runId) {
          const stoppedByUser =
            run.controller.signal.aborted || assistant.executionStatus === "cancelled";
          conversation.executionState = stoppedByUser
            ? "stopped"
            : ["error", "failed", "partial", "unverified"].includes(assistant.executionStatus || "")
              ? "failed"
              : "completed";
          delete store.conversationRuns[conversation.id];
          store.clearConversationApprovals(conversation.id);
          if (!run.notified && !run.controller.signal.aborted)
            store.notifyConversation(
              conversation,
              assistant.executionStatus === "cancelled"
                ? "cancelled"
                : conversation.executionState === "failed"
                  ? "error"
                  : "agent"
            );
        }
        await store.flushConversations().catch(() => {});
        if (conversation.id === store.activeId && store.isNearBottom()) store.scrollToBottom();
      }
    }
  }

  async function stopConversation(conversationId: string) {
    const conversation = store.conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    const run = store.conversationRuns[conversation.id];
    if (!run || run.stopping) return;
    run.stopping = true;
    run.controller.abort();
    store.clearConversationApprovals(conversation.id);
    const last = conversation.messages.at(-1);
    if (last?.role === "assistant") {
      last.streaming = false;
      last.completedAt ||= Date.now();
      last.executionStatus = "cancelled";
      last.content = `${last.content ? `${last.content}\n\n` : ""}${t("superpowerAgent.chat.stopped")}`;
    }
    for (const tool of conversation.tools) if (tool.status === "running") tool.status = "cancelled";
    conversation.executionState = "stopped";
    store.persist();
    try {
      await superpowerStopAgent(conversation.id);
      store.persist();
      if (conversation.id === store.activeId) await store.scrollToBottom();
    } catch (cause) {
      if (conversation.id === store.activeId)
        store.error = errorMessage(cause, t("superpowerAgent.chat.stopFailed"));
    }
  }

  function stopAgent() {
    return stopConversation(store.activeConversation.id);
  }

  function setMode(value: SuperPowerAgentMode) {
    const conversationId = store.activeConversation.id;
    if (store.currentPermissions.includes("*")) {
      superpowerClearApprovals({ conversationId, toolName: "*" }).catch(() => {});
      store.sessionPermissions[conversationId] = store.currentPermissions.filter(
        (item) => item !== "*"
      );
    }
    store.mode = value;
    localStorage.setItem(SUPERPOWER_STORAGE_KEYS.mode, value);
  }

  async function decideApproval(approved: boolean, scope: SuperPowerApprovalScope = "once") {
    const request = store.approval;
    if (!request) return;
    const conversationId = request.conversationId;
    const sourceRun = store.conversationRuns[conversationId];
    if (
      !conversationId ||
      !store.conversations.some((item) => item.id === conversationId) ||
      !sourceRun ||
      sourceRun.controller.signal.aborted ||
      (request.runId && sourceRun.runId !== request.runId)
    ) {
      store.error = "该授权请求已失效，请返回来源会话检查任务状态。";
      store.advanceApproval();
      return;
    }
    store.advanceApproval();
    if (!approved) {
      const stopping = stopConversation(conversationId);
      try {
        await superpowerApproveTool({ approvalId: request.approvalId, approved: false, scope: "once" });
      } catch (cause) {
        store.error = errorMessage(cause);
      }
      await stopping;
      return;
    }
    try {
      const accepted = await superpowerApproveTool({ approvalId: request.approvalId, approved, scope });
      if (accepted === false) {
        store.error = "该授权请求已失效，未授予权限，请检查来源会话的任务状态。";
        return;
      }
    } catch (cause) {
      store.error = errorMessage(cause);
      return;
    }
    if (approved && scope === "turn" && request.runId) {
      store.clearConversationApprovals(conversationId, request.runId);
    }
    if (approved && (scope === "session" || scope === "all_session")) {
      store.clearConversationApprovals(
        conversationId,
        request.runId,
        scope === "session" ? request.toolName : undefined
      );
      const permissions = store.sessionPermissions[conversationId] || [];
      const toolName = scope === "all_session" ? "*" : request.toolName;
      if (!permissions.includes(toolName)) {
        store.sessionPermissions[conversationId] = [...permissions, toolName];
      }
    }
  }

  async function revokePermission(toolName: string) {
    const conversationId = store.activeConversation.id;
    await superpowerClearApprovals({ conversationId, toolName });
    store.sessionPermissions[conversationId] = store.currentPermissions.filter(
      (item) => item !== toolName
    );
  }

  async function revokeAllPermissions() {
    const conversationId = store.activeConversation.id;
    await superpowerClearApprovals({ conversationId });
    store.sessionPermissions[conversationId] = [];
  }

  return {
    canSend,
    sendPrompt,
    stopAgent,
    setMode,
    decideApproval,
    revokePermission,
    revokeAllPermissions,
  };
}
