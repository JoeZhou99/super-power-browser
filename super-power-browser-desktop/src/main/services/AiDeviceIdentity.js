const { randomUUID } = require('node:crypto');
const { mkdir, readFile, writeFile, link, unlink } = require('node:fs/promises');
const path = require('node:path');

/** An installation ID shared by this desktop's accounts and preserved across restarts. */
function createAiDeviceSettings(dataPath) {
  const file = path.join(dataPath, 'ai', 'device-id');
  let pending;
  async function deviceId() {
    if (pending) return pending;
    pending = (async () => {
      await mkdir(path.dirname(file), { recursive: true });
      try { await readFile(file, 'utf8'); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        const temporary = `${file}.${randomUUID()}.tmp`;
        await writeFile(temporary, randomUUID(), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
        try {
          try { await link(temporary, file); }
          catch (error) { if (error.code !== 'EEXIST') throw error; }
        } finally { await unlink(temporary); }
      }
      const id = (await readFile(file, 'utf8')).trim();
      if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) {
        throw new Error('AI 设备标识文件无效，请检查客户端数据目录');
      }
      return id;
    })().catch(error => { pending = null; throw error; });
    return pending;
  }
  return async settings => {
    let source = settings.modelSource;
    if (source !== 'own' && source !== 'official') {
      try { source = new URL(settings.baseUrl).pathname.replace(/\/+$/, '') === '/api/ai/gateway/v1' ? 'official' : 'own'; }
      catch { source = 'own'; }
    }
    if (['ollama', 'lmstudio'].includes(settings.providerId)) source = 'own';
    const headers = source === 'official' && String(settings.baseUrl || '').trim() ? {
      'X-AI-Device-Id': await deviceId(),
      'X-AI-Device-Info': Buffer.from(JSON.stringify({ platform: process.platform, application: 'super-power-browser' })).toString('base64'),
    } : {};
    return { ...settings, modelSource: source, headers };
  };
}

module.exports = { createAiDeviceSettings };
