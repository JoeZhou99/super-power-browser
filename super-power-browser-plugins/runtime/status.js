async function refresh() {
  const { spStartup } = await chrome.storage.local.get('spStartup');
  document.getElementById('message').textContent = spStartup?.message ?? '尚未获得启动状态';
  document.getElementById('detail').textContent = JSON.stringify(spStartup ?? {}, null, 2);
}
document.getElementById('refresh').addEventListener('click', refresh);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.spStartup) refresh();
});
refresh();
