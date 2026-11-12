package com.superpower.browser.api;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.device.RelayPoolService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class RelayPoolController {
    private final RelayPoolService pools;
    public RelayPoolController(RelayPoolService pools) { this.pools=pools; }
    @GetMapping("/api/relay-pools") public Object available(@AuthenticationPrincipal Actor actor) { return pools.available(actor); }
}
