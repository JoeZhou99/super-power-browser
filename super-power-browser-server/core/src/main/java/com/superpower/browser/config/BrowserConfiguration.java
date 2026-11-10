package com.superpower.browser.config;

import com.superpower.browser.shared.*;
import java.net.URI;
import java.time.ZoneId;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Small, versioned global dictionaries. Capability/security switches intentionally remain in code. */
@Service
public class BrowserConfiguration {
    private static final Map<String,String> TITLES;
    private static final Map<String,String> DEFAULT_GROUPS=Map.of("timezone","timezones","language","languages","resolution","resolutions");
    static {
        var titles=new LinkedHashMap<String,String>();
        titles.put("timezones","时区");titles.put("languages","浏览器语言");titles.put("resolutions","窗口尺寸");
        titles.put("browser-defaults","新建店铺默认值");titles.put("platform-sites","平台站点");TITLES=Collections.unmodifiableMap(titles);
    }
    private final Db db;
    private final ConfigOperatorAuth operators;
    public BrowserConfiguration(Db db,ConfigOperatorAuth operators) { this.db=db;this.operators=operators; }

    @Transactional public void initialize() {
        lock();
        seed("timezones",Map.of("entries",timezoneSeeds()));
        seed("languages",Map.of("entries",languageSeeds()));
        seed("resolutions",Map.of("entries",resolutionSeeds()));
        seed("browser-defaults",Map.of("values",Map.of("timezone","Asia/Shanghai","language","zh-CN","resolution","1920x1080")));
        seed("platform-sites",Map.of()); // The existing platform_site catalog remains the source of truth.
    }
    private void seed(String key,Map<String,Object> payload) {
        if(db.select("SELECT config_key FROM browser_config WHERE config_key=?",key).isEmpty())
            db.execute("INSERT INTO browser_config(config_key,payload) VALUES(?,?)",key,json(payload));
    }
    private void lock() { one(db.select("SELECT id FROM config_state WHERE id=1 FOR UPDATE")); }

    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> client() {
        var result=new LinkedHashMap<String,Object>();
        result.put("revision",number(one(db.select("SELECT revision FROM config_state WHERE id=1")),"revision"));
        for(String key:List.of("timezones","languages","resolutions")) {
            result.put(key,entries(payload(key)).stream().filter(e->flag(e,"enabled"))
                .sorted(Comparator.comparingLong(e->number(e,"sortOrder")))
                .map(e->Map.of("value",text(e,"value"),"label",text(e,"label"))).toList());
        }
        result.put("defaults",payload("browser-defaults").get("values"));return result;
    }
    /** Fill omitted values only; editing or importing an existing legal fingerprint never rewrites it. */
    public void applyDefaults(Map<String,Object> fingerprint,Map<String,Object> previous) {
        Map<String,Object> defaults=values(payload("browser-defaults"));
        for(String field:DEFAULT_GROUPS.keySet()) {
            if(!fingerprint.containsKey(field)||fingerprint.get(field)==null||text(fingerprint,field).isBlank()) {
                String old=previous==null?"":text(previous,field);
                fingerprint.put(field,old.isBlank()?text(defaults,field):old);
            }
        }
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public List<Map<String,Object>> list(ConfigOperator operator) {
        operators.requireActive(operator);
        return TITLES.keySet().stream().map(key->{
            var doc=document(key);var result=new LinkedHashMap<String,Object>();
            for(String field:List.of("key","title","revision","updatedAt")) result.put(field,doc.get(field));
            result.put("itemCount",key.equals("browser-defaults")?values(doc).size():entries(doc).size());return (Map<String,Object>)result;
        }).toList();
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> get(ConfigOperator operator,String key) { operators.requireActive(operator);return document(key); }
    private Map<String,Object> metadata(String key) {
        require(TITLES.containsKey(key),404,"配置项不存在");
        return one(db.select("SELECT config_key,payload,revision,updated_at FROM browser_config WHERE config_key=?",key));
    }
    private Map<String,Object> payload(String key) { return object(text(metadata(key),"payload")); }
    private Map<String,Object> document(String key) {
        var meta=metadata(key);var result=new LinkedHashMap<String,Object>();
        result.put("key",key);result.put("title",TITLES.get(key));result.put("revision",meta.get("revision"));result.put("updatedAt",meta.get("updatedAt"));
        if(key.equals("platform-sites")) result.put("entries",platforms());
        else result.putAll(object(text(meta,"payload")));return result;
    }
    private List<Map<String,Object>> platforms() {
        return rows(db.select("SELECT id,category_name,platform_name,site_name,url,enabled,sort_order FROM platform_site ORDER BY sort_order,id"));
    }
    @Transactional public Map<String,Object> save(ConfigOperator operator,String key,Map<String,Object> request) {
        require(TITLES.containsKey(key),404,"配置项不存在");
        require(json(request).length()<=600_000,400,"配置内容过大");
        lock();operators.requireActive(operator);
        var before=document(key);long revision=number(before,"revision");
        require(number(request,"revision")==revision,409,"配置已被其他管理员修改，请刷新后重新编辑");
        Map<String,Object> next;
        if(key.equals("browser-defaults")) next=Map.of("values",validateDefaults(request));
        else if(key.equals("platform-sites")) next=Map.of("entries",validatePlatforms(request,entries(before)));
        else next=Map.of("entries",validateEntries(key,request));
        if(DEFAULT_GROUPS.containsValue(key)||key.equals("browser-defaults")) {
            var defaults=key.equals("browser-defaults")?values(next):values(payload("browser-defaults"));
            for(var field:DEFAULT_GROUPS.entrySet()) {
                var options=entries(key.equals(field.getValue())?next:payload(field.getValue()));
                require(options.stream().anyMatch(e->flag(e,"enabled")&&text(e,"value").equals(text(defaults,field.getKey()))),400,
                    "默认"+TITLES.get(field.getValue())+"必须是启用项；停用或删除前请先修改默认值");
            }
        }
        if(key.equals("platform-sites")) savePlatforms(entries(next));
        int changed=db.execute("UPDATE browser_config SET payload=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE config_key=? AND revision=?",json(key.equals("platform-sites")?Map.of():next),key,revision);
        require(changed==1,409,"配置版本冲突，请刷新后重试");
        db.execute("UPDATE config_state SET revision=revision+1 WHERE id=1");
        var after=document(key);
        db.execute("INSERT INTO config_audit(id,config_key,operator_id,operator_name,revision,before_json,after_json) VALUES(?,?,?,?,?,?,?)",
            id(),key,operator.id(),operator.username(),revision+1,json(before),json(after));
        return after;
    }
    private Map<String,Object> validateDefaults(Map<String,Object> request) {
        var values=values(request);
        require(values.keySet().equals(DEFAULT_GROUPS.keySet()),400,"默认值仅包含 timezone、language、resolution，且三项均须填写");
        var result=new LinkedHashMap<String,Object>();
        for(String key:DEFAULT_GROUPS.keySet())result.put(key,string(values,key,100));return result;
    }
    private List<Map<String,Object>> validateEntries(String key,Map<String,Object> request) {
        var input=entries(request);require(!input.isEmpty()&&input.size()<=1500,400,"配置项数量须为 1 至 1500");
        var unique=new HashSet<String>();var result=new ArrayList<Map<String,Object>>();
        for(var row:input) {
            String value=string(row,"value",100),label=string(row,"label",160);
            require(unique.add(value),400,"配置值重复："+value);
            switch(key) {
                case "timezones" -> require(ZoneId.getAvailableZoneIds().contains(value),400,"时区须为有效 IANA 时区标识，当前不支持匹配 IP");
                case "languages" -> require(value.matches("[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})?(?:,[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})?)*"),400,"浏览器语言格式不正确，当前不支持匹配 IP");
                case "resolutions" -> require(value.matches("[1-9][0-9]{2,3}x[1-9][0-9]{2,3}"),400,"窗口尺寸须为宽x高，例如 1920x1080");
                default -> throw new BusinessException(404,"配置项不存在");
            }
            result.add(entry(value,label,enabled(row),sortOrder(row)));
        }
        require(result.stream().anyMatch(e->flag(e,"enabled")),400,"至少保留一个启用项");return result;
    }
    private List<Map<String,Object>> validatePlatforms(Map<String,Object> request,List<Map<String,Object>> previous) {
        var input=entries(request);require(!input.isEmpty()&&input.size()<=2500,400,"平台站点数量须为 1 至 2500");
        Set<String> existing=new HashSet<>();previous.forEach(e->existing.add(text(e,"id")));
        var seen=new HashSet<String>();var names=new HashSet<String>();var result=new ArrayList<Map<String,Object>>();
        for(var row:input) {
            String siteId=text(row,"id").trim();
            require(siteId.isEmpty()||existing.contains(siteId),400,"已有平台站点 ID 不能修改；新增站点请留空 ID");
            if(siteId.isEmpty()) siteId=id();
            require(seen.add(siteId),400,"平台站点 ID 重复");
            String category=string(row,"categoryName",100),platform=string(row,"platformName",100),site=string(row,"siteName",200),url=string(row,"url",2000);
            require(names.add(category+"\u0000"+platform+"\u0000"+site),400,"同一平台下站点名称重复");
            try { var uri=URI.create(url);require(Set.of("http","https").contains(uri.getScheme())&&uri.getHost()!=null&&uri.getRawUserInfo()==null,400,"站点 URL 须为不含账号密码的 HTTP 或 HTTPS 地址"); }
            catch(IllegalArgumentException e) { throw new BusinessException(400,"平台站点 URL 不合法"); }
            var value=new LinkedHashMap<String,Object>();value.put("id",siteId);value.put("categoryName",category);value.put("platformName",platform);
            value.put("siteName",site);value.put("url",url);value.put("enabled",enabled(row));value.put("sortOrder",sortOrder(row));result.add(value);
        }
        require(seen.containsAll(existing),400,"已有平台站点不能删除，请改为停用，以保留历史店铺关联");
        require(result.stream().anyMatch(e->flag(e,"enabled")),400,"至少保留一个启用站点");return result;
    }
    private void savePlatforms(List<Map<String,Object>> entries) {
        for(var row:entries) {
            int updated=db.execute("UPDATE platform_site SET category_name=?,platform_name=?,site_name=?,url=?,enabled=?,sort_order=? WHERE id=?",
                text(row,"categoryName"),text(row,"platformName"),text(row,"siteName"),text(row,"url"),flag(row,"enabled"),number(row,"sortOrder"),text(row,"id"));
            if(updated==0)db.execute("INSERT INTO platform_site(id,category_name,platform_name,site_name,url,enabled,sort_order) VALUES(?,?,?,?,?,?,?)",
                text(row,"id"),text(row,"categoryName"),text(row,"platformName"),text(row,"siteName"),text(row,"url"),flag(row,"enabled"),number(row,"sortOrder"));
        }
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> audit(ConfigOperator operator,int page,int size) {
        operators.requireActive(operator);require(page>0&&page<=100_000&&size>0&&size<=100,400,"分页参数不合法");
        var items=rows(db.select("SELECT id,config_key,operator_name,revision,before_json,after_json,created_at FROM config_audit ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",size,(long)(page-1)*size));
        for(var item:items) {
            item.put("key",item.remove("configKey"));item.put("operator",item.remove("operatorName"));
            item.put("before",object(Objects.toString(item.remove("beforeJson"))));item.put("after",object(Objects.toString(item.remove("afterJson"))));
        }
        return Map.of("items",items,"total",number(one(db.select("SELECT COUNT(*) AS total FROM config_audit")),"total"));
    }
    @SuppressWarnings("unchecked") private static List<Map<String,Object>> entries(Map<String,Object> document) {
        require(document.get("entries") instanceof List<?>,400,"entries 必须为列表");var input=(List<?>)document.get("entries");
        require(input.stream().allMatch(e->e instanceof Map<?,?>),400,"配置列表每项必须为对象");return (List<Map<String,Object>>)(List<?>)input;
    }
    @SuppressWarnings("unchecked") private static Map<String,Object> values(Map<String,Object> document) {
        require(document.get("values") instanceof Map<?,?>,400,"values 必须为对象");return (Map<String,Object>)document.get("values");
    }
    private static String string(Map<String,Object> source,String key,int max) {
        require(source.get(key) instanceof String,400,key+" 必须为文本");String value=required(source,key,max);
        require(value.chars().noneMatch(Character::isISOControl),400,key+" 不能包含控制字符");return value;
    }
    private static boolean enabled(Map<String,Object> source) { require(source.get("enabled") instanceof Boolean,400,"enabled 必须为布尔值");return flag(source,"enabled"); }
    private static int sortOrder(Map<String,Object> source) { long order=number(source,"sortOrder");require(order>=0&&order<=1_000_000,400,"排序须为 0 至 1000000 的整数");return (int)order; }
    private static Map<String,Object> entry(String value,String label,boolean enabled,int order) { return Map.of("value",value,"label",label,"enabled",enabled,"sortOrder",order); }
    private static List<Map<String,Object>> timezoneSeeds() {
        var result=new ArrayList<Map<String,Object>>();
        for(String id:new TreeSet<>(ZoneId.getAvailableZoneIds()))result.add(entry(id,id,true,result.size()));return result;
    }
    private static List<Map<String,Object>> languageSeeds() {
        String[][] values={{"zh-CN","简体中文"},{"zh-TW","繁體中文"},{"en-US","English (United States)"},{"en-GB","English (United Kingdom)"},{"ja-JP","日本語"},{"ko-KR","한국어"},{"fr-FR","Français"},{"de-DE","Deutsch"},{"es-ES","Español (España)"},{"es-MX","Español (México)"},{"pt-BR","Português (Brasil)"},{"pt-PT","Português (Portugal)"},{"it-IT","Italiano"},{"ru-RU","Русский"},{"th-TH","ไทย"},{"vi-VN","Tiếng Việt"},{"id-ID","Bahasa Indonesia"},{"ms-MY","Bahasa Melayu"},{"fil-PH","Filipino"},{"hi-IN","हिन्दी"},{"ar-SA","العربية"},{"tr-TR","Türkçe"},{"nl-NL","Nederlands"},{"pl-PL","Polski"},{"uk-UA","Українська"},{"sv-SE","Svenska"}};
        var result=new ArrayList<Map<String,Object>>();for(var value:values)result.add(entry(value[0],value[1],true,result.size()));return result;
    }
    private static List<Map<String,Object>> resolutionSeeds() {
        var result=new ArrayList<Map<String,Object>>();
        for(String value:List.of("1024x768","1280x720","1280x800","1280x1024","1366x768","1440x900","1536x864","1600x900","1680x1050","1920x1080","1920x1200","2560x1440","2560x1600","3840x2160"))result.add(entry(value,value.replace("x"," × "),true,result.size()));return result;
    }
}
