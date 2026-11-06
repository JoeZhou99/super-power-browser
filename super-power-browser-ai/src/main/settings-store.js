import { app, safeStorage } from "electron"
import { BRAND, normalizeAgentName } from "../shared/brand.js"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { normalizeShopConcurrency } from '../shared/task-shops.js'
import { normalizeExecutionTimeout } from '../shared/execution-timeout.js'

const defaults = {
  providerId: "openai-compatible",
  providerName: "官方模型",
  modelId: "",
  baseUrl: "",
  apiKey: "",
  apiProtocol: "chat",
  reasoningEffort: "medium",
  userName: "你",
  agentName: BRAND.agentName,
  workspace: "",
  shopConcurrency: 2,
  conversationConcurrency: 2,
  executionTimeoutMinutes: 10,
  feishuAppId: "",
  feishuEnabled: false,
  feishuTargetChatId: "",
  dingTalkClientId: "",
  dingTalkEnabled: false,
  dingTalkTargetConversationId: "",
  dingTalkTargetSessionWebhook: "",
  weComBotId: "",
  weComEnabled: false,
  weComTargetChatId: "",
  wechatAppId: "",
  wechatEnabled: false,
  wechatBaseUrl: "",
  wechatIlinkUserId: "",
}

export class SettingsStore {
  constructor(dataDir = "") {
    this.filePath = join(dataDir || app.getPath("userData"), "settings.json")
  }

  async readRaw() {
    try {
      const data = JSON.parse(await readFile(this.filePath, "utf8"))
      // The host setting controls power preferences for the AI workspace.
      delete data.sleepPreventionMode
      delete data.preventSleepDuringTasks
      delete data.keepDisplayAwake
      return data
    } catch {
      return {}
    }
  }

  decrypt(value) {
    if (!value) return ""
    try {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(Buffer.from(value, "base64"))
      }
    } catch {
      return ""
    }
    return ""
  }

  encrypt(value) {
    if (!value) return ""
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("系统凭据加密服务当前不可用")
    }
    return safeStorage.encryptString(value).toString("base64")
  }

  async getPublic() {
    const data = await this.readRaw()
    const inferredProtocol = data.apiProtocol || (
      data.providerId === "openai-compatible" && /^gpt-(5|6)/i.test(data.modelId || "")
        ? "responses"
        : "chat"
    )
    return {
      ...defaults,
      ...data,
      agentName: normalizeAgentName(data.agentName),
      apiProtocol: inferredProtocol,
      shopConcurrency: normalizeShopConcurrency(data.shopConcurrency),
      conversationConcurrency: normalizeShopConcurrency(data.conversationConcurrency),
      executionTimeoutMinutes: normalizeExecutionTimeout(data.executionTimeoutMinutes),
      apiKey: "",
      hasApiKey: Boolean(data.encryptedApiKey),
      feishuAppSecret: "",
      hasFeishuAppSecret: Boolean(data.encryptedFeishuAppSecret),
      dingTalkClientSecret: "",
      hasDingTalkClientSecret: Boolean(data.encryptedDingTalkClientSecret),
      weComSecret: "",
      hasWeComSecret: Boolean(data.encryptedWeComSecret),
      wechatAppSecret: "",
      hasWechatAppSecret: Boolean(data.encryptedWechatAppSecret),
      encryptedApiKey: undefined,
      encryptedFeishuAppSecret: undefined,
      encryptedDingTalkClientSecret: undefined,
      encryptedWeComSecret: undefined,
      encryptedWechatAppSecret: undefined,
    }
  }

  async getPrivate() {
    const data = await this.readRaw()
    const inferredProtocol = data.apiProtocol || (
      data.providerId === "openai-compatible" && /^gpt-(5|6)/i.test(data.modelId || "")
        ? "responses"
        : "chat"
    )
    return {
      ...defaults,
      ...data,
      agentName: normalizeAgentName(data.agentName),
      apiProtocol: inferredProtocol,
      shopConcurrency: normalizeShopConcurrency(data.shopConcurrency),
      conversationConcurrency: normalizeShopConcurrency(data.conversationConcurrency),
      executionTimeoutMinutes: normalizeExecutionTimeout(data.executionTimeoutMinutes),
      apiKey: this.decrypt(data.encryptedApiKey),
      feishuAppSecret: this.decrypt(data.encryptedFeishuAppSecret),
      dingTalkClientSecret: this.decrypt(data.encryptedDingTalkClientSecret),
      weComSecret: this.decrypt(data.encryptedWeComSecret),
      wechatAppSecret: this.decrypt(data.encryptedWechatAppSecret),
      encryptedApiKey: undefined,
      encryptedFeishuAppSecret: undefined,
      encryptedDingTalkClientSecret: undefined,
      encryptedWeComSecret: undefined,
      encryptedWechatAppSecret: undefined,
    }
  }

  async save(input) {
    const previous = await this.readRaw()
    const next = {
      providerId: String(input.providerId || defaults.providerId),
      providerName: String(input.providerName || "自定义模型"),
      modelId: String(input.modelId || "").trim(),
      baseUrl: String(input.baseUrl || "").trim(),
      apiProtocol: input.apiProtocol === "responses" ? "responses" : "chat",
      reasoningEffort: String(input.reasoningEffort || "medium"),
      userName: String(input.userName || "你").trim() || "你",
      agentName: normalizeAgentName(input.agentName),
      shopConcurrency: normalizeShopConcurrency(input.shopConcurrency ?? previous.shopConcurrency),
      conversationConcurrency: normalizeShopConcurrency(input.conversationConcurrency ?? previous.conversationConcurrency),
      executionTimeoutMinutes: normalizeExecutionTimeout(input.executionTimeoutMinutes ?? previous.executionTimeoutMinutes),
      workspace: input.workspace === undefined
        ? String(previous.workspace || "")
        : String(input.workspace || "").trim(),
      feishuAppId: String(input.feishuAppId || "").trim(),
      feishuEnabled: Boolean(input.feishuEnabled),
      feishuTargetChatId: String(previous.feishuTargetChatId || ""),
      dingTalkClientId: String(input.dingTalkClientId || "").trim(),
      dingTalkEnabled: Boolean(input.dingTalkEnabled),
      dingTalkTargetConversationId: String(previous.dingTalkTargetConversationId || ""),
      dingTalkTargetSessionWebhook: String(previous.dingTalkTargetSessionWebhook || ""),
      weComBotId: String(input.weComBotId || "").trim(),
      weComEnabled: Boolean(input.weComEnabled),
      weComTargetChatId: String(previous.weComTargetChatId || ""),
      wechatAppId: String(input.wechatAppId || "").trim(),
      wechatEnabled: Boolean(input.wechatEnabled),
      wechatBaseUrl: String(input.wechatBaseUrl || previous.wechatBaseUrl || "").trim(),
      wechatIlinkUserId: String(input.wechatIlinkUserId || previous.wechatIlinkUserId || "").trim(),
      encryptedApiKey: input.apiKey
        ? this.encrypt(String(input.apiKey).trim())
        : previous.encryptedApiKey || "",
      encryptedFeishuAppSecret: input.feishuAppSecret
        ? this.encrypt(String(input.feishuAppSecret).trim())
        : previous.encryptedFeishuAppSecret || "",
      encryptedDingTalkClientSecret: input.dingTalkClientSecret
        ? this.encrypt(String(input.dingTalkClientSecret).trim())
        : previous.encryptedDingTalkClientSecret || "",
      encryptedWeComSecret: input.weComSecret
        ? this.encrypt(String(input.weComSecret).trim())
        : previous.encryptedWeComSecret || "",
      encryptedWechatAppSecret: input.wechatAppSecret
        ? this.encrypt(String(input.wechatAppSecret).trim())
        : previous.encryptedWechatAppSecret || "",
    }
    if (input.clearApiKey) next.encryptedApiKey = ""
    if (input.clearFeishuAppSecret) next.encryptedFeishuAppSecret = ""
    if (input.clearDingTalkClientSecret) next.encryptedDingTalkClientSecret = ""
    if (input.clearWeComSecret) next.encryptedWeComSecret = ""
    if (input.clearWechatAppSecret) next.encryptedWechatAppSecret = ""
    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, JSON.stringify(next, null, 2), "utf8")
    return this.getPublic()
  }

  async setWorkspace(workspace) {
    const data = await this.readRaw()
    data.workspace = String(workspace || "").trim()
    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8")
    return data.workspace
  }

  async setMessagingTarget(provider, target) {
    const data = await this.readRaw()
    if (provider === "feishu") {
      data.feishuTargetChatId = String(target.chatId || "").trim()
    } else if (provider === "dingtalk") {
      data.dingTalkTargetConversationId = String(target.conversationId || "").trim()
      data.dingTalkTargetSessionWebhook = String(target.sessionWebhook || "").trim()
    } else if (provider === "wecom") {
      data.weComTargetChatId = String(target.chatId || "").trim()
    } else {
      throw new Error("不支持的消息平台")
    }
    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8")
    return true
  }
}
