package com.superpower.browser.api;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.environment.PlatformCatalog;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/platform-sites")
public class PlatformController {
    private final PlatformCatalog catalog;
    public PlatformController(PlatformCatalog catalog){this.catalog=catalog;}

    @GetMapping
    public PlatformCatalog.Catalog list(@AuthenticationPrincipal Actor actor){
        if(!actor.permissions().contains("shop.create")&&!actor.permissions().contains("shop.edit"))actor.allow("shop.view");
        return catalog.list();
    }
}
