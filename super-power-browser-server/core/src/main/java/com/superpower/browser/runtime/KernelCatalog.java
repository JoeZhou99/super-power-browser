package com.superpower.browser.runtime;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.*;
import java.nio.file.Path;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Global kernel catalog. Tenant owners are not automatically platform publishers. */
@Service
public class KernelCatalog {
    private final KernelRepository repository;
    private final KernelStorage storage;
    private final KernelSettings settings;
    private final AuditRepository audit;
    private final TransactionTemplate transaction;
    public KernelCatalog(KernelRepository repository,KernelStorage storage,KernelSettings settings,AuditRepository audit,PlatformTransactionManager tx){
        this.repository=repository;this.storage=storage;this.settings=settings;this.audit=audit;transaction=new TransactionTemplate(tx);
    }
    public void publisher(Actor actor){require(actor.owner()&&Arrays.stream(settings.getPublisherIds().split(",")).map(String::trim).anyMatch(actor.id()::equals),403,"仅指定的平台发布人员可以管理全局内核");}
    public Object list(){
        var items=repository.all().stream().filter(e->text(e,"state").equals("PUBLISHED")).map(e->{
            var d=object(text(e,"descriptor"));d.put("recommended",flag(e,"recommended"));
            d.put("downloadDescriptorPath","/runtime/kernels/"+text(e,"version")+"/download");return d;
        }).toList();return Map.of("schemaVersion",1,"source","database","kernels",items);
    }
    private Map<String,Object> published(String version){
        require(KernelDescriptor.version(version),400,"内核版本不合法");
        var e=repository.find(version,"win32","x64").orElseThrow(()->new BusinessException(404,"内核版本未发布"));
        require(text(e,"state").equals("PUBLISHED"),404,"内核版本未发布或已停用");return e;
    }
    public Path archive(String version){return storage.localFile(published(version));}
    public void requirePublished(String version){published(version);}
    public Object download(String version){return storage.download(published(version));}
    public Object adminList(Actor a){publisher(a);return Map.of("items",repository.all());}
    public Object create(Actor a,Map<String,Object> body){
        publisher(a);var d=KernelDescriptor.validate(body);String key=storage.objectKey(d);
        return transaction.execute(status->{
            repository.lock();var existing=repository.find(text(d,"version"),text(d,"platform"),text(d,"arch"));
            if(existing.isPresent()){
                var entry=existing.get();require(KernelDescriptor.validate(object(text(entry,"descriptor"))).equals(d)&&text(entry,"storageType").equals("S3"),409,"此版本已固定到其他资源或配置；本地资源可通过存储切换入口转入对象存储");return entry;
            }
            String id=id();repository.insert(id,d,"S3",key,a.id());audit.record(a,"kernel.create",id,Map.of("version",d.get("version"),"sha256",d.get("sha256")));return repository.get(id);
        });
    }
    public Object upload(Actor a,String id){publisher(a);var e=repository.get(id);require(text(e,"state").equals("DRAFT"),409,"已发布或已停用的版本不能覆盖上传");return storage.upload(e);}
    public Object publish(Actor a,String id,boolean recommended){
        publisher(a);var entry=repository.get(id);String objectVersion=storage.verify(entry);
        return transaction.execute(status->{repository.lock();require(number(repository.get(id),"revision")==number(entry,"revision"),409,"校验期间版本状态已改变，请重新操作");repository.publish(id,objectVersion,recommended);audit.record(a,"kernel.publish",id,Map.of("version",entry.get("version"),"recommended",recommended));return repository.get(id);});
    }
    public void disable(Actor a,String id){publisher(a);transaction.executeWithoutResult(status->{repository.lock();repository.get(id);repository.disable(id);audit.record(a,"kernel.disable",id,Map.of());});}
    private Map<String,Object> migrationEntry(String id){var entry=new LinkedHashMap<>(repository.get(id));require(text(entry,"storageType").equals("LOCAL"),409,"此版本已使用对象存储");entry.put("storageType","S3");entry.put("storageKey",storage.objectKey(object(text(entry,"descriptor"))));return entry;}
    public Object migrationUpload(Actor a,String id){publisher(a);return storage.upload(migrationEntry(id));}
    public Object migrate(Actor a,String id){
        publisher(a);var entry=migrationEntry(id);String version=storage.verify(entry);
        return transaction.execute(status->{repository.lock();require(number(repository.get(id),"revision")==number(entry,"revision"),409,"校验期间版本状态已改变，请重新操作");repository.migrate(id,text(entry,"storageKey"),version);audit.record(a,"kernel.storage.migrate",id,Map.of("sha256",entry.get("sha256")));return repository.get(id);});
    }
    public void importLocal(Map<String,Object> input){
        var d=KernelDescriptor.validate(input);String archive=text(input,"archive");KernelDescriptor.relative(archive);
        var fixture=new LinkedHashMap<>(d);fixture.put("storageType","LOCAL");fixture.put("storageKey",archive);
        // Existing records, including disabled ones, are never overwritten on restart.
        if(repository.find(text(d,"version"),text(d,"platform"),text(d,"arch")).isPresent())return;
        storage.verify(fixture);
        transaction.executeWithoutResult(status->{repository.lock();if(repository.find(text(d,"version"),text(d,"platform"),text(d,"arch")).isPresent())return;
            String id=id();repository.insert(id,d,"LOCAL",archive,null);repository.publish(id,"",flag(input,"recommended"));});
    }
}
