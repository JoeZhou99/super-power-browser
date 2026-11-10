package com.superpower.browser.auth;

import com.superpower.browser.billing.WalletAccounts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.id;

@Component
public class Bootstrap implements ApplicationRunner {
    private final AuthRepository repository;
    private final WalletAccounts wallets;
    private final String username;
    private final String password;
    public Bootstrap(AuthRepository repository, WalletAccounts wallets,
        @Value("${app.bootstrap.username}") String username, @Value("${app.bootstrap.password}") String password) {
        this.repository=repository; this.wallets=wallets; this.username=username; this.password=password;
    }
    @Override @Transactional
    public void run(ApplicationArguments args) {
        if (repository.hasUsers()) return;
        String hash = AuthService.encodeBootstrapPassword(password);
        String tenantId = id();
        repository.createTenant(tenantId);
        repository.initializeDepartment(tenantId,tenantId,"默认部门",true);
        repository.createUser(id(),tenantId,username,hash,"管理员",true);
        wallets.open(tenantId);
    }
}
