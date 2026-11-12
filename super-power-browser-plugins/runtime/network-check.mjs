// Poll one desktop-owned check. A status request never creates another probe.
export async function pollNetworkInfo({send, progress=()=>{}, current=()=>true, retry=false,
  now=Date.now, wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)), timeoutMs=75000}) {
  const started=now();
  for(let first=true;;first=false) {
    if(!current())return null;
    const result=await send({type:'sp:network-info',...(first&&retry?{retry:true}:{})});
    if(!current())return null;
    if(!result||typeof result!=='object')throw new Error('无法读取检测状态，请重新检测');
    progress(result);
    if(result.pending!==true)return result;
    if(now()-started>=timeoutMs)throw new Error('线路检测等待超时，请重新检测');
    await wait(Math.min(1000,timeoutMs-(now()-started)));
  }
}
