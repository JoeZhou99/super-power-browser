package com.superpower.browser.api;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.device.FreeProxyService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/free-proxies")
public class FreeProxyController {
    private final FreeProxyService service;
    public FreeProxyController(FreeProxyService service) { this.service=service; }
    @GetMapping Object availability(@AuthenticationPrincipal Actor actor) { return service.availability(actor); }
    @PostMapping("/claim") Object claim(@AuthenticationPrincipal Actor actor) { return service.claim(actor); }
}
