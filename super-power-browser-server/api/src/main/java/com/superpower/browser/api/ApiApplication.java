package com.superpower.browser.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.mybatis.spring.annotation.MapperScan;

@SpringBootApplication(scanBasePackages="com.superpower.browser")
@MapperScan(basePackages="com.superpower.browser.shared", annotationClass=org.apache.ibatis.annotations.Mapper.class)
public class ApiApplication {
    public static void main(String[] args) { SpringApplication.run(ApiApplication.class,args); }
}
