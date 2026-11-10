package com.superpower.browser.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class ConfigurationBootstrap implements ApplicationRunner {
    private final BrowserConfiguration configs;
    private final ConfigOperatorAuth operators;
    private final String username,password;
    public ConfigurationBootstrap(BrowserConfiguration configs,ConfigOperatorAuth operators,
        @Value("${OPS_ADMIN_USERNAME:}") String username,@Value("${OPS_ADMIN_PASSWORD:}") String password) {
        this.configs=configs;this.operators=operators;this.username=username;this.password=password;
    }
    @Override public void run(ApplicationArguments args) {
        configs.initialize();operators.bootstrap(username,password);
    }
}
