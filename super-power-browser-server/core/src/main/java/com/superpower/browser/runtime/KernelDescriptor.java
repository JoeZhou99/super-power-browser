package com.superpower.browser.runtime;

import java.util.*;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

public final class KernelDescriptor {
    private KernelDescriptor(){}
    public static boolean version(String value){return value.matches("[0-9]{2,3}(?:\\.[0-9]+){0,3}");}
    public static void relative(String value){
        require(!value.isBlank()&&value.length()<=500&&!value.startsWith("/")&&!value.contains("\\")&&!value.matches(".*[\\x00-\\x1f:].*"),400,"内核文件路径不合法");
        for(String part:value.split("/",-1))require(!part.isEmpty()&&!part.endsWith(".")&&!part.endsWith(" ")&&!part.matches("(?i)(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\\..*)?"),400,"内核文件路径不合法");
    }
    @SuppressWarnings("unchecked")
    public static Map<String,Object> validate(Map<String,Object> input){
        require(json(input).length()<=4*1024*1024,400,"内核清单过大");
        var d=new LinkedHashMap<String,Object>();
        for(String key:List.of("version","fullVersion","platform","arch","protocol","provider","executable","sha256","archiveBytes","sourceCommit","sourceUrl","files","requiredDirectories","capabilities"))if(input.containsKey(key))d.put(key,input.get(key));
        require(version(text(d,"version"))&&version(text(d,"fullVersion"))&&text(d,"version").split("\\.")[0].equals(text(d,"fullVersion").split("\\.")[0]),400,"内核版本不合法或主版本不一致");
        require(text(d,"platform").equals("win32")&&text(d,"arch").equals("x64"),400,"当前仅适配 Windows x64");
        require(text(d,"protocol").equals("fingerprint-chromium/1"),400,"内核配置协议尚未适配");
        require(text(d,"sha256").matches("[a-fA-F0-9]{64}"),400,"内核 SHA-256 不合法");d.put("sha256",text(d,"sha256").toLowerCase(Locale.ROOT));
        long bytes=number(d,"archiveBytes");require(bytes>0&&bytes<=2L*1024*1024*1024,400,"内核包大小不合法");d.put("archiveBytes",bytes);
        relative(text(d,"executable"));require(text(d,"executable").endsWith(".exe"),400,"内核启动程序必须为 EXE");
        require(d.get("files") instanceof Map<?,?>,400,"缺少文件校验清单");var files=(Map<?,?>)d.get("files");
        require(!files.isEmpty()&&files.size()<=20000&&files.containsKey(text(d,"executable")),400,"文件校验清单不完整");
        var seen=new HashSet<String>();
        for(var entry:files.entrySet()){
            require(entry.getKey() instanceof String&&entry.getValue() instanceof String,400,"文件校验清单不合法");String name=entry.getKey().toString();relative(name);
            require(seen.add(name.toLowerCase(Locale.ROOT))&&entry.getValue().toString().matches("[a-fA-F0-9]{64}"),400,"文件校验值或重复路径不合法");
        }
        if(d.containsKey("requiredDirectories"))for(String dir:strings(d,"requiredDirectories"))relative(dir);
        if(d.containsKey("capabilities"))require(d.get("capabilities") instanceof Map<?,?>,400,"内核能力清单不合法");
        d.put("requiresLegacyAuthorization",false);return d;
    }
}
