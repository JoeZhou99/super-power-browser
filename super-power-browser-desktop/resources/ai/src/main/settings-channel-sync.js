const connectionFields = {
  feishu: ['feishuEnabled', 'feishuAppId', 'feishuAppSecret'],
  dingtalk: ['dingTalkEnabled', 'dingTalkClientId', 'dingTalkClientSecret'],
  wecom: ['weComEnabled', 'weComBotId', 'weComSecret'],
  wechat: ['wechatEnabled', 'wechatAppId', 'wechatAppSecret', 'wechatBaseUrl', 'wechatIlinkUserId'],
}

// Saving preferences must not wait for, or fail with, an external message channel.
export async function saveSettingsAndSyncChannels(settingsStore, save, services) {
  const previous = await settingsStore.getPrivate()
  const saved = await save()
  const current = await settingsStore.getPrivate()
  for (const [provider, fields] of Object.entries(connectionFields)) {
    const service = services[provider]
    if (!service || !fields.some(field => previous[field] !== current[field])) continue
    void Promise.resolve().then(() => service.configure()).catch(cause => {
      service.updateStatus('error', String(cause?.message || '消息通道连接失败'))
    })
  }
  return saved
}
