package com.superpower.browser.api;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.billing.BillingService;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class BillingController {
    private final BillingService billing;
    public BillingController(BillingService billing) { this.billing=billing; }
    @GetMapping("/billing/capabilities") Object capabilities() { return billing.capabilities(); }
    @GetMapping("/wallet") Object wallet(@AuthenticationPrincipal Actor a) { return billing.wallet(a); }
    @GetMapping("/catalog") Object catalog(@AuthenticationPrincipal Actor a) { return billing.catalog(a); }
    @PostMapping("/quotes") Object quote(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> b) { return billing.quote(a,b); }
    @PostMapping("/recharges") Object recharge(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> b) { return billing.recharge(a,b); }
    @PostMapping("/orders") Object buy(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> b) { return billing.buy(a,b); }
    @GetMapping("/orders") Object orders(@AuthenticationPrincipal Actor a,@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="") String status,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size,@RequestParam Map<String,String> filters) { return billing.filtered(a,query,status,page,size,filters); }
    @GetMapping("/orders/{id}") Object order(@AuthenticationPrincipal Actor a,@PathVariable String id) { return billing.order(a,id); }
    @PostMapping("/orders/{id}/payment") Object pay(@AuthenticationPrincipal Actor a,@PathVariable String id) { return billing.continuePayment(a,id); }
    @PostMapping("/orders/{id}/refresh") Object refresh(@AuthenticationPrincipal Actor a,@PathVariable String id) { return billing.refresh(a,id); }
    @PostMapping("/orders/{id}/cancel") void cancel(@AuthenticationPrincipal Actor a,@PathVariable String id) { billing.cancel(a,id); }
    @GetMapping("/orders/export") Object export(@AuthenticationPrincipal Actor a,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="") String status,@RequestParam Map<String,String> filters) { a.allow("order.export"); return billing.filtered(a,query,status,page,200,filters); }
}
