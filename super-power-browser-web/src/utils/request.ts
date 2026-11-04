export const token=()=>sessionStorage.getItem('spb-token')||'';
export async function request<T=any>(path:string,options:RequestInit={}):Promise<T>{
  const response=await fetch(`/api${path}`,{...options,headers:{'Content-Type':'application/json',...(token()?{Authorization:`Bearer ${token()}`} : {}),...options.headers}});
  if(response.status===401){sessionStorage.removeItem('spb-token');window.location.hash='/login';}
  const raw=await response.text();const data=raw?JSON.parse(raw):null;
  if(!response.ok)throw new Error(data?.message||`请求失败（${response.status}）`);
  return data;
}
export const post=(path:string,body:unknown={})=>request(path,{method:'POST',body:JSON.stringify(body)});
export const patch=(path:string,body:unknown)=>request(path,{method:'PATCH',body:JSON.stringify(body)});
export const put=(path:string,body:unknown)=>request(path,{method:'PUT',body:JSON.stringify(body)});
export const remove=(path:string)=>request(path,{method:'DELETE'});
export const queryString=(values:Record<string,unknown>)=>new URLSearchParams(Object.entries(values).map(([key,value])=>[key,String(value)])).toString();
