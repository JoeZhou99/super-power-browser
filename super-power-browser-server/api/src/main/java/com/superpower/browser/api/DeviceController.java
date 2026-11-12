package com.superpower.browser.api;

import com.superpower.browser.auth.*;
import com.superpower.browser.environment.EnvironmentService;
import com.superpower.browser.device.DeviceService;
import com.superpower.browser.device.DeviceImportService;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import static com.superpower.browser.shared.Data.*;

@RestController @RequestMapping("/api")
public class DeviceController {
    private final DeviceService devices;
    private final EnvironmentService environments;
    private final DeviceImportService imports;
    public DeviceController(DeviceService devices,EnvironmentService environments,DeviceImportService imports) { this.devices=devices;this.environments=environments;this.imports=imports; }
    @GetMapping("/devices/{id}/environments") Object bindings(@AuthenticationPrincipal Actor a,@PathVariable String id) { devices.get(a,id);return environments.forDevice(a,id); }
    @GetMapping("/devices/{id}") Object device(@AuthenticationPrincipal Actor a,@PathVariable String id) { return devices.get(a,id); }
    @GetMapping("/devices") Object devices(@AuthenticationPrincipal Actor a,@RequestParam(defaultValue="1") int type,@RequestParam(defaultValue="allIp") String category,@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="false") boolean recycled) { return devices.list(a,type,category,query,page,size,recycled); }
    @GetMapping("/devices/statistics") Object deviceStats(@AuthenticationPrincipal Actor a,@RequestParam(defaultValue="1") int type,@RequestParam(defaultValue="false") boolean recycled) { return devices.statistics(a,type,recycled); }
    @PostMapping("/devices") Object addDevice(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> b) { return Map.of("id",devices.save(a,null,b)); }
    @PatchMapping("/devices/{id}") Object editDevice(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { return Map.of("id",devices.save(a,id,b)); }
    @DeleteMapping("/devices/{id}") void deleteDevice(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestParam(defaultValue="false") boolean permanent) { devices.recycle(a,id,true,permanent); }
    @PostMapping("/devices/{id}/restore") void restoreDevice(@AuthenticationPrincipal Actor a,@PathVariable String id) { devices.recycle(a,id,false,false); }
    @PatchMapping("/devices/{id}/auto-renew") void autoRenew(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { devices.autoRenew(a,id,flag(b,"enabled")); }
    @GetMapping("/devices/{id}/connection") Object connection(@AuthenticationPrincipal Actor a,@PathVariable String id) { return devices.connection(a,id); }
    @PostMapping("/devices/import") Object importDevices(@AuthenticationPrincipal Actor a,@RequestBody List<Map<String,Object>> b) { return devices.importDevices(a,b); }
    @PostMapping("/devices/import-own") Object importOwn(@AuthenticationPrincipal Actor a,@RequestBody List<Map<String,Object>> b) { return imports.importBatch(a,b); }
    @GetMapping("/devices/export") Object exportDevices(@AuthenticationPrincipal Actor a,@RequestParam int type,@RequestParam(defaultValue="allIp") String category,@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="false") boolean recycled) { return devices.export(a,type,category,query,page,recycled); }
}
