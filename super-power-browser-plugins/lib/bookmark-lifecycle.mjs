// Keep the legacy tree format and events, but finish restore before exposing
// the shop. Otherwise the asynchronous initial restore can erase a new bookmark.
export function bookmarkLifecycle(source) {
  function replace(before,after){if(!source.includes(before))throw new Error('书签同步适配点发生变化');source=source.replace(before,after);}
  replace('        this.openHelperIndex(),','        await this.initBookmark(o, e.sysMallId),\n        this.openHelperIndex(),');
  replace('        ut && (console.log("ZF is ready to start-----------"), this.initBookmark(o, e.sysMallId)),','');
  replace('    initBookmark(e, t) {\n      try {\n        ve.init(e, t);\n      } catch {}\n    },','    async initBookmark(e, t) {\n      await ve.init(e, t);\n    },');
  replace('(console.log("getBookmark:", 3), await xe(), console.log("获取书签栏：showBookmark", t));','console.log("获取书签栏：showBookmark", t);');
  replace('        n = JSON.parse(o) || [];','        n = JSON.parse(o) || [];\n      if (!Array.isArray(n)) throw new Error("书签数据格式不合法");\n      await xe();');
  const start=source.indexOf('function xe() {'),end=source.indexOf('\nfunction X(',start);
  if(start<0||end<0)throw new Error('书签清理适配点发生变化');
  source=source.slice(0,start)+`async function xe() {
  const tree=await chrome.bookmarks.getTree();
  for(const root of tree[0].children||[])for(const child of root.children||[]){
    if(child.children)await chrome.bookmarks.removeTree(child.id);
    else await chrome.bookmarks.remove(child.id);
  }
}
`+source.slice(end);
  return source;
}
