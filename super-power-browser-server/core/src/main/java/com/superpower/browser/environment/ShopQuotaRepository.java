package com.superpower.browser.environment;

import com.superpower.browser.config.ConfigOperator;
import com.superpower.browser.shared.Data;
import com.superpower.browser.shared.Db;
import java.util.*;
import org.springframework.stereotype.Repository;
import static com.superpower.browser.shared.Data.*;

/** SQL for account shop quotas. Mutating callers hold the app_user row lock. */
@Repository
class ShopQuotaRepository {
    private final Db db;
    ShopQuotaRepository(Db db) { this.db = db; }

    Map<String,Object> lockAccount(String tenantId,String userId) {
        return one(db.select("SELECT id,tenant_id,username,display_name,enabled,deleted,department_id FROM app_user WHERE id=? AND tenant_id=? FOR UPDATE",userId,tenantId));
    }
    Map<String,Object> account(String userId) {
        return one(db.select("SELECT u.id AS user_id,u.tenant_id,u.username,u.display_name,u.enabled,u.deleted,u.department_id,d.name AS department_name,t.name AS tenant_name FROM app_user u JOIN tenant t ON t.id=u.tenant_id LEFT JOIN department d ON d.id=u.department_id WHERE u.id=? AND u.deleted=FALSE",userId));
    }
    Optional<Map<String,Object>> policy(String userId) {
        return db.select("SELECT * FROM shop_creation_quota WHERE user_id=?",userId).stream().map(Data::row).findFirst();
    }
    Optional<Map<String,Object>> policy(String tenantId,String userId) {
        return db.select("SELECT * FROM shop_creation_quota WHERE user_id=? AND tenant_id=?",userId,tenantId).stream().map(Data::row).findFirst();
    }
    long used(String tenantId,String userId) {
        return number(one(db.select("SELECT COUNT(*) AS total FROM environment WHERE tenant_id=? AND owner_id=?",tenantId,userId)),"total");
    }
    List<Map<String,Object>> accounts(String query,String tenantId,String departmentId,int page,int size) {
        var args=new ArrayList<Object>();
        String where="u.deleted=FALSE";
        if(!tenantId.isBlank()){where+=" AND u.tenant_id=?";args.add(tenantId);}
        if(!departmentId.isBlank()){where+=" AND u.department_id=?";args.add(departmentId);}
        if(!query.isBlank()){where+=" AND (u.username LIKE ? OR u.display_name LIKE ? OR t.name LIKE ?)";String q="%"+query+"%";args.add(q);args.add(q);args.add(q);}
        args.add(size);args.add((long)(page-1)*size);
        return rows(db.select("SELECT u.id AS user_id,u.tenant_id,u.username,u.display_name,u.enabled,u.deleted,u.department_id,d.name AS department_name,t.name AS tenant_name,q.limit_count,q.enabled AS quota_enabled,q.revision,q.note,q.updated_by,q.updated_at,(SELECT COUNT(*) FROM environment e WHERE e.tenant_id=u.tenant_id AND e.owner_id=u.id) AS used_count FROM app_user u JOIN tenant t ON t.id=u.tenant_id LEFT JOIN department d ON d.id=u.department_id LEFT JOIN shop_creation_quota q ON q.user_id=u.id AND q.tenant_id=u.tenant_id WHERE "+where+" ORDER BY t.name,u.username,u.id LIMIT ? OFFSET ?",args.toArray()));
    }
    long accountCount(String query,String tenantId,String departmentId) {
        var args=new ArrayList<Object>();String where="u.deleted=FALSE";
        if(!tenantId.isBlank()){where+=" AND u.tenant_id=?";args.add(tenantId);}
        if(!departmentId.isBlank()){where+=" AND u.department_id=?";args.add(departmentId);}
        if(!query.isBlank()){where+=" AND (u.username LIKE ? OR u.display_name LIKE ? OR t.name LIKE ?)";String q="%"+query+"%";args.add(q);args.add(q);args.add(q);}
        return number(one(db.select("SELECT COUNT(*) AS total FROM app_user u JOIN tenant t ON t.id=u.tenant_id WHERE "+where,args.toArray())),"total");
    }
    int save(String userId,String tenantId,long limit,boolean enabled,String note,long revision,boolean create,String operatorId) {
        if(create) return db.execute("INSERT INTO shop_creation_quota(user_id,tenant_id,limit_count,enabled,revision,note,updated_by) VALUES(?,?,?,?,1,?,?)",userId,tenantId,limit,enabled,note,operatorId);
        return db.execute("UPDATE shop_creation_quota SET limit_count=?,enabled=?,revision=revision+1,note=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND tenant_id=? AND revision=?",limit,enabled,note,operatorId,userId,tenantId,revision);
    }
    void audit(ConfigOperator operator,String tenantId,String userId,Map<String,Object> before,long limit,boolean enabled,long revision,String reason) {
        Object oldLimit=before.isEmpty()?null:before.get("limitCount"), oldEnabled=before.isEmpty()?null:before.get("enabled"), oldRevision=before.isEmpty()?null:before.get("revision");
        db.execute("INSERT INTO shop_quota_audit(id,tenant_id,user_id,operator_id,operator_name,before_limit,after_limit,before_enabled,after_enabled,before_revision,after_revision,reason) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",id(),tenantId,userId,operator.id(),operator.username(),oldLimit,limit,oldEnabled,enabled,oldRevision,revision,reason);
    }
    List<Map<String,Object>> audit(String userId,int page,int size) {
        return rows(db.select("SELECT id,user_id,operator_id,operator_name,before_limit,after_limit,before_enabled,after_enabled,before_revision,after_revision,reason,created_at FROM shop_quota_audit WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",userId,size,(long)(page-1)*size));
    }
}
