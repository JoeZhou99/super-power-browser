export const yuan=(cents:unknown)=>cents==null?'—':(Number(cents)/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
export const date=(value:unknown)=>value?new Date(String(value)).toLocaleString('zh-CN',{hour12:false}):'—';
export const channelNames:Record<string,string>={balance:'账户余额',ali:'支付宝',wx:'微信支付',cmb:'聚合扫码支付'};
