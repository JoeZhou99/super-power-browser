package com.superpower.browser.api;

import com.superpower.browser.config.*;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ConfigurationController {
    private final BrowserConfiguration configs;
    private final ConfigOperatorAuth operators;
    private final PublicAuthRateLimiter loginLimits=new PublicAuthRateLimiter();
    public ConfigurationController(BrowserConfiguration configs,ConfigOperatorAuth operators) { this.configs=configs;this.operators=operators; }

    @GetMapping("/browser-config") public Object browserConfig() { return configs.client(); }
    @PostMapping("/admin/auth/login") public Object login(@RequestBody Map<String,Object> body,jakarta.servlet.http.HttpServletRequest request) {
        loginLimits.check("ops-login",request.getRemoteAddr(),10);return operators.login(body);
    }
    @GetMapping("/admin/auth/me") public ConfigOperator me(@AuthenticationPrincipal ConfigOperator operator) { return operator; }
    @PostMapping("/admin/auth/logout") public void logout(@RequestHeader("Authorization") String header) { operators.logout(header.substring(7)); }
    @GetMapping("/admin/configs") public Object configs(@AuthenticationPrincipal ConfigOperator operator) { return configs.list(operator); }
    @GetMapping("/admin/configs/{key}") public Object config(@AuthenticationPrincipal ConfigOperator operator,@PathVariable String key) { return configs.get(operator,key); }
    @PutMapping("/admin/configs/{key}") public Object save(@AuthenticationPrincipal ConfigOperator operator,@PathVariable String key,@RequestBody Map<String,Object> body) { return configs.save(operator,key,body); }
    @GetMapping("/admin/config-audit") public Object audit(@AuthenticationPrincipal ConfigOperator operator,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) { return configs.audit(operator,page,size); }
}
