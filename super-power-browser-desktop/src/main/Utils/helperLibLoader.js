const path=require('node:path');
const koffi=require('koffi');
/** TODO(runtime-replacement): 当前沿用原生 Help/Free 协议；取得源码后替换。 */
class HelperLibLoader {
  constructor(resources){this.resources=resources;}
  call(name,input){
    if(!this.help){
      if(process.platform!=='win32'||process.arch!=='x64')throw new Error('当前迁移包仅验证 Windows x64 原生库');
      this.library=koffi.load(path.join(this.resources,'win/x64/ruxbrowser_helper.dll'));
      this.help=this.library.func('Help','void *',['char *']);
      this.free=this.library.func('Free','void',['void *']);
    }
    const pointer=this.help(Buffer.from(JSON.stringify({interface:name,input})+'\0','utf8'));
    if(!pointer)throw new Error('原生内核助手未返回结果');
    let result;
    try{result=JSON.parse(koffi.decode(pointer,'char',-1));}finally{this.free(pointer);}
    if(!result.success)throw new Error(`原生内核助手 ${name} 执行失败，请检查内核授权与版本`);
    return result;
  }
}
module.exports={HelperLibLoader};
