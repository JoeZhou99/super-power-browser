package com.superpower.browser.api;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.runtime.LegacyRuntimeAdapter;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/runtime")
public class RuntimeController {
    private final LegacyRuntimeAdapter legacy;
    private final String updates;
    public RuntimeController(LegacyRuntimeAdapter legacy,@Value("${app.update-manifest}") String updates) { this.legacy=legacy;this.updates=updates; }
    @GetMapping("/credential") Object credential(@AuthenticationPrincipal Actor a) { a.allow("shop.open");return legacy.credential(); }
    @GetMapping("/kernels") Object kernels(@AuthenticationPrincipal Actor a) { a.allow("shop.open");return legacy.kernels(); }
    @GetMapping("/updates") Object updates() { return Map.of("manifestUrl",updates); }
}
