const { randomUUID } = require('node:crypto');

// A cold automatic-locale launch has no correct fingerprint to start yet.
// This local, temporary window holds no shop profile, cookies or proxy secrets.
class StartupWindow {
  constructor({ onCancel = () => {}, onRetry = () => {} } = {}) {
    this.onCancel = onCancel; this.onRetry = onRetry;
    this.state = { title: '正在打开店铺', message: '正在获取代理地区和时区…', retry: false };
  }
  async show(state = {}) {
    Object.assign(this.state, state);
    if (this.window && !this.window.isDestroyed()) { this.update(state); this.window.show(); return; }
    const { BrowserWindow } = require('electron');
    const window = this.window = new BrowserWindow({
      width: 720, height: 460, minWidth: 560, minHeight: 360,
      title: this.state.title, autoHideMenuBar: true, backgroundColor: '#f5f7fc',
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, partition: `startup-${randomUUID()}` },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => {
      event.preventDefault();
      if (url === 'spb-startup:retry' && this.state.retry) {
        this.update({ retry: false, message: '正在重新检测代理连接…' });
        Promise.resolve().then(() => this.onRetry()).catch(() => this.update({ retry: true, message: '检测失败，请重试。' }));
      }
    });
    window.on('closed', () => { this.window = null; if (!this.closing) void this.onCancel(); });
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-startup';">
<title>正在打开店铺</title><style>
*{box-sizing:border-box}body{margin:0;font:15px/1.7 'Segoe UI','Microsoft YaHei',sans-serif;color:#27324b;background:#f5f7fc}.brand{padding:22px 30px;color:#5e5ce6;font-weight:600;border-bottom:1px solid #e7eaf1;background:#fff}.card{margin:30px;background:#fff;padding:30px;border:1px solid #e7eaf1;border-radius:12px;text-align:center}.spinner{margin:0 auto 18px;width:32px;height:32px;border:3px solid #e9e8ff;border-top-color:#6c63ff;border-radius:50%;animation:spin 1s linear infinite}h1{font-size:20px;margin:0 0 12px;font-weight:600}p{margin:10px 0;color:#64718a;white-space:pre-wrap}a{display:inline-block;margin-top:12px;padding:7px 24px;color:#fff;text-decoration:none;background:#6c63ff;border-radius:6px}.note{font-size:12px;color:#9099ac;text-align:center}a[hidden]{display:none}@keyframes spin{to{transform:rotate(360deg)}}
</style></head><body><div class="brand">SuperPower Browser</div><main class="card"><div class="spinner" id="spinner"></div><h1 id="title"></h1><p id="message"></p><a id="retry" href="spb-startup:retry" hidden>重新检测</a></main><p class="note">首次自动设置需要获取代理地区；关闭此窗口可取消打开。</p><script nonce="startup">window.updateStartup=state=>{document.getElementById('title').textContent=state.title;document.getElementById('message').textContent=state.message;document.getElementById('retry').hidden=!state.retry;document.getElementById('spinner').style.animationPlayState=state.retry?'paused':'running';};</script></body></html>`;
    await window.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    if (this.window === window && !window.isDestroyed()) this.update();
  }
  update(state = {}) {
    Object.assign(this.state, state);
    if (!this.window || this.window.isDestroyed()) return;
    this.window.setTitle(this.state.title);
    void this.window.webContents.executeJavaScript(`window.updateStartup?.(${JSON.stringify(this.state)})`).catch(() => {});
  }
  close() { this.closing = true; if (this.window && !this.window.isDestroyed()) this.window.close(); }
}
module.exports = { StartupWindow };
