package com.superpower.browser.extension;

import com.superpower.browser.environment.EnvironmentService;
import com.superpower.browser.device.DeviceAccess;
import com.superpower.browser.shared.*;
import java.net.URI;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Compatibility boundary for the recovered helpers. All state belongs to the new database. */
@Service
public class ExtensionService {
    private final ExtensionDocuments documents;private final EnvironmentService shops;private final DeviceAccess devices;
    public ExtensionService(ExtensionDocuments documents,EnvironmentService shops,DeviceAccess devices) {this.documents=documents;this.shops=shops;this.devices=devices;}
    public static final Map<String,String> ROUTES;
    static {
        Map<String,String> m=new LinkedHashMap<>();
        String[][] routes={
            {"getUserInfo","user/getUserInfo"},{"getUserWebPageList","webpage/getBindWebpageRuleV2"},
            {"getInfoByKey","sundry/getInfoByKey"},{"getInfoByKeys","sundry/getInfoByKeys"},{"uploadStatistics","statistics/click"},
            {"getTagPages","bindMall/getTagPages"},{"getStaticByIp","mall/bindMall/getAcceleratedDomain"},{"getCurrency","common/currency"},{"getTime","common/time"},
            {"getAdsRecommendBySite","safe/actionLog/GetAdsRecommendBySite"},{"getMallInfo","mall/bindMall/getMall"},
            {"saveMallJumpMethod","bindMall/updateJumpMethod"},{"saveMallJumpUrls","bindMall/updateJumpUrls"},{"getWebsiteList","ads/website/getWebsiteList"},{"addTagPages","bindMall/addTagPages"},
            {"getFirewall","mall/bindMall/getFirewall"},{"getFirewallNew","mall/bindMall/getFirewallV2"},{"getDirectList","mall/bindMall/blackList"},
            {"getPluginInfo","ads/plugin/getMallPluginInfo"},{"getPluginInfoByChromeId","ads/plugin/getPluginInfo"},{"getPluginList","ads/plugins/getMallList"},
            {"getBookmark","bookmark/showBookmark"},{"inBlackList","mall/bindMall/inBlackList"},{"getAuditStatus","epcheck/getAuditStatus"},
            {"getAuthenticationCode","bindMall/getAuthenticationCode"},{"setAuthenticationCode","bindMall/setAuthenticationCode"},{"refreshToken","user/refreshToken"},{"saveBookmark","bookmark/saveBookmark"},
            {"applyWhite","white/apply"},{"applyWhiteV2","white/applyV2"},{"setCookie","bindMall/setCookie"},{"reviewReason","white/reviewReason"},{"reviewReasonV2","white/reviewReasonV2"},
            {"decryptData","common/decryptData"},{"reportVerification","bindMall/reportVerification"},{"reportCheckForcedOffline","bindMall/checkForcedOffline"},{"setAccessStatus","bindMall/setAccessStatus"},
            {"getWebpageList","webpage/list"},{"getWebpageGroupList","webpage/groupList"},{"saveWebpage","webpage/save"},{"batchSaveUrl","domainUrl/batchSave"},
            {"savePasskey","bindMall/savePasskey"},{"listPasskey","bindMall/listPasskey"},{"transferSpeed","mall/bindMall/transferSpeed"},{"updateMainTransfer","mall/bindMall/updateMainTransfer"},
            {"createAccountData","bindMall/createBindMallsAccountFilling"},{"editAccountData","bindMall/updateBindMallsAccountFilling"},{"removeAccountData","bindMall/delBindMallsAccountFilling"},{"getMallsAccountFillingList","bindMall/getBindMallsAccountFillingList"},
            {"addCustomSiteInfo","siteInfo/addCustomSiteInfo"},{"getSiteTreeByCategories","siteInfo/getSiteTreeByCategoriesV2"},{"delCustomSiteInfo","siteInfo/delCustomSiteInfo"}
        };
        for(var r:routes)m.put("/api/v1/"+r[1],r[0]);ROUTES=Collections.unmodifiableMap(m);
    }
    public Map<String,Object> capabilities() {
        var methods=new ArrayList<>(ROUTES.values());methods.add("getWhiteList");
        return Map.of("protocol","super-power-browser-extension/1","ready",true,"nativeBridge",true,"methods",methods,"pluginDistribution","bundled","lineSwitching",false,"fullProfileSync",false,"cookieSync",true);
    }
    public Map<String,Object> bootstrap(ExtensionSessions.Context c) {
        return Map.of("cookie",documents.get(c.environmentId(),"settings","cookie",""),"environmentId",c.environmentId());
    }
    private void scope(ExtensionSessions.Context c,Map<String,Object> b) {
        for(String key:List.of("mallId","mall_id","storeId","browserId","bind_mall_id"))
            if(b.containsKey(key)&&!text(b,key).isBlank())require(text(b,key).equals(c.environmentId()),403,"插件不能访问其他店铺");
        if(b.containsKey("mallIds")) {
            Object ids=b.get("mallIds");
            String value=ids instanceof List<?>?json(ids):String.valueOf(ids);
            require(value.equals(c.environmentId())||value.equals(json(List.of(c.environmentId()))),403,"插件不能访问其他店铺");
        }
    }
    public Object call(ExtensionSessions.Context c,String method,Map<String,Object> b) {
        scope(c,b);String env=c.environmentId();
        Object result=switch(method) {
            case "getUserInfo" -> Map.of("id",c.actor().id(),"username",c.actor().username(),"name",c.actor().username(),"level",c.actor().owner()?1:2,"permissions",c.actor().permissions());
            case "getMallInfo" -> mall(c);
            case "refreshToken" -> Map.of("token",c.token(),"access_token",c.token());
            case "getInfoByKey" -> setting(env,text(b,"key"));
            case "getInfoByKeys" -> settings(env,b.get("keys"));
            case "getTime" -> Map.of("time",Instant.now().getEpochSecond(),"timestamp",System.currentTimeMillis());
            case "getCurrency" -> List.of();
            case "getUserWebPageList" -> documents.get(env,"settings","webpageRules",List.of());
            case "getStaticByIp" -> Map.of("staticResource",List.of(),"cdnAcceleratedDomain",List.of(),"directResource",List.of());
            case "getTagPages" -> Map.of("tab_pages",documents.get(env,"settings","tagPages",List.of()));
            case "addTagPages" -> save(env,"settings","tagPages",b.getOrDefault("tag_pages",b.getOrDefault("tagPages",List.of())));
            case "saveMallJumpMethod" -> save(env,"settings","jumpMethod",b.getOrDefault("jump_method",b.getOrDefault("jumpMethod",1)));
            case "saveMallJumpUrls" -> save(env,"settings","jumpUrls",b.getOrDefault("jump_urls",b.getOrDefault("jumpUrls",List.of())));
            case "getWebsiteList" -> Map.of("websiteList",documents.list(env,"websites"));
            case "getAdsRecommendBySite" -> documents.list(env,"recommendations");
            case "getFirewall","getFirewallNew" -> firewall(c);
            case "getDirectList" -> documents.get(env,"settings","directList",List.of());
            case "getPluginList" -> Map.of("list",documents.list(env,"plugins"));
            case "getPluginInfo","getPluginInfoByChromeId" -> plugin(env,b);
            case "getBookmark" -> documents.get(env,"settings","bookmark",Map.of("bookmarkTree","[]","bookmarkInitTree",List.of()));
            case "saveBookmark" -> save(env,"settings","bookmark",Map.of("bookmarkTree",b.getOrDefault("bookmark","[]"),"bookmarkInitTree",List.of()));
            case "inBlackList" -> documents.get(env,"settings","blockedDomains",List.of());
            case "getAuditStatus" -> Map.of("status",0,"audit_status",0);
            case "getAuthenticationCode" -> documents.get(env,"settings","authenticationCode",Map.of());
            case "setAuthenticationCode" -> save(env,"settings","authenticationCode",b);
            case "setCookie" -> saveCookie(env,b);
            case "decryptData" -> Map.of("plainText",ExtensionCrypto.decode(required(b,"cipherText",100000)));
            case "getWebpageList" -> Map.of("list",documents.list(env,"webpages"),"total",documents.list(env,"webpages").size());
            case "getWebpageGroupList" -> documents.list(env,"webpageGroups");
            case "saveWebpage" -> saveRecord(env,"webpages",b,false);
            case "batchSaveUrl" -> save(env,"settings","openedUrls",b);
            case "listPasskey" -> Map.of("list",documents.list(env,"passkeys"));
            case "savePasskey" -> savePasskey(env,b);
            case "getMallsAccountFillingList" -> accounts(c);
            case "createAccountData" -> accountSave(c,b,false);
            case "editAccountData" -> accountSave(c,b,true);
            case "removeAccountData" -> remove(c,"accounts",b);
            case "getSiteTreeByCategories" -> sites(c);
            case "addCustomSiteInfo" -> {c.actor().allow("shop.edit");var site=new LinkedHashMap<>(b);String link=required(b,"link",2000);URI uri=URI.create(link);require(Set.of("http","https").contains(uri.getScheme())&&uri.getHost()!=null,400,"站点地址不合法");site.put("name",uri.getHost());site.put("label",uri.getHost());yield saveRecord(env,"sites",site,false);}
            case "delCustomSiteInfo" -> remove(c,"sites",b);
            case "applyWhite","applyWhiteV2" -> saveRecord(env,"whitelistApplications",new LinkedHashMap<>(Map.of("request",b,"status","pending","createdAt",Instant.now().toString())),false);
            case "reviewReason","reviewReasonV2" -> documents.get(env,"whitelistApplications",required(b,"id",100),Map.of());
            case "reportCheckForcedOffline" -> Map.of("forcedOffline",false); // Session and grant checked before every call.
            case "updateMainTransfer" -> throw new BusinessException(409,"当前设备没有供应商提供的备用线路");
            case "uploadStatistics","reportVerification","setAccessStatus","transferSpeed" -> save(env,"reports",method,Map.of("data",b,"receivedAt",Instant.now().toString()));
            default -> throw new BusinessException(404,"未实现的插件接口："+method);
        };
        return Map.of("errorCode",0,"data",result,"message","success");
    }
    private Object save(String env,String collection,String id,Object value) {documents.put(env,collection,id,value);return Map.of("saved",true);}
    private Object saveCookie(String env,Map<String,Object> b) {
        Object cookie=b.getOrDefault("cookie","");String jsonCookie=cookie instanceof String?(String)cookie:json(cookie);
        if(!jsonCookie.isEmpty())require(JSON.readValue(jsonCookie,Object.class) instanceof List<?>,400,"Cookie 必须为数组");
        return save(env,"settings","cookie",jsonCookie);
    }
    private Object saveRecord(String env,String collection,Map<String,Object> b,boolean existing) {
        String key=text(b,"id");if(key.isBlank())key=id();
        if(existing)require(documents.get(env,collection,key,null)!=null,404,"记录不存在");
        var record=new LinkedHashMap<>(b);record.put("id",key);documents.put(env,collection,key,record);return record;
    }
    private Object remove(ExtensionSessions.Context c,String collection,Map<String,Object> b) {c.actor().allow("shop.edit");documents.remove(c.environmentId(),collection,required(b,"id",100));return Map.of("deleted",true);}
    private Object savePasskey(String env,Map<String,Object> body) {
        var record=new LinkedHashMap<>(body);
        if(text(record,"id").isBlank())record.put("id",ExtensionSessions.hash(json(body.getOrDefault("passkey",body))));
        return saveRecord(env,"passkeys",record,false);
    }
    private Object plugin(String env,Map<String,Object> b) {
        String key=text(b,"chromeId");if(key.isBlank())key=text(b,"pluginId");
        for(Object item:documents.list(env,"plugins"))if(item instanceof Map<?,?> m&&(key.equals(m.get("chrome_id"))||key.equals(m.get("id"))))return item;
        throw new BusinessException(404,"此店铺没有该插件分发记录");
    }
    private Object accountSave(ExtensionSessions.Context c,Map<String,Object> b,boolean existing) {
        c.actor().allow("shop.edit");var record=new LinkedHashMap<String,Object>();
        if(existing){
            Object previous=documents.get(c.environmentId(),"accounts",required(b,"id",100),null);
            require(previous instanceof Map<?,?>,404,"此账号请在店铺编辑页修改");
            ((Map<?,?>)previous).forEach((key,value)->record.put(String.valueOf(key),value));
        }
        record.putAll(b);
        String url=required(record,"url",2000);URI parsed=URI.create(url);require(Set.of("https","http").contains(parsed.getScheme())&&parsed.getHost()!=null,400,"账号网址不合法");
        required(record,"account",200);
        if(record.containsKey("password")){record.put("passwordK",ExtensionCrypto.encode(text(record,"password")));record.remove("password");}
        return saveRecord(c.environmentId(),"accounts",record,existing);
    }
    private Object accounts(ExtensionSessions.Context c) {
        var list=new ArrayList<>(documents.list(c.environmentId(),"accounts"));
        var env=shops.get(c.actor(),c.environmentId(),"shop.open");
        if(!text(env,"accountName").isBlank())list.add(Map.of("id","main-"+c.environmentId(),"url",text(env,"startUrl"),"account",text(env,"accountName"),"passwordK",ExtensionCrypto.encode(text(env,"accountPassword")),"is_main",1,"is_lock_box",Boolean.FALSE.equals(object(text(env,"fingerprint")).get("accountLock"))?0:1));
        return Map.of("list",list,"total",list.size());
    }
    private Map<String,Object> setting(String env,String key) {
        String value=switch(key) {
            case "ipCheckList","dynamicIpCheckList" -> "https://api.ipify.org,https://ifconfig.me/ip";
            case "switch_cdn" -> "0";
            case "platform_network_site","amazon_passkey_inject_urls" -> "{}";
            default -> "";
        };
        Object fallback=Set.of("not_translate_doms","adsFolderBookmark","passkey_urls","passkey_register_urls").contains(key)?List.of():value;
        return Map.of("key",key,"contents",documents.get(env,"configuration",key.isBlank()?"_":key,fallback));
    }
    private List<Object> settings(String env,Object input) {
        List<?> keys=input instanceof List<?> l?l:Arrays.asList(Objects.toString(input,"").split(","));
        return keys.stream().map(k->(Object)Map.of("key",String.valueOf(k),"value",setting(env,String.valueOf(k)))).toList();
    }
    private Object sites(ExtensionSessions.Context c) {
        var env=shops.get(c.actor(),c.environmentId(),"shop.open");
        var list=new ArrayList<>(documents.list(c.environmentId(),"sites"));
        list.add(Map.of("id",c.environmentId(),"name",text(env,"platform").isBlank()?text(env,"name"):text(env,"platform"),"label",text(env,"name"),"link",text(env,"startUrl")));
        return List.of(Map.of("id","store","name","店铺站点","data",List.of(Map.of("id","bound","name","已配置站点","label","已配置站点","children",list))));
    }
    @SuppressWarnings("unchecked") private Map<String,Object> mall(ExtensionSessions.Context c) {
        var env=shops.get(c.actor(),c.environmentId(),"shop.open");
        var proxy=devices.launchProxy(c.actor(),text(env,"deviceId"));
        var fp=object(text(env,"fingerprint"));String version=text(env,"kernelVersion");
        String system=switch(text(fp,"os")){case "Mac"->"Macintosh; Intel Mac OS X 10_15_7";case "Android"->"Linux; Android 13; Pixel 7";default->"Windows NT 10.0; Win64; x64";};
        String ua=text(fp,"userAgent");if(ua.isBlank())ua="Mozilla/5.0 ("+system+") AppleWebKit/537.36 (KHTML, like Gecko) Chrome/"+(version.contains(".")?version:version+".0.0.0")+" Safari/537.36";
        var result=new LinkedHashMap<String,Object>();String id=c.environmentId();
        result.put("id",id);result.put("mall_id",id);result.put("mall_name",text(env,"name"));result.put("platformName",text(env,"platform"));result.put("site_info_id",0);
        result.put("mall_account",text(env,"accountName"));result.put("password_key",ExtensionCrypto.encode(text(env,"accountPassword")));result.put("password_k",ExtensionCrypto.encode(text(env,"accountPassword")));
        result.put("mall_address",text(env,"startUrl"));result.put("random_string","");result.put("mall_account_lock",!Boolean.FALSE.equals(fp.get("accountLock")));
        result.put("front_addendum_info",Map.of("autoInjectPasskey",Boolean.TRUE.equals(fp.get("autoInjectPasskey")),"disabledPasskey",Boolean.TRUE.equals(fp.get("disabledPasskey"))));
        result.put("check_env",1);result.put("jump_method",documents.get(id,"settings","jumpMethod",1));result.put("jump_urls",documents.get(id,"settings","jumpUrls",List.of()));
        result.put("sync_cookie",1);result.put("lasting",1);
        String cookie=String.valueOf(documents.get(id,"settings","cookie",""));result.put("cookie_key",cookie.isBlank()?"":ExtensionCrypto.encode(cookie));
        result.put("has_one_platform",Map.of("name",text(env,"platform"),"link",text(env,"startUrl"),"white_list",List.of(),"black_list",List.of(),"platform_id",0,"logo",""));
        result.put("has_one_user_agent",Map.of("ua",ua));result.put("has_one_mac_user_agent",Map.of("ua",ua));
        var device=new LinkedHashMap<String,Object>();device.put("id",text(proxy,"id"));device.put("ip",text(proxy,"host"));device.put("ip_type",number(proxy,"ipType")==2?2:1);
        device.put("area_name",text(proxy,"region"));device.put("web_type",number(proxy,"webType"));device.put("protocol_family",number(proxy,"protocolFamily"));device.put("equipment_name",text(proxy,"name"));device.put("equipment_code",text(proxy,"id"));device.put("type_name",number(proxy,"ipType")==2?"自有设备":"平台设备");
        device.put("map_ip",text(proxy,"mapIp"));device.put("map_port",number(proxy,"mapPort"));device.put("port",number(proxy,"port"));device.put("proxy_type",text(proxy,"protocol"));
        result.put("has_one_agent_ip",device);
        result.put("has_many_transfer_ip",List.of());return result;
    }
    private Object firewall(ExtensionSessions.Context c) {
        var env=shops.get(c.actor(),c.environmentId(),"shop.open");var fp=object(text(env,"fingerprint"));
        Map<?,?> rules=fp.get("accessRules") instanceof Map<?,?> m?m:Map.of();
        Object domains=rules.containsKey("domains")?rules.get("domains"):List.of();boolean white="whitelist".equals(rules.get("mode"));
        return Map.of("dedicatedList",white?domains:List.of(),"firewallBlack",white?List.of():domains,"firewallWhite",List.of(),"exceptionsBlacklist",rules.containsKey("exceptions")?rules.get("exceptions"):List.of());
    }
}
