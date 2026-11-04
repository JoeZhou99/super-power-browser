// All uploaded proxies must prove connectivity through this shop's forwarding
// proxy. Static public endpoints match their IP; local gateways and dynamic
// proxies require a public exit. No legacy own-device bypass remains.
export function networkPresentation(source){
  const replace=(before,after)=>{if(!source.includes(before))throw new Error('环境检测展示适配点发生变化：'+before.slice(0,70));source=source.replaceAll(before,after);};
  replace('ipInfo: {},','ipInfo: {},\n        spNetwork: {ip:"正在获取…",pending:false,message:""},');
  const start=source.indexOf('      async checkIpHandle() {'),end=source.indexOf('\n    },\n  });',start);
  if(start<0||end<0)throw new Error('环境检测方法适配点发生变化');
  source=source.slice(0,start)+`      spRetry() {
        if(this.spNetwork.pending||this.loadIp)return;
        this.maxRetryTimes=0;this.checkIp=false;this.checkIpEnd=false;this.checkUa=false;this.loadIp=true;
        this.checkUserAgent();this.startProxy();
      },
      async checkIpHandle() {
        if(this.spNetwork.pending)return;
        this.spNetwork.pending=true;this.spNetwork.ip="正在获取…";this.checkIp=false;this.loadIp=true;
        let info;
        try{info=await chrome.runtime.sendMessage({type:'sp:network-info'});}catch{}
        this.spNetwork.pending=false;
        this.spNetwork.ip=info?.exit?.available?info.exit.ip:"暂未获取";
        this.spNetwork.message=info?.message||"代理出口检测失败，请检查代理后重试";
        if(info?.allowed===true){this.setCheckResult(info.exit.ip);}
        else{this.loadIp=false;this.checkIp=false;this.checkResult=info?.message||"代理出口检测失败，请检查代理后重试";this.checkIpEnd=true;}
      },`+source.slice(end);
  replace('this.titleIP = a + "(" + d + ")"','this.titleIP = a + (d ? "(" + d + ")" : "")');
  replace('o(e.getShowName(e.mall)) +\n                            "(" +\n                            o(e.mall.has_one_agent_ip && e.mall.has_one_agent_ip.area_name) +\n                            ") "','o(e.getShowName(e.mall)) + (e.mall.has_one_agent_ip?.area_name ? "(" + o(e.mall.has_one_agent_ip.area_name) + ")" : "")');
  replace('o(e.ipInfo.ip)','o(e.spNetwork.ip)');
  replace('title: e.ipInfo.ip','title: e.spNetwork.ip');
  replace('localGeo: ""','localGeo: "暂未获取"');
  replace('this.localGeo = s.country_name + " " + s.region_name + " " + s.city_name','this.localGeo = [s.country_name,s.region_name,s.city_name].filter(Boolean).join(" ") || s.ip || "暂未获取"');
  replace('async openMall() {','async openMall() {\n        if(!this.checkIp||!this.checkUa){y.warning("请先通过代理出口与环境检测");return;}');
  replace('return this.checkAll ? this.$t("check.content.wieh_login") : this.checkResult;','return this.checkAll ? this.$t("check.content.wieh_login") : (!this.loadIp&&!this.checkIp&&this.spNetwork.message ? this.spNetwork.message : this.checkResult);');
  replace('                          e.showOpenMethodSettingButton','                          p(l,{disabled:e.spNetwork.pending||e.loadIp,onClick:()=>e.spRetry()},{default:h(()=>[P("重新检测")]),_:1},8,["disabled"]),\n                          e.showOpenMethodSettingButton');
  replace('n("div", Nt, [','n("div", {class:T(["detectItemStyle",e.checkIp?"successItemStyle":"errorItemStyle"])}, [');
  replace('p(u, { size: 24, color: "#07c255" }, { default: h(() => [p(I)]), _: 1 })','p(u, { key:e.checkIp?"network-pass":"network-fail", size: 24, color: e.checkIp?"#07c255":"#f40009" }, { default: h(() => [p(e.checkIp?I:B)]), _: 1 },8,["color"])');
  replace('n("div", Ft, o(e.$t("popup.success")), 1)','n("div", {class:T(["textStyle",e.checkIp?"styleSuccess":"styleError"])}, o(e.loadIp?e.$t("popup.loading"):e.checkIp?e.$t("popup.success"):e.$t("popup.fail")), 3)');
  return source;
}
