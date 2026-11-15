package com.superpower.browser.environment;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.config.ConfigOperator;
import com.superpower.browser.shared.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.BusinessException.require;
import static com.superpower.browser.shared.Data.*;

/**
 * Account-level shop quota enforcement. The member row is the serialization
 * point shared by creation and admin updates; the usage is derived from
 * environment ownership so failed transactions cannot leak a reservation.
 */
@Service
public class ShopQuotaService {
    public static final long UNLIMITED=-1L;
    private static final long MAX_LIMIT=1_000_000L;
    private final ShopQuotaRepository repository;
    public ShopQuotaService(ShopQuotaRepository repository) { this.repository=repository; }

    public record Decision(long limit,long used) {
        public long remaining() { return limit<0?Long.MAX_VALUE:Math.max(0,limit-used); }
        public boolean limited() { return limit>=0; }
    }

    /** Must run inside the caller's creation transaction before inserting an environment. */
    @Transactional
    public Decision check(Actor actor) {
        var account=repository.lockAccount(actor.tenantId(),actor.id());
        require(flag(account,"enabled")&&!flag(account,"deleted"),401,"成员已停用，请重新登录");
        var policy=repository.policy(actor.tenantId(),actor.id());
        if(policy.isEmpty()||!flag(policy.get(),"enabled")) return new Decision(UNLIMITED,repository.used(actor.tenantId(),actor.id()));
        long limit=number(policy.get(),"limitCount"),used=repository.used(actor.tenantId(),actor.id());
        if(limit>=0&&used>=limit) throw new BusinessException(409,"SHOP_QUOTA_EXCEEDED","店铺创建数量已达上限，请联系管理员");
        return new Decision(limit,used);
    }

    public Map<String,Object> list(ConfigOperator operator,String query,String tenantId,String departmentId,int page,int size) {
        require(operator!=null,401,"请先登录");require(page>0&&size>0&&size<=200,400,"分页参数不合法");
        require(query.length()<=200&&tenantId.length()<=36&&departmentId.length()<=36,400,"查询参数不合法");
        var items=repository.accounts(query,tenantId,departmentId,page,size);
        items.forEach(this::decorate);return Map.of("items",items,"total",repository.accountCount(query,tenantId,departmentId));
    }
    public Map<String,Object> get(ConfigOperator operator,String userId) {
        require(operator!=null,401,"请先登录");require(userId.length()<=36,400,"账号 ID 不合法");
        var account=repository.account(userId);
        String accountTenant=text(account,"tenantId");
        repository.policy(accountTenant,userId).ifPresent(policy -> {
            account.put("limitCount",policy.get("limitCount"));
            account.put("quotaEnabled",policy.get("enabled"));
            account.put("revision",policy.get("revision"));
            account.put("note",policy.get("note"));
            account.put("updatedBy",policy.get("updatedBy"));
            account.put("updatedAt",policy.get("updatedAt"));
        });
        return decorate(account);
    }
    @Transactional
    public Map<String,Object> save(ConfigOperator operator,String userId,Map<String,Object> request) {
        require(operator!=null,401,"请先登录");require(userId.length()<=36,400,"账号 ID 不合法");
        long limit=request.containsKey("limitCount")?number(request,"limitCount"):UNLIMITED;
        require(limit>=UNLIMITED&&limit<=MAX_LIMIT,400,"店铺额度必须为 -1 至 1000000 的整数（-1 表示不限）");
        boolean enabled=!request.containsKey("enabled")||flag(request,"enabled");
        String note=text(request,"note").trim();require(note.length()<=500,400,"备注最多 500 字");
        var account=repository.account(userId);String tenantId=text(account,"tenantId");
        // Admin writes use the same account lock as creation. A lowered limit
        // is allowed and takes effect on the next creation attempt.
        repository.lockAccount(tenantId,userId);
        var before=repository.policy(tenantId,userId).map(ShopQuotaService::publicPolicy).orElseGet(Map::of);
        long revision=before.isEmpty()?0:number(before,"revision");
        if(request.containsKey("revision")) require(number(request,"revision")==revision,409,"额度配置已被其他管理员修改，请刷新后重试");
        boolean create=before.isEmpty();
        int changed=repository.save(userId,tenantId,limit,enabled,note,revision,create,operator.id());
        require(changed==1,409,"额度配置已被其他管理员修改，请刷新后重试");
        long nextRevision=create?1:revision+1;
        repository.audit(operator,tenantId,userId,before,limit,enabled,nextRevision,note);
        return get(operator,userId);
    }
    public List<Map<String,Object>> audit(ConfigOperator operator,String userId,int page,int size) {
        require(operator!=null,401,"请先登录");require(page>0&&size>0&&size<=100,400,"分页参数不合法");
        get(operator,userId);return repository.audit(userId,page,size);
    }
    private Map<String,Object> decorate(Map<String,Object> row) {
        long used=row.containsKey("usedCount")?number(row,"usedCount"):repository.used(text(row,"tenantId"),text(row,"userId"));
        long limit=row.get("limitCount")==null?UNLIMITED:number(row,"limitCount");
        boolean enabled=row.get("quotaEnabled")==null||flag(row,"quotaEnabled");
        long effective=enabled?limit:UNLIMITED;
        row.putIfAbsent("revision",0L);
        row.putIfAbsent("note","");
        row.put("limitCount",limit);row.put("quotaEnabled",enabled);row.put("usedCount",used);
        row.put("remainingCount",effective<0?null:Math.max(0,effective-used));
        row.put("unlimited",effective<0);return row;
    }
    private static Map<String,Object> publicPolicy(Map<String,Object> row) {
        var result=new LinkedHashMap<String,Object>();
        result.put("limitCount",row.get("limitCount"));result.put("enabled",row.get("enabled"));result.put("revision",row.get("revision"));
        result.put("note",row.get("note"));return result;
    }
}
