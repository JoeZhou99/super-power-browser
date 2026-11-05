package com.superpower.browser.runtime;

import com.superpower.browser.shared.Db;
import java.util.*;
import org.springframework.stereotype.Repository;
import static com.superpower.browser.shared.Data.*;

@Repository
public class KernelRepository {
    private final Db db;
    public KernelRepository(Db db){this.db=db;}
    public void lock(){db.select("SELECT id FROM kernel_catalog_lock WHERE id=1 FOR UPDATE");}
    public List<Map<String,Object>> all(){return rows(db.select("SELECT * FROM kernel_release ORDER BY created_at DESC,id"));}
    public Map<String,Object> get(String id){return one(db.select("SELECT * FROM kernel_release WHERE id=?",id));}
    public Optional<Map<String,Object>> find(String version,String platform,String arch){return rows(db.select("SELECT * FROM kernel_release WHERE version=? AND platform=? AND arch=?",version,platform,arch)).stream().findFirst();}
    public void insert(String id,Map<String,Object> d,String storage,String key,String actor){
        db.execute("INSERT INTO kernel_release(id,version,platform,arch,full_version,sha256,archive_bytes,descriptor,storage_type,storage_key,state,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",id,text(d,"version"),text(d,"platform"),text(d,"arch"),text(d,"fullVersion"),text(d,"sha256"),number(d,"archiveBytes"),json(d),storage,key,"DRAFT",actor);
    }
    public void publish(String id,String objectVersion,boolean recommended){
        var entry=get(id);
        if(recommended)db.execute("UPDATE kernel_release SET recommended=FALSE,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE platform=? AND arch=? AND recommended=TRUE",entry.get("platform"),entry.get("arch"));
        db.execute("UPDATE kernel_release SET state='PUBLISHED',recommended=?,object_version=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?",recommended,objectVersion,id);
    }
    public void disable(String id){db.execute("UPDATE kernel_release SET state='DISABLED',recommended=FALSE,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?",id);}
    public void migrate(String id,String key,String version){db.execute("UPDATE kernel_release SET storage_type='S3',storage_key=?,object_version=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?",key,version,id);}
}
