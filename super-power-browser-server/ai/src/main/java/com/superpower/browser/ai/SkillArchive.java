package com.superpower.browser.ai;

import com.superpower.browser.shared.BusinessException;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import java.util.zip.*;
import org.yaml.snakeyaml.*;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import static com.superpower.browser.shared.BusinessException.require;

public final class SkillArchive {
    public record Metadata(String name,String description,String sha256,String md5){}
    public static Metadata inspect(byte[] archive){
        require(archive.length>0&&archive.length<=50*1024*1024,413,"技能压缩包须在 50 MB 以内");
        String markdown=null,fallbackName="skill";long total=0;int entries=0;Set<String> names=new HashSet<>();
        try(var zip=new ZipInputStream(new ByteArrayInputStream(archive),StandardCharsets.UTF_8)){
            ZipEntry entry;
            while((entry=zip.getNextEntry())!=null){
                require(++entries<=1000,400,"技能压缩包文件过多");
                String path=entry.getName().replace('\\','/');
                require(!path.startsWith("/")&&!path.contains(":")&&!path.contains("\u0000")&&!Arrays.asList(path.split("/")).contains(".."),400,"压缩包含不安全的文件路径");
                require(names.add(path.toLowerCase(Locale.ROOT)),400,"压缩包含重复文件");
                ByteArrayOutputStream output=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int read;long size=0;
                boolean skill=path.equalsIgnoreCase("SKILL.md")||path.toLowerCase(Locale.ROOT).endsWith("/skill.md");
                while((read=zip.read(buffer))!=-1){total+=read;size+=read;require(total<=100*1024*1024&&size<=25*1024*1024,413,"解压后的技能包过大");if(skill){require(size<=1024*1024,413,"SKILL.md 过大");output.write(buffer,0,read);}}
                if(skill&&!entry.isDirectory()){require(markdown==null,400,"每个技能包只能包含一个 SKILL.md");markdown=output.toString(StandardCharsets.UTF_8);String[] parts=path.split("/");if(parts.length>1)fallbackName=parts[parts.length-2];}
            }
        }catch(IOException e){throw new BusinessException(400,"技能 ZIP 文件损坏");}
        require(markdown!=null,400,"压缩包中缺少 SKILL.md");
        var matcher=java.util.regex.Pattern.compile("(?s)^\\uFEFF?---\\s*\\r?\\n(.*?)\\r?\\n---(?:\\s|$)").matcher(markdown);
        try{
            Map<?,?> values=Map.of();
            if(matcher.find()){
                LoaderOptions options=new LoaderOptions();options.setAllowDuplicateKeys(false);options.setMaxAliasesForCollections(0);options.setCodePointLimit(1024*1024);
                Object loaded=new Yaml(new SafeConstructor(options)).load(matcher.group(1));require(loaded instanceof Map<?,?>,400,"技能元信息格式不正确");values=(Map<?,?>)loaded;
            }
            String name=Objects.toString(values.get("name"),"").trim(),description=Objects.toString(values.get("description"),"").trim();
            if(name.isEmpty())name=match(markdown,"(?im)^#{1,6}\\h*(?:技能)?(?:名称|名字)\\h*[：:]\\h*(.+?)\\h*$");
            if(name.isEmpty())name=fallbackName;
            if(description.isEmpty())description=match(markdown,"(?im)^#{0,6}\\h*(?:技能)?描述\\h*[：:]\\h*(.+?)\\h*$");
            if(description.isEmpty())description=match(markdown,"(?im)^#{1,6}\\h*(?:技能)?描述\\h*\\R+(?!#)([^\\r\\n]+)");
            require(!name.isEmpty()&&name.length()<=160&&!description.isEmpty()&&description.length()<=2000,400,"技能名称或说明不合法");
            return new Metadata(name,description,digest("SHA-256",archive),digest("MD5",archive));
        }catch(BusinessException e){throw e;}catch(Exception e){throw new BusinessException(400,"技能元信息无法解析");}
    }
    private static String match(String text,String pattern){var found=java.util.regex.Pattern.compile(pattern).matcher(text);return found.find()?found.group(1).trim():"";}
    private static String digest(String algorithm,byte[] bytes)throws NoSuchAlgorithmException{return HexFormat.of().formatHex(MessageDigest.getInstance(algorithm).digest(bytes));}
}
