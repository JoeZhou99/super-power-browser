import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate'
import { readFile, writeFile } from 'node:fs/promises'
import { outputFile } from './shop-output.js'

const xml = value => String(value ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
function column(index) {
  let name = ''
  for (index++; index; index = Math.floor((index - 1) / 26)) name = String.fromCharCode(65 + (index - 1) % 26) + name
  return name
}

// Inline strings intentionally never become formulas, including values starting with =.
export async function exportExcel(directory, { filename = '执行结果.xlsx', headers, rows }) {
  if (!Array.isArray(headers) || !headers.length || headers.length > 50 || headers.some(value => typeof value !== 'string')) throw new Error('表头须为 1～50 个文本字段')
  if (!Array.isArray(rows) || !rows.length || rows.length > 2000) throw new Error('数据须为 1～2000 行')
  if (rows.some(row => !Array.isArray(row) || row.length !== headers.length || row.some(value => value !== null && !['string', 'number', 'boolean'].includes(typeof value) || typeof value === 'number' && !Number.isFinite(value) || String(value ?? '').length > 32000))) throw new Error('行数据须与表头列数一致，单元格只支持文本、有限数字、布尔值或 null，且长度不超过 32000')
  if (JSON.stringify([headers, rows]).length > 2000000) throw new Error('表格内容超过单次导出大小限制')
  const sheet = declaration + `<worksheet xmlns="${ns}"><sheetData>` + [headers, ...rows].map((row, rowIndex) => `<row r="${rowIndex + 1}">` + row.map((value, col) => {
    const ref = `${column(col)}${rowIndex + 1}`
    if (typeof value === 'number') return `<c r="${ref}"><v>${value}</v></c>`
    if (typeof value === 'boolean') return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`
  }).join('') + '</row>').join('') + '</sheetData></worksheet>'
  const entries = {
    '[Content_Types].xml': declaration + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': declaration + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': declaration + `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="数据" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': declaration + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': sheet,
  }
  const path = await outputFile(directory, String(filename).replace(/(?:\.xlsx)?$/i, '.xlsx'))
  await writeFile(path, zipSync(Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, strToU8(value)]))), { flag: 'wx' })
  const bytes = await readFile(path)
  const saved = unzipSync(bytes)
  if (Object.entries(entries).some(([key, value]) => !saved[key] || strFromU8(saved[key]) !== value)) throw new Error('Excel 文件回读校验失败')
  return { path, rowCount: rows.length, columnCount: headers.length, bytes: bytes.length, verified: true }
}
