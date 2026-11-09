package com.superpower.browser.api;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.device.ProxyService;
import com.superpower.browser.environment.EnvironmentService;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/proxies")
public class ProxyController {
    private final ProxyService proxies;
    private final EnvironmentService environments;
    public ProxyController(ProxyService proxies,EnvironmentService environments){this.proxies=proxies;this.environments=environments;}
    @GetMapping Object list(@AuthenticationPrincipal Actor actor,@RequestParam(defaultValue="0") int webType,@RequestParam(defaultValue="") String protocol,@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="false") boolean recycled){return proxies.list(actor,webType,protocol,query,page,size,recycled);}
    @GetMapping("/{id}") Object get(@AuthenticationPrincipal Actor actor,@PathVariable String id){return proxies.get(actor,id);}
    @PostMapping Object create(@AuthenticationPrincipal Actor actor,@RequestBody Map<String,Object> body){return Map.of("id",proxies.save(actor,null,body));}
    @PatchMapping("/{id}") Object update(@AuthenticationPrincipal Actor actor,@PathVariable String id,@RequestBody Map<String,Object> body){return Map.of("id",proxies.save(actor,id,body));}
    @PostMapping("/import") Object importAll(@AuthenticationPrincipal Actor actor,@RequestBody List<Map<String,Object>> body){return proxies.importAll(actor,body);}
    @DeleteMapping("/{id}") void delete(@AuthenticationPrincipal Actor actor,@PathVariable String id,@RequestParam(defaultValue="false") boolean permanent){proxies.recycle(actor,id,true,permanent);}
    @PostMapping("/{id}/restore") void restore(@AuthenticationPrincipal Actor actor,@PathVariable String id){proxies.recycle(actor,id,false,false);}
    @GetMapping("/{id}/environments") Object environments(@AuthenticationPrincipal Actor actor,@PathVariable String id){proxies.get(actor,id);return environments.forDevice(actor,id);}
    @GetMapping("/{id}/connection") Object connection(@AuthenticationPrincipal Actor actor,@PathVariable String id){return proxies.connection(actor,id);}
    @GetMapping("/{id}/credentials") ResponseEntity<?> credentials(@AuthenticationPrincipal Actor actor,@PathVariable String id){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(proxies.credentials(actor,id));}
    @PostMapping("/{id}/check-result") Object checked(@AuthenticationPrincipal Actor actor,@PathVariable String id,@RequestBody Map<String,Object> body){return proxies.checkResult(actor,id,body);}
}
