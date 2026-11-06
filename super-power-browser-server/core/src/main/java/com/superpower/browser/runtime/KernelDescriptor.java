package com.superpower.browser.runtime;

import java.util.*;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

public final class KernelDescriptor {
    private KernelDescriptor(){}
    public static boolean version(String value){return value.matches("[0-9]{2,3}(?:\\.[0-9]+){0,3}");}
    public static void platform(String platform,String arch){
        require(platform.equals("win32")&&arch.equals("x64")||platform.equals("darwin")&&Set.of("x64","arm64").contains(arch),400,"仅支持 Windows x64、Mac Intel 和 Apple Silicon");
    }
    public static String route(Map<String,Object> entry){
        String base="/runtime/kernels/"+text(entry,"version");
        // Existing Windows clients understand only version-based tickets.
        return text(entry,"platform").equals("win32")&&text(entry,"arch").equals("x64")?base:base+"/"+text(entry,"platform")+"/"+text(entry,"arch");
    }
    public static void relative(String value){
        require(!value.isBlank()&&value.length()<=500&&!value.startsWith("/")&&!value.contains("\\")&&!value.matches(".*[\\x00-\\x1f:].*"),400,"内核文件路径不合法");
        for(String part:value.split("/",-1))require(!part.isEmpty()&&!part.endsWith(".")&&!part.endsWith(" ")&&!part.matches("(?i)(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\\..*)?"),400,"内核文件路径不合法");
    }
    @SuppressWarnings("unchecked")
    public static Map<String,Object> validate(Map<String,Object> input){
        require(json(input).length()<=4*1024*1024,400,"内核清单过大");
        var d=new LinkedHashMap<String,Object>();
        for(String key:List.of("version","fullVersion","platform","arch","protocol","provider","executable","sha256","archiveBytes","sourceCommit","sourceUrl","files","symlinks","executableFiles","requiredDirectories","capabilities"))if(input.containsKey(key))d.put(key,input.get(key));
        require(version(text(d,"version"))&&version(text(d,"fullVersion"))&&text(d,"version").split("\\.")[0].equals(text(d,"fullVersion").split("\\.")[0]),400,"内核版本不合法或主版本不一致");
        platform(text(d,"platform"),text(d,"arch"));boolean mac=text(d,"platform").equals("darwin");
        require(text(d,"protocol").equals("fingerprint-chromium/1"),400,"内核配置协议尚未适配");
        require(text(d,"sha256").matches("[a-fA-F0-9]{64}"),400,"内核 SHA-256 不合法");d.put("sha256",text(d,"sha256").toLowerCase(Locale.ROOT));
        long bytes=number(d,"archiveBytes");require(bytes>0&&bytes<=2L*1024*1024*1024,400,"内核包大小不合法");d.put("archiveBytes",bytes);
        relative(text(d,"executable"));require(mac?text(d,"executable").matches(".+\\.app/Contents/MacOS/[^/]+$"):text(d,"executable").endsWith(".exe"),400,"内核启动程序与目标系统不匹配");
        require(d.get("files") instanceof Map<?,?>,400,"缺少文件校验清单");var files=(Map<?,?>)d.get("files");
        require(!files.isEmpty()&&files.size()<=20000&&files.containsKey(text(d,"executable")),400,"文件校验清单不完整");
        var seen=new HashSet<String>();
        for(var entry:files.entrySet()){
            require(entry.getKey() instanceof String&&entry.getValue() instanceof String,400,"文件校验清单不合法");String name=entry.getKey().toString();relative(name);
            require(seen.add(name.toLowerCase(Locale.ROOT))&&entry.getValue().toString().matches("[a-fA-F0-9]{64}"),400,"文件校验值或重复路径不合法");
        }
        Map<?,?> links=Map.of();
        if(d.containsKey("symlinks")){require(d.get("symlinks") instanceof Map<?,?>,400,"内核链接清单不合法");links=(Map<?,?>)d.get("symlinks");}
        require(mac||links.isEmpty(),400,"Windows 内核不能包含符号链接");
        for(var entry:links.entrySet()){
            require(entry.getKey() instanceof String&&entry.getValue() instanceof String,400,"内核链接清单不合法");String name=entry.getKey().toString();relative(name);
            require(seen.add(name.toLowerCase(Locale.ROOT)),400,"内核文件与链接路径重复");linkTarget(name,entry.getValue().toString());
        }
        var names=new HashSet<String>();files.keySet().forEach(k->names.add(k.toString()));links.keySet().forEach(k->names.add(k.toString()));
        for(String name:names)for(int i=name.indexOf('/');i>=0;i=name.indexOf('/',i+1))require(!seen.contains(name.substring(0,i).toLowerCase(Locale.ROOT)),400,"内核条目不能位于文件或链接下");
        for(Object name:links.keySet())resolveLink(name.toString(),links,files,new HashSet<>());
        if(d.containsKey("executableFiles"))for(String name:strings(d,"executableFiles"))require(files.containsKey(name),400,"执行权限只能赋予已校验文件");
        if(mac)require(d.containsKey("executableFiles")&&strings(d,"executableFiles").contains(text(d,"executable")),400,"Mac 内核缺少可执行权限清单");
        if(d.containsKey("requiredDirectories"))for(String dir:strings(d,"requiredDirectories"))relative(dir);
        if(d.containsKey("capabilities"))require(d.get("capabilities") instanceof Map<?,?>,400,"内核能力清单不合法");
        d.put("requiresLegacyAuthorization",false);return d;
    }
    private static String linkTarget(String name,String target){
        require(!target.isBlank()&&!target.startsWith("/")&&!target.contains("\\")&&!target.matches(".*[\\x00-\\x1f:].*"),400,"内核链接目标不合法");
        var parts=new ArrayDeque<String>();String parent=name.contains("/")?name.substring(0,name.lastIndexOf('/')+1):"";
        for(String part:(parent+target).split("/")){
            if(part.equals(".")||part.isEmpty())continue;
            if(part.equals("..")){require(!parts.isEmpty(),400,"内核链接越界");parts.removeLast();}else parts.addLast(part);
        }
        String result=String.join("/",parts);relative(result);return result;
    }
    private static void resolveLink(String name,Map<?,?> links,Map<?,?> files,Set<String> visited){
        String[] parts=name.split("/");String prefix="";
        for(int i=0;i<parts.length;i++){
            prefix+=(i==0?"":"/")+parts[i];if(!links.containsKey(prefix))continue;
            require(visited.size()<40&&visited.add(prefix),400,"内核链接存在循环");
            String suffix=i+1<parts.length?"/"+String.join("/",Arrays.copyOfRange(parts,i+1,parts.length)):"";
            resolveLink(linkTarget(prefix,links.get(prefix).toString())+suffix,links,files,visited);return;
        }
        require(files.containsKey(name)||files.keySet().stream().anyMatch(k->k.toString().startsWith(name+"/")),400,"内核链接目标不存在");
    }
}
