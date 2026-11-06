{
const { contextBridge, ipcRenderer, webUtils } = require('electron')

const CHANNELS = Object.freeze({
  exportDiagnostics: 'app:export-diagnostics',
  bootstrap: 'app:bootstrap',
  openScheduledShops: "scheduled:open-shops",
  scheduledShopsResult: "scheduled:shops-result",
  selectWorkspace: 'workspace:select',
  selectFiles: 'files:select',
  saveSettings: 'settings:save',
  testConnection: 'settings:test-connection',
  testImConnection: 'settings:test-im-connection',
  setWorkspace: 'settings:set-workspace',
  setMessagingTarget: 'settings:set-messaging-target',
  imMessage: 'im:message',
  imStatus: 'im:status',
  conversationStorageInfo: 'conversations:storage-info',
  moveConversationStorage: 'conversations:move-storage',
  loadConversations: 'conversations:load',
  saveConversations: 'conversations:save',
  exportConversations: 'conversations:export',
  importConversations: 'conversations:import',
  runAgent: 'agent:run',
  stopAgent: 'agent:stop',
  approveTool: 'agent:approve',
  clearApprovals: 'agent:clear-approvals',
  agentEvent: 'agent:event',
  approvalRequested: 'agent:approval-requested',
  listSkills: 'skills:list',
  installSkill: 'skills:install',
  previewSkillFile: 'skills:preview-file',
  installBundledSkill: 'skills:install-bundled',
  installRemoteSkill: 'skills:install-remote',
  createSkill: 'skills:create',
  getSkill: 'skills:get',
  updateSkill: 'skills:update',
  toggleSkill: 'skills:toggle',
  uninstallSkill: 'skills:uninstall',
  listScheduledTasks: 'scheduled:list',
  saveScheduledTask: 'scheduled:save',
  toggleScheduledTask: 'scheduled:toggle',
  deleteScheduledTask: 'scheduled:delete',
  runScheduledTask: 'scheduled:run-now',
  markScheduledTaskRead: 'scheduled:mark-read',
  scheduledTaskUpdated: 'scheduled:updated',
  openScheduledTaskResult: 'scheduled:open-result',
})

const on = (channel, listener) => {
  const handler = (_event, payload) => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const invokeWhenReady = async (channel, ...args) => {
  await ipcRenderer.invoke('trident:ready')
  return ipcRenderer.invoke(channel, ...args)
}

function installTridentBridge() {
  try {
    contextBridge.exposeInMainWorld('localflow', {
      conversationStorageInfo: () => invokeWhenReady(CHANNELS.conversationStorageInfo),
      moveConversationStorage: () => invokeWhenReady(CHANNELS.moveConversationStorage),
      loadConversations: input => invokeWhenReady(CHANNELS.loadConversations,input),
      saveConversations: input => invokeWhenReady(CHANNELS.saveConversations,input),
      exportConversations: input => invokeWhenReady(CHANNELS.exportConversations,input),
      importConversations: input => invokeWhenReady(CHANNELS.importConversations,input),
      bootstrap: () => invokeWhenReady(CHANNELS.bootstrap),
      queryModels: input => ipcRenderer.invoke('spb:aiQueryModels', input),
      exportDiagnostics: (input) => invokeWhenReady(CHANNELS.exportDiagnostics, input),
      ordinaryBrowserGet: () => invokeWhenReady('browser:get'),
      ordinaryBrowserSelect: (value) => invokeWhenReady('browser:select', value),
      closeConversationBrowser: (input) => invokeWhenReady('browser:close-conversation', input),
      onOrdinaryBrowserStatus: (listener) => on('browser:status', listener),
      openExternal: (url) => invokeWhenReady('app:open-external', url),
      openResultFile: (path) => invokeWhenReady('app:open-result-file', path),
      revealResultFile: (path) => invokeWhenReady('app:reveal-result-file', path),
      previewResultImage: (path) => invokeWhenReady('app:preview-result-image', path),
      validateShopConnection: (connection) => invokeWhenReady('shops:validate-connection', connection),
      getBrowserConnection: (browserId) => ipcRenderer.invoke('trident:browser-connection', browserId),
      onOpenScheduledShops: (listener) => on(CHANNELS.openScheduledShops, listener),
      completeScheduledShops: (input) => invokeWhenReady(CHANNELS.scheduledShopsResult, input),
      selectWorkspace: () => invokeWhenReady(CHANNELS.selectWorkspace),
      selectFiles: () => invokeWhenReady(CHANNELS.selectFiles),
      getPathForFile: (file) => webUtils.getPathForFile(file),
      saveSettings: (settings) => invokeWhenReady(CHANNELS.saveSettings, settings),
      testConnection: (settings) => invokeWhenReady(CHANNELS.testConnection, settings),
      testImConnection: (settings) => invokeWhenReady(CHANNELS.testImConnection, settings),
      setWorkspace: (workspace) => invokeWhenReady(CHANNELS.setWorkspace, workspace),
      setMessagingTarget: (input) => invokeWhenReady(CHANNELS.setMessagingTarget, input),
      onImMessage: (listener) => on(CHANNELS.imMessage, listener),
      onImStatus: (listener) => on(CHANNELS.imStatus, listener),
      runAgent: (input) => invokeWhenReady(CHANNELS.runAgent, input),
      beginShopUsage: (shops) => invokeWhenReady('shops:begin-usage', shops),
      finishShopUsage: (input) => invokeWhenReady('shops:finish-usage', input),
      cancelShopUsage: (tokens) => invokeWhenReady('shops:cancel-usage', tokens),
      stopAgent: (conversationId) => invokeWhenReady(CHANNELS.stopAgent, conversationId),
      approveTool: (input) => invokeWhenReady(CHANNELS.approveTool, input),
      clearApprovals: (input) => invokeWhenReady(CHANNELS.clearApprovals, input),
      onAgentEvent: (listener) => on(CHANNELS.agentEvent, listener),
      onApprovalRequested: (listener) => on(CHANNELS.approvalRequested, listener),
      listSkills: (input) => invokeWhenReady(CHANNELS.listSkills, input),
      installSkill: (input) => invokeWhenReady(CHANNELS.installSkill, input),
      previewSkillFile: (input) => invokeWhenReady(CHANNELS.previewSkillFile, input),
      installBundledSkill: (input) => invokeWhenReady(CHANNELS.installBundledSkill, input),
      installRemoteSkill: (input) => invokeWhenReady(CHANNELS.installRemoteSkill, input),
      createSkill: (input) => invokeWhenReady(CHANNELS.createSkill, input),
      getSkill: (input) => invokeWhenReady(CHANNELS.getSkill, input),
      updateSkill: (input) => invokeWhenReady(CHANNELS.updateSkill, input),
      toggleSkill: (input) => invokeWhenReady(CHANNELS.toggleSkill, input),
      uninstallSkill: (input) => invokeWhenReady(CHANNELS.uninstallSkill, input),
      listScheduledTasks: () => invokeWhenReady(CHANNELS.listScheduledTasks),
      saveScheduledTask: (input) => invokeWhenReady(CHANNELS.saveScheduledTask, input),
      toggleScheduledTask: (input) => invokeWhenReady(CHANNELS.toggleScheduledTask, input),
      deleteScheduledTask: (id) => invokeWhenReady(CHANNELS.deleteScheduledTask, id),
      runScheduledTask: (id) => invokeWhenReady(CHANNELS.runScheduledTask, id),
      markScheduledTaskRead: (id) => invokeWhenReady(CHANNELS.markScheduledTaskRead, id),
      onScheduledTaskUpdated: (listener) => on(CHANNELS.scheduledTaskUpdated, listener),
      onOpenScheduledTaskResult: (listener) => on(CHANNELS.openScheduledTaskResult, listener),
    })
  } catch (error) {
    console.error('[SuperPower AI] 页面桥接加载失败', error)
  }
}

installTridentBridge()
}
