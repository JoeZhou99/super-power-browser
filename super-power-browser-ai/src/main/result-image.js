import { readFile, realpath, stat } from 'node:fs/promises'
import { extname, isAbsolute, relative } from 'node:path'

export async function previewResultImage(path, workspace) {
  if (typeof path !== 'string' || !isAbsolute(path) || !workspace || !isAbsolute(workspace)) throw new Error('请选择图片所在的工作区后预览。')
  const [file, root] = await Promise.all([realpath(path), realpath(workspace)])
  const rel = relative(root, file)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('只能预览当前工作区内的图片。')
  if (!['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(extname(file).toLowerCase())) throw new Error('该文件格式不支持图片预览。')
  const info = await stat(file)
  if (!info.isFile() || info.size > 12 * 1024 * 1024) throw new Error('图片过大或不可读取，请点击文件按钮打开。')
  const data = await readFile(file)
  if (data.length > 12 * 1024 * 1024) throw new Error('图片过大，请点击文件按钮打开。')
  const mime = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
    : data[0] === 255 && data[1] === 216 && data[2] === 255 ? 'image/jpeg'
      : ['GIF87a', 'GIF89a'].includes(data.toString('ascii', 0, 6)) ? 'image/gif'
        : data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : ''
  if (!mime) throw new Error('文件内容不是支持的图片，无法预览。')
  return `data:${mime};base64,${data.toString('base64')}`
}
