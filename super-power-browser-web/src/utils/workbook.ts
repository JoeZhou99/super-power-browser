import ExcelJS from 'exceljs';
export async function downloadWorkbook(name:string,rows:any[],columns:Record<string,string>){
  const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('数据');
  sheet.columns=Object.entries(columns).map(([key,header])=>({key,header,width:26}));
  sheet.addRows(rows);sheet.getRow(1).font={bold:true};
  const data=await workbook.xlsx.writeBuffer();
  const url=URL.createObjectURL(new Blob([data as any],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function readWorkbook(file:File,columns:Record<string,string>){
  if(file.size>10*1024*1024)throw new Error('文件大小不能超过 10 MB');
  let rows:any[];
  if(file.name.endsWith('.json'))rows=JSON.parse(await file.text());
  else{
    const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await file.arrayBuffer());
    const sheet=workbook.worksheets[0];if(!sheet)throw new Error('文件中没有工作表');
    const keys:Record<number,string>={};sheet.getRow(1).eachCell((cell,index)=>{const key=Object.keys(columns).find(k=>columns[k]===cell.text||k===cell.text);if(key)keys[index]=key;});
    if(!Object.keys(keys).length)throw new Error('没有识别到模板字段，请下载并使用导入模板');
    rows=[];sheet.eachRow((row,index)=>{if(index===1)return;const data:Record<string,unknown>={};for(const [column,key] of Object.entries(keys))data[key]=row.getCell(Number(column)).text;if(Object.values(data).some(Boolean))rows.push(data);});
  }
  if(!Array.isArray(rows)||!rows.length||rows.length>200)throw new Error('每次请导入 1—200 条记录');return rows;
}
