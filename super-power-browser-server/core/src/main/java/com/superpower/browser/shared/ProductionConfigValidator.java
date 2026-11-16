package com.superpower.browser.shared;

import java.net.URI;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

/** Refuse unsafe defaults before a production API or worker can accept traffic. */
@Component
@Profile("prod")
public final class ProductionConfigValidator {
    @Value("${spring.datasource.url:}") private String databaseUrl;
    @Value("${spring.datasource.password:}") private String databasePassword;
    @Value("${spring.data.redis.host:}") private String redisHost;
    @Value("${app.data-key:}") private String dataKey;
    @Value("${app.bootstrap.password:}") private String adminPassword;
    @Value("${OPS_ADMIN_PASSWORD:}") private String operatorPassword;
    @Value("${app.ai.public-url:}") private String aiPublicUrl;
    @Value("${app.kernels.bucket:}") private String kernelBucket;
    @Value("${app.kernels.publisher-ids:}") private String kernelPublishers;

    @PostConstruct
    void validate() {
        required("spring.datasource.url", databaseUrl);
        rejectLocal("spring.datasource.url", databaseUrl);
        required("spring.datasource.password", databasePassword);
        required("spring.data.redis.host", redisHost);
        rejectLocal("spring.data.redis.host", redisHost);
        validateKey();
        validatePassword("app.bootstrap.password", adminPassword);
        validatePassword("OPS_ADMIN_PASSWORD", operatorPassword);
        validateHttps("app.ai.public-url", aiPublicUrl);
        required("app.kernels.bucket", kernelBucket);
        required("app.kernels.publisher-ids", kernelPublishers);
    }

    private void validateKey() {
        required("app.data-key", dataKey);
        try {
            if (Base64.getDecoder().decode(dataKey).length != 32) throw new IllegalArgumentException();
        } catch (IllegalArgumentException error) {
            throw new IllegalStateException("APP_DATA_KEY must be Base64 for exactly 32 bytes");
        }
    }

    private static void validatePassword(String name,String value) {
        required(name,value);
        int bytes=value.getBytes(java.nio.charset.StandardCharsets.UTF_8).length;
        if(bytes<12||bytes>72)throw new IllegalStateException(name+" must be 12-72 UTF-8 bytes");
    }

    private static void validateHttps(String name,String value) {
        required(name,value);
        try {
            URI uri=URI.create(value);
            if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null)throw new IllegalArgumentException();
        } catch(IllegalArgumentException error) { throw new IllegalStateException(name+" must be an HTTPS URL"); }
    }

    private static void required(String name,String value) {
        if(value==null||value.isBlank())throw new IllegalStateException(name+" is required in the prod profile");
    }

    private static void rejectLocal(String name,String value) {
        String normalized=value.toLowerCase(java.util.Locale.ROOT);
        if(normalized.contains("localhost")||normalized.contains("127.0.0.1")||normalized.contains("::1"))
            throw new IllegalStateException(name+" must not point to localhost in the prod profile");
    }
}
