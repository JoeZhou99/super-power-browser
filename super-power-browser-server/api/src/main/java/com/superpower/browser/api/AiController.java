package com.superpower.browser.api;

import com.superpower.browser.ai.*;
import com.superpower.browser.auth.Actor;
import com.superpower.browser.billing.PaymentGateway;
import com.superpower.browser.environment.EnvironmentService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;
import java.io.IOException;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

@RestController @RequestMapping("/api/ai")
public class AiController {
    private final AiCoupons coupons;private final AiModelService models;private final AiSkillService skills;private final AiCatalog catalog;private final AiSubscriptions subscriptions;private final AiTickets tickets;private final EnvironmentService shops;private final PaymentGateway payments;private final String publicUrl;
    public AiController(AiCoupons coupons,AiModelService models,AiSkillService skills,AiCatalog catalog,AiSubscriptions subscriptions,AiTickets tickets,EnvironmentService shops,PaymentGateway payments,@Value("${app.ai.public-url:http://127.0.0.1:8080}") String publicUrl){this.coupons=coupons;this.models=models;this.skills=skills;this.catalog=catalog;this.subscriptions=subscriptions;this.tickets=tickets;this.shops=shops;this.payments=payments;this.publicUrl=AiModelService.baseUrl(publicUrl);}
    static Object ok(Object data){return Map.of("errorCode",0,"data",data,"message","");}
    private static String session(String header){require(header!=null&&header.startsWith("Bearer "),401,"请先登录");return header.substring(7);}
    @GetMapping("/model/device/config/userImported") Object personal(@AuthenticationPrincipal Actor a,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int limit,@RequestParam(defaultValue="")String model_name){return ok(models.list(a,page,limit,model_name));}
    @PostMapping("/model/device/config/userImported/create") Object createModel(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object>b){return ok(Map.of("id",models.save(a,b,false)));}
    @PostMapping("/model/device/config/userImported/update") Object updateModel(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object>b){return ok(Map.of("id",models.save(a,b,true)));}
    @PostMapping("/model/device/config/userImported/delete") Object deleteModel(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object>b){models.delete(a,number(b,"id"));return ok(Map.of());}
    @GetMapping("/model/device/apiProvider/list") Object providers(@AuthenticationPrincipal Actor a){return ok(models.providers(a));}
    @GetMapping("/zhifu/model/user") Object user(@AuthenticationPrincipal Actor a,@RequestHeader("Authorization")String header){return ok(Map.of("username",a.username(),"api_key",tickets.issue(a,session(header),"gateway",""),"api_url",publicUrl+"/api/ai/gateway/v1"));}
    @GetMapping("/zhifu/model/market/models") Object market(@AuthenticationPrincipal Actor a){return ok(catalog.models(a));}
    @GetMapping("/zhifu/model/plan/list") Object plans(@AuthenticationPrincipal Actor a){return ok(subscriptions.plans(a));}
    @GetMapping("/zhifu/model/subscription/list") Object subscriptions(@AuthenticationPrincipal Actor a){return ok(subscriptions.subscriptions(a));}
    @GetMapping("/zhifu/model/activity/info") Object trial(@AuthenticationPrincipal Actor a){return ok(subscriptions.trial(a));}
    @PostMapping("/zhifu/model/activity/claim") Object claim(@AuthenticationPrincipal Actor a){return ok(subscriptions.claim(a));}
    @PostMapping("/zhifu/model/order/create") Object order(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object>b){return ok(subscriptions.create(a,b,false));}
    @PostMapping("/zhifu/model/subscription/renew") Object renew(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object>b){return ok(subscriptions.create(a,b,true));}
    @GetMapping("/zhifu/model/order/info") Object orderInfo(@AuthenticationPrincipal Actor a,@RequestParam String order_no){return ok(subscriptions.info(a,order_no,true));}
    @PostMapping("/zhifu/model/consume/records") Object usage(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object>b){return ok(subscriptions.usage(a,b));}
    @GetMapping("/zhifu/skillStore/{type:list|myList|uploadedList}") Object skillList(@AuthenticationPrincipal Actor a,@PathVariable String type,@RequestParam Map<String,String> q,@RequestHeader("Authorization")String header){return ok(skills.list(a,type,q,session(header)));}
    @GetMapping("/zhifu/skillStore/classfyList") Object categories(@AuthenticationPrincipal Actor a){return ok(skills.categories(a,0));}
    @GetMapping("/zhifu/skillStore/subClassfyList") Object platforms(@AuthenticationPrincipal Actor a,@RequestParam(defaultValue="2")long parent_id){return ok(skills.categories(a,parent_id));}
    @PostMapping(value="/zhifu/skillStore/{action:upload|resubmit}",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) Object upload(@AuthenticationPrincipal Actor a,@PathVariable String action,@RequestParam MultipartFile file,@RequestParam Map<String,String> q,@RequestHeader("Authorization")String header)throws IOException{
        require(file.getSize()<=50*1024*1024,413,"技能包不能超过 50 MB");return ok(skills.upload(a,file.getBytes(),file.getOriginalFilename(),q,session(header),action.equals("resubmit")?Long.valueOf(q.get("skill_store_id")):null));
    }
    @PostMapping("/zhifu/skillStore/{action:bind|unbind|delete|downloadCount}") Object skillAction(@AuthenticationPrincipal Actor a,@PathVariable String action,@RequestBody Map<String,Object>b){long id=number(b,"skill_store_id");if(action.equals("bind")||action.equals("unbind"))return ok(skills.bind(a,id,action.equals("unbind")));if(action.equals("delete"))skills.delete(a,id);else skills.downloaded(a,id);return ok(Map.of());}
    @PostMapping("/zhifu/skillStore/share/create") Object share(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object>b){return ok(skills.share(a,number(b,"skill_store_id")));}
    @PostMapping("/zhifu/skillStore/share/revoke") Object revoke(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object>b){skills.revoke(a,number(b,"id"));return ok(Map.of());}
    @GetMapping("/zhifu/skillStore/share/info") Object shareInfo(@AuthenticationPrincipal Actor a,@RequestParam String code,@RequestHeader("Authorization")String header){return ok(skills.redeem(a,code,false,session(header)));}
    @PostMapping("/zhifu/skillStore/share/bind") Object redeem(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object>b,@RequestHeader("Authorization")String header){return ok(skills.redeem(a,text(b,"code"),true,session(header)));}
    @GetMapping("/skills/files/{id}") ResponseEntity<FileSystemResource> download(@PathVariable long id,@RequestParam String ticket){return ResponseEntity.ok().header("Cache-Control","no-store").contentType(MediaType.parseMediaType("application/zip")).body(new FileSystemResource(skills.download(id,ticket)));}
    @GetMapping("/shops") Object shops(@AuthenticationPrincipal Actor a,@RequestParam(defaultValue="")String query,@RequestParam(defaultValue="")String platforms,@RequestParam(defaultValue="1")int page,@RequestParam(defaultValue="20")int size){a.allow("ai.use");return shops.aiList(a,query,platforms,page,size);}
    @GetMapping("/shops/platforms") Object shopPlatforms(@AuthenticationPrincipal Actor a){a.allow("ai.use");return shops.aiPlatforms(a);}
    @GetMapping("/ai-support/coupons") Object coupons(@AuthenticationPrincipal Actor a){a.allow("ai.use");return ok(coupons.list(a));}
    @PostMapping("/ai-support/quote") Object quote(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object>b){return ok(coupons.quote(a,b));}
    @GetMapping("/ai-support/config") Object config(@AuthenticationPrincipal Actor a){a.allow("ai.use");return ok(Map.of("contents",Map.of("ali",payments.available("alipay"),"wx",payments.available("wechat"))));}
    @PostMapping("/admin/coupons") Object issueCoupon(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object>b){return ok(Map.of("coupon_sn",coupons.issue(a,b)));}
    @PutMapping("/admin/models") Object modelConfig(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object>b){catalog.saveModel(a,b);return ok(Map.of());}
    @PutMapping("/admin/plans") Object planConfig(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object>b){subscriptions.savePlan(a,b);return ok(Map.of());}
    @DeleteMapping("/admin/plans/{id}") Object disablePlan(@AuthenticationPrincipal Actor a,@PathVariable long id){subscriptions.disablePlan(a,id);return ok(Map.of());}
    @GetMapping("/admin/skills") Object reviewQueue(@AuthenticationPrincipal Actor a,@RequestParam Map<String,String>q,@RequestHeader("Authorization")String header){return ok(skills.list(a,"review",q,session(header)));}
    @PostMapping("/admin/skills/{id}/review") Object review(@AuthenticationPrincipal Actor a,@PathVariable long id,@RequestBody Map<String,Object>b){skills.review(a,id,flag(b,"approved"),text(b,"reason"));return ok(Map.of());}
}
