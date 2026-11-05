package com.superpower.browser.api;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.runtime.KernelCatalog;
import java.util.Map;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/runtime")
public class RuntimeController {
    private final KernelCatalog catalog;
    private final String updates;
    public RuntimeController(KernelCatalog catalog,@Value("${app.update-manifest}") String updates) { this.catalog=catalog;this.updates=updates; }
    @GetMapping("/kernels") Object kernels(@AuthenticationPrincipal Actor a) {
        if(!a.permissions().contains("shop.create")&&!a.permissions().contains("shop.edit"))a.allow("shop.open");
        return catalog.list();
    }
    @GetMapping("/kernels/{version}/archive") ResponseEntity<FileSystemResource> archive(@AuthenticationPrincipal Actor a,@PathVariable String version) {
        a.allow("shop.open");
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(new FileSystemResource(catalog.archive(version)));
    }
    @GetMapping("/kernels/{version}/download") ResponseEntity<Object> download(@AuthenticationPrincipal Actor a,@PathVariable String version) {
        a.allow("shop.open");return ResponseEntity.ok().header("Cache-Control","no-store").body(catalog.download(version));
    }
    @GetMapping("/releases") Object releases(@AuthenticationPrincipal Actor a){return catalog.adminList(a);}
    @PostMapping("/releases") Object create(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> body){return catalog.create(a,body);}
    @PostMapping("/releases/{id}/upload") ResponseEntity<Object> upload(@AuthenticationPrincipal Actor a,@PathVariable String id){return ResponseEntity.ok().header("Cache-Control","no-store").body(catalog.upload(a,id));}
    @PostMapping("/releases/{id}/publish") Object publish(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> body){return catalog.publish(a,id,Boolean.TRUE.equals(body.get("recommended")));}
    @PostMapping("/releases/{id}/disable") void disable(@AuthenticationPrincipal Actor a,@PathVariable String id){catalog.disable(a,id);}
    @PostMapping("/releases/{id}/storage/upload") ResponseEntity<Object> migrateUpload(@AuthenticationPrincipal Actor a,@PathVariable String id){return ResponseEntity.ok().header("Cache-Control","no-store").body(catalog.migrationUpload(a,id));}
    @PostMapping("/releases/{id}/storage/activate") Object migrate(@AuthenticationPrincipal Actor a,@PathVariable String id){return catalog.migrate(a,id);}
    @GetMapping("/updates") Object updates() { return Map.of("manifestUrl",updates); }
}
