const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
async function serveWeb(directory,apiUrl){
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://127.0.0.1');
      if(req.headers.origin&&req.headers.origin!==`http://127.0.0.1:${server.address().port}`){res.writeHead(403).end();return;}
      if(url.pathname.startsWith('/api/')){
        const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>(/^\/api\/ai\/zhifu\/skillStore\/(upload|resubmit)$/.test(url.pathname)?51*1024*1024:2_000_000)){res.writeHead(413).end();return;}chunks.push(chunk);}
        const headers={'Content-Type':req.headers['content-type']||'application/json','User-Agent':req.headers['user-agent']||'Super Power Browser'};if(req.headers.authorization)headers.Authorization=req.headers.authorization;
        const response=await fetch(new URL(url.pathname+url.search,apiUrl),{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks),signal:AbortSignal.timeout(40000)});
        res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'}).end(Buffer.from(await response.arrayBuffer()));return;
      }
      const requested=path.resolve(directory,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
      if(!requested.startsWith(path.resolve(directory)+path.sep)){res.writeHead(403).end();return;}
      const data=await fs.readFile(requested);res.writeHead(200,{'Content-Type':types[path.extname(requested)]||'application/octet-stream','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'"}).end(data);
    }catch(error){res.writeHead(error.code==='ENOENT'?404:502,{'Content-Type':'application/json'}).end(JSON.stringify({message:'本地页面或后端连接不可用'}));}
  });
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  return {server,url:`http://127.0.0.1:${server.address().port}`};
}
module.exports={serveWeb};
