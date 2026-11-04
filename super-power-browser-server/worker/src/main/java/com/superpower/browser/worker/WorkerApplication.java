package com.superpower.browser.worker;

import com.superpower.browser.billing.BackgroundOperations;
import java.util.UUID;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.*;

@SpringBootApplication(scanBasePackages={"com.superpower.browser.auth","com.superpower.browser.environment","com.superpower.browser.device","com.superpower.browser.billing","com.superpower.browser.shared","com.superpower.browser.runtime"})
@MapperScan(basePackages="com.superpower.browser.shared",annotationClass=org.apache.ibatis.annotations.Mapper.class)
@EnableScheduling
public class WorkerApplication {
    public static void main(String[] args) { SpringApplication.run(WorkerApplication.class,args); }
    @Bean Jobs jobs(BackgroundOperations operations) { return new Jobs(operations); }
    static class Jobs {
        private final BackgroundOperations operations;
        private final String id=UUID.randomUUID().toString();
        Jobs(BackgroundOperations operations) { this.operations=operations; }
        @Scheduled(fixedDelay=30000) public void payments() { operations.pollPayments(); }
        @Scheduled(fixedDelay=3000) public void delivery() { operations.deliverOne(id); }
        @Scheduled(fixedDelay=300000) public void renewal() { operations.renewDueDevices(); }
    }
}
