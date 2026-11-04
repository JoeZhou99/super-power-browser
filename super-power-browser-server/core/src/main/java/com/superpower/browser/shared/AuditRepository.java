package com.superpower.browser.shared;

import com.superpower.browser.auth.Actor;
import org.springframework.stereotype.Repository;
import static com.superpower.browser.shared.Data.*;

@Repository
public class AuditRepository {
    private final Db db;
    public AuditRepository(Db db) { this.db = db; }
    public void record(Actor actor, String action, String resource, Object detail) {
        db.execute("INSERT INTO audit_event(id,tenant_id,actor_id,action,resource_id,detail) VALUES(?,?,?,?,?,?)",
            id(), actor.tenantId(), actor.id(), action, resource, json(detail));
    }
    public java.util.Map<String,Object> list(Actor actor,String resource,int page,int size) {
        long total=number(one(db.select("SELECT COUNT(*) AS total FROM audit_event WHERE tenant_id=? AND resource_id=?",actor.tenantId(),resource)),"total");
        var events=rows(db.select("SELECT a.id,a.action,a.detail,a.created_at,u.display_name AS actor_name FROM audit_event a LEFT JOIN app_user u ON u.id=a.actor_id WHERE a.tenant_id=? AND a.resource_id=? ORDER BY a.created_at DESC LIMIT ? OFFSET ?",actor.tenantId(),resource,size,(page-1)*size));
        return java.util.Map.of("items",events,"total",total);
    }
}
