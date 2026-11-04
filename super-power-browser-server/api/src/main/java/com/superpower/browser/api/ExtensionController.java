package com.superpower.browser.api;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.extension.*;
import com.superpower.browser.shared.*;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import static com.superpower.browser.shared.Data.*;

@RestController
public class ExtensionController {
    private final ExtensionSessions sessions;private final ExtensionService service;
    public ExtensionController(ExtensionSessions sessions,ExtensionService service){this.sessions=sessions;this.service=service;}
    @PostMapping("/api/environments/{id}/extension-sessions") Object create(@AuthenticationPrincipal Actor actor,@PathVariable String id,@RequestHeader("Authorization") String header) {return sessions.create(actor,id,header.substring(7));}
    @DeleteMapping("/api/environments/{id}/extension-sessions/{sessionId}") void revoke(@AuthenticationPrincipal Actor actor,@PathVariable String id,@PathVariable String sessionId){sessions.revoke(actor,id,sessionId);}
    @GetMapping("/extension/capabilities") Object capabilities(){return service.capabilities();}
    @GetMapping("/extension/bootstrap") Object bootstrap(@RequestAttribute("extensionSession") ExtensionSessions.Context c){return service.bootstrap(c);}
    @GetMapping("/extension/services/cyt-browser-oss/whiteList_data.json") Object whiteList(){return List.of();}
    @RequestMapping(value="/extension/api/v1/**",method={RequestMethod.GET,RequestMethod.POST}) Object call(
        @RequestAttribute("extensionSession") ExtensionSessions.Context context,HttpServletRequest request,
        @RequestParam Map<String,String> query,@RequestBody(required=false) Map<String,Object> body) {
        String method=ExtensionService.ROUTES.get(request.getRequestURI().substring("/extension".length()));
        if(method==null)throw new BusinessException(404,"插件接口不存在");
        boolean write=Set.of("saveMallJumpMethod","saveMallJumpUrls","addTagPages","setAuthenticationCode","saveBookmark","applyWhite","applyWhiteV2","setCookie","reviewReason","reviewReasonV2","decryptData","reportVerification","reportCheckForcedOffline","setAccessStatus","saveWebpage","batchSaveUrl","savePasskey","transferSpeed","updateMainTransfer","createAccountData","editAccountData","removeAccountData","addCustomSiteInfo","delCustomSiteInfo").contains(method);
        BusinessException.require(request.getMethod().equals(write?"POST":"GET"),405,"插件请求方法不匹配");
        var input=new LinkedHashMap<String,Object>(query);
        if(body!=null)input.putAll("1".equals(request.getHeader("encryption"))?object(ExtensionCrypto.decode(required(body,"data",3000000))):body);
        return service.call(context,method,input);
    }
    @ExceptionHandler(BusinessException.class) org.springframework.http.ResponseEntity<?> error(BusinessException e) {
        return org.springframework.http.ResponseEntity.status(e.status).body(Map.of("errorCode",e.status,"message",e.getMessage()));
    }
}
