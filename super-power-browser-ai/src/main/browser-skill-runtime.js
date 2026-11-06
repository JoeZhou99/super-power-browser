import { chromium } from 'playwright-core'
import { captureDownloads, outputFile } from './shop-output.js'

// Compatibility entry for existing Node.js skills. Connect only; never launch.
export async function withShopPage(execute, pageUrl) {
  const mallId = process.env.TRIDENT_MALL_ID
  const cdpUrl = process.env.TRIDENT_CDP_URL
  if (!mallId || !cdpUrl) throw new Error('必须通过 browser_run_skill_script 运行此技能')
  const browser = await chromium.connectOverCDP(cdpUrl, { timeout: 3000, noDefaults: true })
  const pending = [], files = [], cleanup = []
  try {
    const outputDir = process.env.TRIDENT_OUTPUT_DIR
    if (!outputDir) throw new Error('缺少店铺文件保存目录')
    const attach = page => {
      cleanup.push(captureDownloads(page, outputDir, pending, files))
      const screenshot = page.screenshot.bind(page)
      page.screenshot = async (options = {}) => {
        const path = await outputFile(outputDir, options.path || 'screenshot.png')
        const image = await screenshot({ ...options, path })
        files.push(path)
        return image
      }
    }
    for (const context of browser.contexts()) {
      context.pages().forEach(attach)
      context.on('page', attach)
      cleanup.push(() => context.off('page', attach))
    }
    const pages = browser.contexts().flatMap(context => context.pages())
    const targets = pageUrl ? pages.filter(page => page.url() === pageUrl) : pages
    if (targets.length !== 1) throw new Error('存在多个页面或无匹配页面，请明确指定 pageUrl')
    const page = targets[0]
    page.setDefaultTimeout(30000)
    page.setDefaultNavigationTimeout(30000)
    const result = await execute({ page, browser, mallId, outputDir })
    await Promise.all(pending)
    if (files.length) console.log(JSON.stringify({ files }))
    console.log(JSON.stringify({ shopExecutionResult: { mallId, ok: true, result: typeof result === 'string' ? result : JSON.stringify(result), error: '' } }))
    return result
  } finally { cleanup.forEach(remove => remove()); await browser.close() }
}
