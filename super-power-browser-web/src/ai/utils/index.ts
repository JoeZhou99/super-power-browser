import {downloadWorkbook} from '@/utils/workbook';
export const openExternal = (url: string) => (window as any).localflow?.openExternal(url);
export function importBilling(filename: string, html: string, _sheet?: string) {
  const document = new DOMParser().parseFromString(`<table>${html}</table>`, 'text/html');
  const lines = [...document.querySelectorAll('tr')].map(row => [...row.querySelectorAll('th,td')].map(cell => cell.textContent || ''));
  const headers = lines.shift() || [];
  return downloadWorkbook(filename + '.xlsx', lines.map(line => Object.fromEntries(line.map((value, index) => [String(index), value]))),
    Object.fromEntries(headers.map((value, index) => [String(index), value])));
}
