// Runs in the page: exclude executable/style nodes and hidden text.
export function readPageContent(root) {
  const visibleText = node => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
    const parts = []
    let size = 0, text
    while ((text = walker.nextNode()) && size < 8000) {
      const parent = text.parentElement
      if (!parent || parent.closest('script,style,noscript,template,[hidden],[aria-hidden="true"]')) continue
      const style = getComputedStyle(parent)
      if (style.display === 'none' || style.visibility === 'hidden' || !parent.getClientRects().length) continue
      const value = text.textContent.replace(/\s+/g, ' ').trim()
      if (value) { parts.push(value); size += value.length + 1 }
    }
    return parts.join('\n').slice(0, 8000)
  }
  return {
    text: visibleText(root),
    links: [...new Set([
      ...root.querySelectorAll('h1 a[href],h2 a[href],h3 a[href],[role="heading"] a[href]'),
      ...root.querySelectorAll('main a[href],[role="main"] a[href],article a[href]'),
      ...root.querySelectorAll('a[href]'),
    ])].filter(a => {
      const style = getComputedStyle(a)
      return /^https?:/.test(a.href) && a.href.length <= 2000 && a.getClientRects().length && style.display !== 'none' && style.visibility !== 'hidden' && !a.closest('[hidden],[aria-hidden="true"]') && a.innerText.trim()
    }).slice(0, 40).map(a => ({ title: a.innerText.trim().slice(0, 160), url: a.href })),
    tables: [...root.querySelectorAll('table')].filter(table => table.getClientRects().length).slice(0, 3).map(table => [...table.rows].slice(0, 20).map(row => [...row.cells].slice(0, 10).map(cell => visibleText(cell).slice(0, 120)))),
  }
}

export function compactSnapshotElement(element) {
  const href = element.getAttribute('href') || ''
  return { tag: element.tagName.toLowerCase(), text: (element.innerText || element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.getAttribute('name') || '').slice(0, 120), type: (element.getAttribute('type') || '').slice(0, 30), href: /^(?:https?:|\/|#)/i.test(href) && href.length <= 300 ? href : '' }
}
