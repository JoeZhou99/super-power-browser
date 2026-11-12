// All uploaded proxies must prove connectivity through this shop's forwarding
// proxy. Static public endpoints match their IP; local gateways and dynamic
// proxies require a public exit.
export function networkPresentation(source){
  const replace=(before,after)=>{if(!source.includes(before))throw new Error('环境检测展示适配点发生变化：'+before.slice(0,70));source=source.replaceAll(before,after);};
  // The legacy comparison allowed two retries when maxRetryNum was one.
  // The desktop owns bounded candidate selection; the page never starts its own
  // automatic retry chain while the same desktop attempt is still pending.
  replace('this.maxRetryTimes > this.maxRetryNum','this.maxRetryTimes >= this.maxRetryNum');
  replace('ipInfo: {},','ipInfo: {},\n        spNetwork: {ip:"正在获取…",pending:false,message:"",completed:false,retry:false,sequence:0,disposed:false},');
  replace('      checkIpEnd(e) {\n        if (e) {','      checkIpEnd(e) {\n        if (this.initJson?.desktopProtocol && !this.checkIp) return;\n        if (e) {');
  replace('i == "1" ? this.checkIpHandle()', '(this.initJson?.desktopProtocol || i == "1") ? this.checkIpHandle()');
  replace('    beforeUnmount() {','    beforeUnmount() {\n      this.spNetwork.disposed=true;this.spNetwork.sequence++;');
  replace('          this.spCheckSetupError = "";','          this.spCheckSetupError = "";\n          this.spNetwork.completed=false;');
  replace('      async handleManualSwitchTransit(e, t) {','      async handleManualSwitchTransit(e, t) {\n        if(this.spNetwork.pending||this.spCheckSetupPending)return false;\n        this.spNetwork.completed=false;this.spNetwork.sequence++;');
  for(const signature of ['async handleTestSingleTransit(e, t) {','async testAllTransitLines() {','async setRelayAutomatic(automatic) {'])
    replace(signature,signature+'\n        if(this.spNetwork.pending||this.spCheckSetupPending)return;');
  const start=source.indexOf('      async checkIpHandle() {'),end=source.indexOf('\n    },\n  });',start);
  if(start<0||end<0)throw new Error('环境检测方法适配点发生变化');
  source=source.slice(0,start)+`      spRetry() {
        if(this.spNetwork.pending||this.loadIp||this.spCheckSetupPending||this.isTransitLatencyTesting||this.switchingIndex!==-1)return;
        this.maxRetryTimes=0;this.reqLimit=0;this.spNetwork.completed=false;this.spNetwork.retry=true;
        return this.getMallInfo();
      },
      spCheckStatus(kind) {
        const ua=kind==="ua",pending=ua?this.loadUa:this.loadIp;
        const success=!pending&&(ua?this.checkUa:this.checkIp);
        const checked=ua?this.spUaChecked:this.spIpChecked;
        const failed=!pending&&!success&&checked;
        return {pending,success,failed,
          color:pending?"#3370ff":success?"#07c255":failed?"#f40009":"#909399",
          text:pending?this.$t("popup.loading"):success?this.$t("popup.success"):failed?this.$t("popup.fail"):"未检测"};
      },
      async checkIpHandle() {
        if(this.spNetwork.pending||this.spNetwork.completed||this.spNetwork.disposed)return;
        const sequence=++this.spNetwork.sequence,current=()=>!this.spNetwork.disposed&&sequence===this.spNetwork.sequence;
        const retry=this.spNetwork.retry;this.spNetwork.retry=false;
        this.spNetwork.pending=true;this.spNetwork.ip="正在获取…";this.checkIp=false;this.loadIp=true;
        this.checkIpEnd=false;this.spNetwork.message="正在连接代理并验证出口…";
        chrome.runtime.sendMessage({type:'sp:local-network-info'}).then(local=>{
          if(local?.available)this.localGeo=[local.country_name,local.region_name,local.city_name].filter(Boolean).join(" ")||local.ip||"暂未获取";
        }).catch(()=>{});
        let info;
        try{
          info=await pollNetworkInfo({send:message=>chrome.runtime.sendMessage(message),retry,current,
            progress:value=>{this.spNetwork.message=value.message||(value.pending?"正在连接代理并验证出口…":"");}});
          if(!current()||!info)return;
          if(info.allowed===true&&info.exit?.available===true&&typeof info.exit.ip==="string"&&info.exit.ip){
            const confirmed=await chrome.runtime.sendMessage({type:'sp:network-complete',attemptId:info.attemptId});
            if(confirmed?.allowed!==true)info={...info,allowed:false,message:confirmed?.message||"检测确认失败，请重新检测"};
          }else info={...info,allowed:false};
        }catch{info={allowed:false,message:"线路检测未完成，请重新检测"};}
        if(!current())return;
        this.spNetwork.pending=false;
        this.spNetwork.completed=true;
        this.spNetwork.attemptId=info?.attemptId;
        this.spIpChecked=true;
        this.spNetwork.ip=info?.exit?.available?info.exit.ip:"暂未获取";
        this.spNetwork.message=info?.message||"代理出口检测失败，请检查代理后重试";
        if(info?.allowed===true){this.setCheckResult(info.exit.ip);}
        else{this.loadIp=false;this.checkIp=false;this.switchingIndex=-1;this.checkResult=info?.message||"代理出口检测失败，请检查代理后重试";this.checkIpEnd=true;}
      },`+source.slice(end);
  replace('this.titleIP = a + "(" + d + ")"','this.titleIP = a + (d ? "(" + d + ")" : "")');
  replace('o(e.getShowName(e.mall)) +\n                            "(" +\n                            o(e.mall.has_one_agent_ip && e.mall.has_one_agent_ip.area_name) +\n                            ") "','o(e.getShowName(e.mall)) + (e.mall.has_one_agent_ip?.area_name ? "(" + o(e.mall.has_one_agent_ip.area_name) + ")" : "")');
  replace('o(e.ipInfo.ip)','o(e.spNetwork.ip)');
  replace('title: e.ipInfo.ip','title: e.spNetwork.ip');
  replace('localGeo: ""','localGeo: "暂未获取"');
  replace('this.localGeo = s.country_name + " " + s.region_name + " " + s.city_name','this.localGeo = [s.country_name,s.region_name,s.city_name].filter(Boolean).join(" ") || s.ip || "暂未获取"');
  replace('async openMall() {','async openMall() {\n        if(!this.checkIp||!this.checkUa){y.warning("请先通过代理出口与环境检测");return;}');
  replace('return this.checkAll ? this.$t("check.content.wieh_login") : this.checkResult;','return this.spCheckSetupError || (this.checkAll ? this.$t("check.content.wieh_login") : (!this.checkIp&&this.spNetwork.message ? this.spNetwork.message : this.checkResult));');
  replace('                          e.showOpenMethodSettingButton','                          p(l,{disabled:e.spNetwork.pending||e.loadIp||e.spCheckSetupPending||e.isTransitLatencyTesting||e.switchingIndex!==-1,onClick:()=>e.spRetry()},{default:h(()=>[P("重新检测")]),_:1},8,["disabled"]),\n                          e.showOpenMethodSettingButton');
  // The original cards treated every false boolean as a failed test. A setup
  // failure happens before either check runs, so render an explicit idle state.
  const cardsStart=source.indexOf('                n("div", It, ['),cardsEnd=source.indexOf('                n("div", $t, [',cardsStart);
  if(cardsStart<0||cardsEnd<0)throw new Error('环境检测状态卡片适配点发生变化');
  source=source.slice(0,cardsStart)+`                n("div", It, ["ip","ua","line"].map(kind=>{
                  const status=e.spCheckStatus(kind);
                  return n("div",{key:kind,class:T(["detectItemStyle",status.success?"successItemStyle":status.failed?"errorItemStyle":""])},[
                    n("div",Bt,[
                      p(u,{size:24,color:status.color,class:status.pending?"is-loading":""},{default:h(()=>[p(status.success?I:status.failed?B:C)]),_:1},8,["color","class"]),
                      kind==="ip"?Rt:kind==="ua"?Dt:v("",true),
                    ]),
                    n("div",null,[
                      n("div",null,o(e.$t(kind==="ip"?"check.content.ip_testing":kind==="ua"?"check.content.hunji_testing":"check.content.line_testing")),1),
                      n("div",{class:T(["textStyle",status.success?"styleSuccess":status.failed?"styleError":""])},o(status.text),3),
                    ]),
                  ],2);
                })),
`+source.slice(cardsEnd);
  return 'import {pollNetworkInfo} from "../runtime/network-check.mjs";\n'+source;
}
