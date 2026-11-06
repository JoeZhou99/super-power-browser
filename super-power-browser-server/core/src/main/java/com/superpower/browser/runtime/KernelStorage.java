package com.superpower.browser.runtime;

import com.superpower.browser.shared.BusinessException;
import jakarta.annotation.PreDestroy;
import java.io.*;
import java.net.URI;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.*;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.*;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

@Component
public class KernelStorage {
    private final KernelSettings settings;
    private final Path localRoot;
    private S3Client client;
    private S3Presigner signer;
    private DefaultCredentialsProvider credentials;
    public KernelStorage(KernelSettings settings,@Value("${app.kernel-manifest:}") String bootstrap){
        this.settings=settings;
        localRoot=!settings.getLocalRoot().isBlank()?Path.of(settings.getLocalRoot()).toAbsolutePath().normalize():bootstrap.isBlank()?null:Path.of(bootstrap).toAbsolutePath().getParent();
    }
    private synchronized void s3(){
        if(client!=null)return;
        require(!settings.getBucket().isBlank(),503,"尚未配置内核对象存储 bucket");
        require(settings.getUrlMinutes()>=1&&settings.getUrlMinutes()<=60,503,"内核下载链接有效期必须为 1 至 60 分钟");
        URI endpoint=null;
        if(!settings.getEndpoint().isBlank()){
            endpoint=URI.create(settings.getEndpoint());
            require(endpoint.getHost()!=null&&endpoint.getUserInfo()==null&&endpoint.getQuery()==null&&endpoint.getFragment()==null&&(endpoint.getPath().isEmpty()||endpoint.getPath().equals("/")),503,"对象存储端点不合法");
            require("https".equals(endpoint.getScheme())||(settings.isAllowHttp()&&"http".equals(endpoint.getScheme())&&Set.of("127.0.0.1","localhost","[::1]").contains(endpoint.getHost())),503,"对象存储必须使用 HTTPS，本机开发需显式允许 HTTP");
        }
        credentials=DefaultCredentialsProvider.builder().build();
        var config=S3Configuration.builder().pathStyleAccessEnabled(settings.isPathStyle()).checksumValidationEnabled(false).build();
        var clientBuilder=S3Client.builder().region(Region.of(settings.getRegion())).credentialsProvider(credentials).serviceConfiguration(config)
            .httpClientBuilder(UrlConnectionHttpClient.builder().connectionTimeout(Duration.ofSeconds(10)).socketTimeout(Duration.ofSeconds(30)))
            .overrideConfiguration(c->c.apiCallTimeout(Duration.ofMinutes(3)).apiCallAttemptTimeout(Duration.ofMinutes(2)));
        var signerBuilder=S3Presigner.builder().region(Region.of(settings.getRegion())).credentialsProvider(credentials).serviceConfiguration(config);
        if(endpoint!=null){clientBuilder.endpointOverride(endpoint);signerBuilder.endpointOverride(endpoint);}
        client=clientBuilder.build();signer=signerBuilder.build();
    }
    public String objectKey(Map<String,Object> d){
        String prefix=settings.getPrefix().replaceAll("^/+|/+$","");KernelDescriptor.relative(prefix);
        return prefix+"/"+text(d,"platform")+"/"+text(d,"arch")+"/"+text(d,"version")+"/"+text(d,"sha256")+".zip";
    }
    public Path localFile(Map<String,Object> entry){
        require(text(entry,"storageType").equals("LOCAL"),409,"对象存储内核请通过下载地址接口获取");
        require(localRoot!=null,503,"尚未配置本地内核资源目录");String key=text(entry,"storageKey");KernelDescriptor.relative(key);
        try{
            Path root=localRoot.toRealPath(),file=root.resolve(key).normalize();require(file.startsWith(root),503,"内核包路径越界");
            Path current=root;for(Path part:root.relativize(file)){current=current.resolve(part);require(!Files.isSymbolicLink(current),503,"内核包路径不能包含符号链接");}
            require(Files.isRegularFile(file)&&Files.size(file)==number(entry,"archiveBytes"),503,"内核包不存在或大小不一致");return file;
        }catch(IOException e){throw new BusinessException(503,"无法读取本地内核包");}
    }
    public Map<String,Object> upload(Map<String,Object> entry){
        require(text(entry,"storageType").equals("S3"),409,"仅对象存储版本支持上传地址");s3();
        try{
            String checksum=Base64.getEncoder().encodeToString(HexFormat.of().parseHex(text(entry,"sha256")));
            var request=PutObjectRequest.builder().bucket(settings.getBucket()).key(text(entry,"storageKey")).contentType("application/zip")
                .contentLength(number(entry,"archiveBytes")).checksumSHA256(checksum).ifNoneMatch("*").metadata(Map.of("sha256",text(entry,"sha256"))).build();
            var signed=signer.presignPutObject(PutObjectPresignRequest.builder().signatureDuration(Duration.ofMinutes(settings.getUrlMinutes())).putObjectRequest(request).build());
            var headers=new LinkedHashMap<String,String>();signed.signedHeaders().forEach((k,v)->{if(!k.equalsIgnoreCase("host"))headers.put(k,String.join(",",v));});
            return Map.of("url",signed.url().toString(),"method","PUT","headers",headers,"expiresAt",signed.expiration().toString());
        }catch(RuntimeException e){throw new BusinessException(503,"无法签发内核上传地址，请检查对象存储配置和服务端凭据");}
    }
    public Map<String,Object> download(Map<String,Object> entry){
        var result=new LinkedHashMap<String,Object>();result.put("sha256",entry.get("sha256"));result.put("archiveBytes",entry.get("archiveBytes"));
        if(text(entry,"storageType").equals("LOCAL")){localFile(entry);result.put("downloadPath",KernelDescriptor.route(entry)+"/archive");return result;}
        s3();
        try{
            var request=GetObjectRequest.builder().bucket(settings.getBucket()).key(text(entry,"storageKey"));
            if(!text(entry,"objectVersion").isBlank())request.versionId(text(entry,"objectVersion"));
            var signed=signer.presignGetObject(GetObjectPresignRequest.builder().signatureDuration(Duration.ofMinutes(settings.getUrlMinutes())).getObjectRequest(request.build()).build());
            require(signed.isBrowserExecutable(),503,"对象存储下载地址需要额外签名头");
            result.put("downloadUrl",signed.url().toString());result.put("expiresAt",signed.expiration().toString());return result;
        }catch(RuntimeException e){throw new BusinessException(503,"无法签发内核下载地址，请检查对象存储配置和服务端凭据");}
    }
    /** Hash the stored bytes before publishing, not merely user-supplied object metadata. */
    public String verify(Map<String,Object> entry){
        try{
            if(text(entry,"storageType").equals("LOCAL")){
                try(var stream=Files.newInputStream(localFile(entry))){verifyBytes(stream,entry);}return "";
            }
            s3();var headRequest=HeadObjectRequest.builder().bucket(settings.getBucket()).key(text(entry,"storageKey"));
            if(!text(entry,"objectVersion").isBlank())headRequest.versionId(text(entry,"objectVersion"));
            var head=client.headObject(headRequest.build());require(head.contentLength()==number(entry,"archiveBytes"),409,"对象存储内核包大小不匹配");
            String version=head.versionId();if(version==null||version.equals("null"))version="";
            var get=GetObjectRequest.builder().bucket(settings.getBucket()).key(text(entry,"storageKey"));if(!version.isBlank())get.versionId(version);
            try(var stream=client.getObject(get.build())){verifyBytes(stream,entry);}return version;
        }catch(BusinessException e){throw e;}
        catch(Exception e){throw new BusinessException(503,"无法校验内核包，请检查文件是否上传成功及存储读取权限");}
    }
    private void verifyBytes(InputStream stream,Map<String,Object> entry)throws Exception{
        var digest=MessageDigest.getInstance("SHA-256");long size=0,expected=number(entry,"archiveBytes");byte[] buffer=new byte[128*1024];int n;
        while((n=stream.read(buffer))!=-1){size+=n;require(size<=expected,409,"内核包长度超出清单");digest.update(buffer,0,n);}
        require(size==expected&&HexFormat.of().formatHex(digest.digest()).equals(text(entry,"sha256")),409,"内核包 SHA-256 与清单不一致，禁止发布");
    }
    @PreDestroy public synchronized void close(){if(client!=null)client.close();if(signer!=null)signer.close();if(credentials!=null)credentials.close();}
}
