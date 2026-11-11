package com.superpower.browser.environment;

import com.superpower.browser.shared.BusinessException;
import java.net.URI;
import java.time.ZoneId;
import java.util.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Validate settings before they can reach the native browser configuration. */
public final class FingerprintSettings {
    private FingerprintSettings() {}
    public static void validate(Map<?,?> fp,String kernel) {
        for(String key:List.of("canvas","audio","clientRects","fontMetrics","webglFingerprint","fonts","speechVoices")) choice(fp,key,Set.of("privacy","real"));
        choice(fp,"webRtc",Set.of("privacy","real","replace","disabled"));
        choice(fp,"os",Set.of("Windows","Mac","Android"));
        choice(fp,"languageMode",Set.of("ip","custom"));
        if(kernel.split("\\.")[0].equals("144")) {
            require(!Objects.equals(fp.get("os"),"Android"),400,"当前独立内核不支持 Android 环境");
            require(!Objects.equals(fp.get("webRtc"),"replace"),400,"当前独立内核尚未实现 WebRTC 指定 IP 替换");
            require(!fp.containsKey("fontList")&&Objects.toString(fp.get("webglVendor"),"").isBlank()&&Objects.toString(fp.get("webglRenderer"),"").isBlank(),400,"当前独立内核不支持自定义字体列表或 GPU 字符串");
            boolean canvas=Objects.equals(fp.get("canvas"),"real");
            require(canvas==Objects.equals(fp.get("fontMetrics"),"real")&&canvas==Objects.equals(fp.get("webglFingerprint"),"real"),400,"Canvas、字体测量和 WebGL 噪声必须使用相同模式");
        }
        if(fp.containsKey("hardwareConcurrency"))require(fp.get("hardwareConcurrency") instanceof Number n&&n.doubleValue()==n.intValue()&&n.intValue()>=1&&n.intValue()<=128,400,"CPU 并发数必须是 1 至 128 的整数");
        for(String key:List.of("webgl","hardwareAcceleration","rememberPassword","notifications","autoInjectPasskey","disabledPasskey","accountLock"))
            if(fp.containsKey(key))require(fp.get(key) instanceof Boolean,400,key+" 必须为开关值");
        if(fp.containsKey("resolution"))require(fp.get("resolution") instanceof String s&&s.matches("[1-9][0-9]{2,3}x[1-9][0-9]{2,3}"),400,"窗口尺寸格式不正确");
        if(fp.containsKey("language"))require(fp.get("language") instanceof String s&&s.matches("(?:auto|[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})?(?:,[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})?)*)"),400,"语言格式不正确");
        if(fp.containsKey("timezone"))try {require(fp.get("timezone") instanceof String,400,"时区必须为文本");String zone=(String)fp.get("timezone");if(!Set.of("auto","__local__").contains(zone))ZoneId.of(zone);}catch(Exception e){throw new BusinessException(400,"时区不合法");}
        if(fp.containsKey("fontList"))strings(fp.get("fontList"),"隐私字体",100,100);
        String ua=Objects.toString(fp.get("userAgent"),"");
        if(!ua.isBlank()) {
            require(ua.length()<=1000&&!ua.contains("\r")&&!ua.contains("\n"),400,"UA 格式不正确");
            var match=java.util.regex.Pattern.compile("Chrome/([0-9]+)\\.[0-9.]+").matcher(ua);
            require(match.find()&&match.group(1).equals(kernel.split("\\.")[0]),400,"UA 的 Chrome 主版本必须与所选内核一致");
            require(ua.contains("Windows NT")||ua.contains("Macintosh")||ua.contains("Android"),400,"UA 系统不支持");
        }
        for(String key:List.of("webglVendor","webglRenderer"))if(fp.containsKey(key))require(fp.get(key) instanceof String s&&s.length()<=500&&!s.contains("\n"),400,"WebGL 参数不合法");
        if(fp.containsKey("accessRules")) {
            require(fp.get("accessRules") instanceof Map<?,?>,400,"访问规则必须为对象");
            var rules=(Map<?,?>)fp.get("accessRules");choice(rules,"mode",Set.of("blacklist","whitelist"));
            var domains=strings(rules.get("domains"),"访问域名",100,253);
            for(String host:domains)require(host.matches("(?i)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?"),400,"访问规则请填写域名，不包含协议、端口或路径");
            if(rules.containsKey("exceptions"))for(String url:strings(rules.get("exceptions"),"访问例外",100,2000)) {
                try {var parsed=URI.create(url);require(Set.of("http","https").contains(parsed.getScheme())&&parsed.getHost()!=null,400,"例外地址不合法");}
                catch(IllegalArgumentException e){throw new BusinessException(400,"例外地址不合法");}
            }
        }
    }
    private static void choice(Map<?,?> source,String key,Set<String> values){if(source.containsKey(key))require(source.get(key) instanceof String s&&values.contains(s),400,key+" 选项不合法");}
    private static List<String> strings(Object value,String title,int count,int length) {
        require(value instanceof List<?>,400,title+" 必须为列表");var list=(List<?>)value;
        require(list.size()<=count,400,title+" 数量过多");
        var result=new ArrayList<String>();
        for(Object item:list){require(item instanceof String s&&!s.isBlank()&&s.length()<=length,400,title+" 内容不合法");result.add(((String)item).trim());}
        require(!title.equals("隐私字体")||!result.isEmpty(),400,"隐私字体不能为空");return result;
    }
}
