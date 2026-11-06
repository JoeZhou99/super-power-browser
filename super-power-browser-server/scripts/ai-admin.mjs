import {readFile} from 'node:fs/promises';
const [kind,action,arg,decision,...reason]=process.argv.slice(2);
const base=new URL(process.env.SPB_API_URL||'http://127.0.0.1:18080');
if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['127.0.0.1','localhost'].includes(base.hostname)))throw Error('远程 API 必须使用 HTTPS');
async function request(path,method='GET',body,token=process.env.SPB_ADMIN_TOKEN){
 const response=await fetch(new URL(path,base),{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 const data=await response.json();if(!response.ok)throw Error(data.message||`HTTP ${response.status}`);return data;
}
try{
 let token=process.env.SPB_ADMIN_TOKEN;
 if(!token){if(!process.env.ADMIN_USERNAME||!process.env.ADMIN_PASSWORD)throw Error('设置 SPB_ADMIN_TOKEN，或 ADMIN_USERNAME 和 ADMIN_PASSWORD');token=(await request('/api/auth/login','POST',{username:process.env.ADMIN_USERNAME,password:process.env.ADMIN_PASSWORD})).token;}
 let result;
 if(['models','plans'].includes(kind)&&action==='set')result=await request('/api/ai/admin/'+kind,'PUT',JSON.parse(await readFile(arg,'utf8')),token);
 else if(kind==='plans'&&action==='disable')result=await request('/api/ai/admin/plans/'+encodeURIComponent(arg),'DELETE',undefined,token);
 else if(kind==='coupons'&&action==='issue')result=await request('/api/ai/admin/coupons','POST',JSON.parse(await readFile(arg,'utf8')),token);
 else if(kind==='skills'&&action==='pending')result=await request('/api/ai/admin/skills','GET',undefined,token);
 else if(kind==='skills'&&action==='review'&&['approve','reject'].includes(decision))result=await request('/api/ai/admin/skills/'+encodeURIComponent(arg)+'/review','POST',{approved:decision==='approve',reason:reason.join(' ')},token);
 else throw Error('用法：models set <JSON文件> | plans set <JSON文件> | plans disable <ID> | coupons issue <JSON文件> | skills pending | skills review <ID> approve/reject [说明]');
 console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
