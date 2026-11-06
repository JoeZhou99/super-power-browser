package com.superpower.browser.runtime;

import java.nio.file.*;
import java.util.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Optional import of the development file catalog into the database. */
@Component
public class KernelBootstrap implements ApplicationRunner {
    private final KernelCatalog catalog;private final String manifest;
    public KernelBootstrap(KernelCatalog catalog,@Value("${app.kernel-manifest:}") String manifest){this.catalog=catalog;this.manifest=manifest;}
    @Override @SuppressWarnings("unchecked") public void run(ApplicationArguments args)throws Exception{
        if(manifest.isBlank())return;
        Path file=Path.of(manifest);require(Files.size(file)<=4*1024*1024,503,"内核清单过大");var data=object(Files.readString(file));
        require(number(data,"schemaVersion")==1&&data.get("kernels") instanceof List<?>,503,"本地内核清单格式不正确");
        for(Object item:(List<?>)data.get("kernels")){require(item instanceof Map<?,?>,503,"本地内核记录不合法");catalog.importLocal((Map<String,Object>)item);}
    }
}
