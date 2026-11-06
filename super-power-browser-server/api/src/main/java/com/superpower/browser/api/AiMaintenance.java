package com.superpower.browser.api;

import com.superpower.browser.ai.AiSubscriptions;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;

@Configuration @EnableScheduling
public class AiMaintenance {
    private final AiSubscriptions subscriptions;
    public AiMaintenance(AiSubscriptions subscriptions){this.subscriptions=subscriptions;}
    @Scheduled(fixedDelay=60000,initialDelay=60000) public void reconcile(){subscriptions.reconcile();}
}
