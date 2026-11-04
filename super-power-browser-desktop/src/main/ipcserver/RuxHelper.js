const path=require('node:path');
class RuntimeHelper {
  constructor(helper){this.helper=helper;}
  verify(credential){this.helper.call('token_verify',JSON.stringify(credential));}
  write(profile,config,version){
    const result=this.helper.call('init_json_write',{browser_version:Number(version),path:profile+path.sep,data:JSON.stringify(config)});
    if(!result.param)throw new Error('原生助手没有返回内核数据路径参数');
    return result.param;
  }
}
module.exports={RuntimeHelper};
