import ExcelJS from 'exceljs';

export const deviceColumns={host:'设备地址',port:'端口',region:'设备地域',protocol:'设备协议类型',mapIp:'映射IP',mapPort:'映射端口',username:'设备登录账号',password:'设备登录密码',encryption:'加密方法',transportProtocol:'协议',protocolParameter:'协议参数',obfs:'混淆方法',obfsParameter:'混淆参数',protocolFamily:'IP类型 \n1-IPV4 2-IPV6'};
const compact=(value:string)=>value.replace(/\s/g,'');
export async function readOwnDevices(file:File){
  if(!/\.xlsx$/i.test(file.name))throw new Error('请选择 .xlsx 模板文件');
  if(file.size>10*1024*1024)throw new Error('文件大小不能超过 10 MB');
  const book=new ExcelJS.Workbook();await book.xlsx.load(await file.arrayBuffer());
  const sheet=book.worksheets[0];if(!sheet)throw new Error('文件中没有工作表');
  let header=0;const keys:Record<number,string>={};
  const aliases:Record<string,string>={设备ID:'id','设备ID（编辑必填，新增留空）':'id',设备名称:'name',代理账号:'username',代理密码:'password',设备信息:'host',备注:'remark',网络类型:'webType'};
  for(let index=1;index<=3;index++){
    const row=sheet.getRow(index),texts=(row.values as unknown[]).map((_,i)=>compact(row.getCell(i).text));
    if(!texts.includes('端口')||!texts.some(t=>['设备地址','设备信息','host'].includes(t)))continue;
    header=index;const modern=texts.includes('代理账号')||texts.includes('设备名称');
    row.eachCell((cell,column)=>{const label=compact(cell.text);const key=modern&&label==='协议'?'protocol':Object.entries(deviceColumns).find(([,name])=>compact(name)===label)?.[0]||aliases[label]||(Object.keys(deviceColumns).includes(label)?label:'');if(key)keys[column]=key;});break;
  }
  if(!header||!Object.values(keys).includes('protocol'))throw new Error('模板字段不完整，请下载模板后填写');
  const rows:any[]=[];
  sheet.eachRow((row,index)=>{
    if(index<=header)return;
    const data:any={};for(const [column,key] of Object.entries(keys))data[key]=row.getCell(Number(column)).text.trim();
    if(!Object.values(data).some(Boolean))return;
    data.rowNumber=index;data.port=Number(data.port);data.mapPort=Number(data.mapPort||0);
    data.protocol=String(data.protocol||'').toLowerCase();
    data.protocolFamily=Number(data.protocolFamily||(String(data.host).includes(':')?2:1));
    if(data.webType)data.webType=['动态','1'].includes(data.webType)?1:2;
    rows.push(data);
  });
  if(!rows.length||rows.length>300)throw new Error('每次请导入 1—300 台设备');
  return rows;
}
export async function downloadOwnDeviceTemplate(){
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('自有设备');
  sheet.mergeCells('A1:N1');sheet.getCell('A1').value='请勿增删字段。设备地址、端口、设备地域、设备协议类型为必填，最多 300 行。支持 HTTP、HTTPS、SOCKS5。相同地址和端口更新已有自有设备，密码留空保留原密码。';
  sheet.getRow(1).height=55;sheet.getCell('A1').alignment={wrapText:true,vertical:'middle'};
  sheet.addRow(Object.values(deviceColumns));sheet.getRow(2).height=36;
  sheet.getRow(2).eachCell((cell,index)=>{cell.font={bold:true,color:{argb:index<=4?'FFDC2626':'FF334155'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEFF6FF'}};cell.alignment={vertical:'middle',wrapText:true};});
  sheet.columns.forEach((column,index)=>{column.width=index===0?24:18;});
  sheet.views=[{state:'frozen',ySplit:2}];
  const url=URL.createObjectURL(new Blob([await book.xlsx.writeBuffer() as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const link=document.createElement('a');link.href=url;link.download='importIpTemplate.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
