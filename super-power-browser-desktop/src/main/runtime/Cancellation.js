function cancelled(){const error=new Error('已取消打开店铺');error.name='AbortError';return error;}
function check(signal){if(signal?.aborted)throw signal.reason||cancelled();}
function waitFor(value,signal){
  return new Promise((resolve,reject)=>{
    let done=false;
    const finish=(error,result)=>{if(done)return;done=true;signal?.removeEventListener('abort',abort);error?reject(error):resolve(result);};
    const abort=()=>finish(signal.reason||cancelled());
    Promise.resolve(value).then(result=>finish(null,result),error=>finish(error));
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  });
}
function pause(ms,signal){
  let timer;
  return waitFor(new Promise(resolve=>{timer=setTimeout(resolve,ms);}),signal).finally(()=>clearTimeout(timer));
}
module.exports={cancelled,check,waitFor,pause};
