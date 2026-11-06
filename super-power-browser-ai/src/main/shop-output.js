import { mkdir } from 'node:fs/promises'
import { basename, isAbsolute, join } from 'node:path'
import { randomUUID } from 'node:crypto'

export function shopOutputDirectory(workspace, name, id) {
  if (!workspace || !isAbsolute(workspace)) throw new Error('未设置有效工作区，无法保存执行文件')
  const clean = value => String(value || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/^\.+/g, '_').replace(/[. ]+$/g, '').slice(0, 80)
  const folder = `${clean(name) || '店铺'}_${clean(id) || 'unknown'}`
  return join(workspace, folder)
}

export async function outputFile(directory, filename) {
  await mkdir(directory, { recursive: true })
  const safe = basename(String(filename).replace(/\\/g, '/')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '') || 'download'
  return join(directory, `${randomUUID()}-${safe}`)
}

export function captureDownloads(page, directory, pending, files) {
  const handler = download => {
    const saving = (async () => {
      const path = await outputFile(directory, download.suggestedFilename())
      await download.saveAs(path)
      files.push(path)
    })()
    pending.push(saving)
    // Keep rejected downloads observable at the next tool completion.
    saving.catch(() => {})
  }
  page.on('download', handler)
  return () => page.off('download', handler)
}
