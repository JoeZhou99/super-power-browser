package com.superpower.browser.api;

import com.superpower.browser.auth.*;
import com.superpower.browser.environment.EnvironmentService;
import com.superpower.browser.device.DeviceService;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import static com.superpower.browser.shared.Data.*;

@RestController @RequestMapping("/api")
public class EnvironmentController {
    private final EnvironmentService shops;
    public EnvironmentController(EnvironmentService shops) { this.shops=shops; }
    @GetMapping("/environments") Object shops(@AuthenticationPrincipal Actor a,@RequestParam(defaultValue="all") String category,@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="false") boolean recycled) { return shops.list(a,category,query,page,size,recycled); }
    @GetMapping("/environments/statistics") Object shopStats(@AuthenticationPrincipal Actor a,@RequestParam(defaultValue="false") boolean recycled) { return shops.statistics(a,recycled); }
    @GetMapping("/members/{id}/environments") Object memberShops(@AuthenticationPrincipal Actor a,@PathVariable String id) { return shops.forMember(a,id); }
    @GetMapping("/environments/{id}") Object shop(@AuthenticationPrincipal Actor a,@PathVariable String id) { var result=shops.get(a,id,"shop.view");result.remove("accountPassword");return result; }
    @PostMapping("/environments") Object addShop(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> b) { return Map.of("id",shops.save(a,null,b)); }
    @PatchMapping("/environments/{id}") Object editShop(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { return Map.of("id",shops.save(a,id,b)); }
    @PostMapping("/environments/{id}/copy") Object copyShop(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody(required=false) Map<String,Object> b) { return Map.of("id",b==null?shops.copy(a,id):shops.copy(a,id,b)); }
    @GetMapping("/environments/{id}/events") Object shopEvents(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) { return shops.events(a,id,page,size); }
    @DeleteMapping("/environments/{id}") void deleteShop(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestParam(defaultValue="false") boolean permanent) { shops.recycle(a,id,true,permanent); }
    @PostMapping("/environments/{id}/restore") void restoreShop(@AuthenticationPrincipal Actor a,@PathVariable String id) { shops.recycle(a,id,false,false); }
    @PutMapping("/environments/{id}/favorite") void favorite(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { shops.favorite(a,id,flag(b,"favorite")); }
    @PutMapping("/environments/{id}/device") void binding(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { shops.bind(a,id,text(b,"deviceId")); }
    @GetMapping("/environments/{id}/grants") Object grants(@AuthenticationPrincipal Actor a,@PathVariable String id) { return shops.grants(a,id); }
    @PostMapping("/environments/{id}/grants") void grant(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { shops.grant(a,id,strings(b,"members"),false); }
    @DeleteMapping("/environments/{id}/grants/{member}") void revoke(@AuthenticationPrincipal Actor a,@PathVariable String id,@PathVariable String member) { shops.grant(a,id,List.of(member),true); }
    @GetMapping("/environments/{id}/launch-config") Object launch(@AuthenticationPrincipal Actor a,@PathVariable String id) { return shops.launch(a,id); }
    @GetMapping("/environments/{id}/access") Object access(@AuthenticationPrincipal Actor a,@PathVariable String id) { shops.checkAccess(a,id);return Map.of("allowed",true); }
    @PostMapping("/environments/import") Object importShops(@AuthenticationPrincipal Actor a,@RequestBody List<Map<String,Object>> b) { return shops.importEnvironments(a,b); }
    @GetMapping("/environments/export") Object exportShops(@AuthenticationPrincipal Actor a,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="all") String category,@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="false") boolean recycled) { a.allow("shop.export"); return shops.list(a,category,query,page,200,recycled); }
    @PostMapping("/environments/export") Object exportSelectedShops(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> body) {
        return shops.exportSelected(a,strings(body,"ids"));
    }
}
