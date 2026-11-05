class ApiClient {
  constructor(base){this.base=base;this.token='';}
  async request(path,options={}){
    if(!this.token)throw new Error('请先登录');
    const timeout=AbortSignal.timeout(35000),signal=options.signal?AbortSignal.any([options.signal,timeout]):timeout;
    const response=await fetch(new URL('/api'+path,this.base),{method:options.method||'GET',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},body:options.body===undefined?undefined:JSON.stringify(options.body),signal,redirect:'error'});
    const raw=await response.text(),body=raw?JSON.parse(raw):{};
    if(!response.ok){const error=new Error(body.message||'后端请求失败');error.status=response.status;throw error;}
    return body;
  }
}
module.exports={ApiClient};
