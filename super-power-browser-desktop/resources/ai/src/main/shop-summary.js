import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'
import { exportExcel } from './excel-export.js'

const decode = value => value.replace(/&(?:amp|lt|gt|quot|apos);/g, token => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" })[token])
// Read the inline-string worksheet generated and verified by our exporter.
export function readExportTable(bytes) {
  const files = unzipSync(bytes)
  const xml = files['xl/worksheets/sheet1.xml'] && strFromU8(files['xl/worksheets/sheet1.xml'])
  if (!xml) throw Error('导出文件缺少数据工作表')
  const rows = [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map(row => {
    const values = []
    for (const cell of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = /\br="([A-Z]+)\d+"/.exec(cell[1])
      if (!ref) throw Error('无法识别导出文件单元格')
      let column = 0
      for (const letter of ref[1]) column = column * 26 + letter.charCodeAt(0) - 64
      const texts = [...cell[2].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
      values[column - 1] = texts.length ? texts.map(t => decode(t[1])).join('') : decode(/<v>([\s\S]*?)<\/v>/.exec(cell[2])?.[1] || '')
    }
    return values
  })
  const headers = rows.shift()
  if (!headers?.length) throw Error('导出文件没有表头')
  return { headers, rows }
}

export async function summarizeShopResults(workspace, conversationId, states) {
  const base = ['来源店铺ID', '来源店铺名称', '店铺执行状态', '来源文件', '汇总说明']
  const fields = [], records = [], warnings = []
  for (const state of states) {
    let count = 0
    for (const path of new Set(state.files || [])) {
      try {
        const table = readExportTable(await readFile(path))
        // Keep duplicate/empty source headers distinct, rather than dropping cells.
        const headers = table.headers.map((h, i) => (String(h || '未命名列') + (table.headers.indexOf(h) !== i ? '（列' + (i + 1) + '）' : '')))
        for (const header of headers) if (!fields.includes(header)) fields.push(header)
        for (const row of table.rows) {
          records.push({ state, path, values: Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])) })
          count++
        }
      } catch (error) {
        const note = '文件合并失败：' + error.message
        warnings.push(state.shop.name + '：' + note)
        records.push({ state, path, note, values: {} })
      }
    }
    if (!count && !(state.files || []).length) records.push({ state, path: '', note: state.output || '未生成可合并的数据文件', values: {} })
  }
  const rows = records.map(({ state, path, note, values }) => [state.shop.id, state.shop.name, state.status, path, note || '', ...fields.map(h => values[h] ?? '')])
  const result = await exportExcel(join(workspace, '会话文件', conversationId), { filename: '所有店铺操作汇总.xlsx', headers: [...base, ...fields], rows })
  return { ...result, warnings, shopCount: states.length }
}
