package com.superpower.browser.api;

import com.superpower.browser.auth.*;
import com.superpower.browser.environment.EnvironmentService;
import com.superpower.browser.device.DeviceService;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import static com.superpower.browser.shared.Data.*;

@RestController @RequestMapping("/api")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth=auth; }
    @GetMapping("/health") Object health() { return Map.of("status","UP","version","0.1.0"); }
    @PostMapping("/auth/login") Object login(@RequestBody Map<String,Object> body,jakarta.servlet.http.HttpServletRequest request) { return auth.login(body,Objects.toString(request.getHeader("User-Agent"),""),request.getRemoteAddr()); }
    @GetMapping("/me/profile") Object profile(@AuthenticationPrincipal Actor a) { return auth.profile(a); }
    @PatchMapping("/me/profile") void profile(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> b) { auth.updateProfile(a,b); }
    @PostMapping("/me/password") void password(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> b) { auth.changePassword(a,b); }
    @GetMapping("/me/sessions") Object sessions(@AuthenticationPrincipal Actor a,@RequestHeader("Authorization") String header) { return auth.sessions(a,header.substring(7)); }
    @DeleteMapping("/me/sessions/{id}") void revokeSession(@AuthenticationPrincipal Actor a,@PathVariable String id) { auth.revokeSession(a,id); }
    @PostMapping("/auth/logout") void logout(@RequestHeader("Authorization") String header) { auth.logout(header.substring(7)); }
    @GetMapping("/me/permissions") Actor me(@AuthenticationPrincipal Actor a) { return a; }
    @GetMapping("/members") Object members(@AuthenticationPrincipal Actor a) { return auth.members(a); }
    @PostMapping("/members") Object addMember(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> b) { return Map.of("id",auth.saveMember(a,null,b)); }
    @PatchMapping("/members/{id}") Object editMember(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { return Map.of("id",auth.saveMember(a,id,b)); }
    @GetMapping("/roles") Object roles(@AuthenticationPrincipal Actor a) { return auth.roles(a); }
    @GetMapping("/permission-nodes") Object permissions(@AuthenticationPrincipal Actor a) { a.allow("role.manage");return a.permissions(); }
    @PostMapping("/roles") Object addRole(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> b) { return Map.of("id",auth.saveRole(a,null,b)); }
    @PatchMapping("/roles/{id}") Object editRole(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { return Map.of("id",auth.saveRole(a,id,b)); }
    @DeleteMapping("/roles/{id}") void deleteRole(@AuthenticationPrincipal Actor a,@PathVariable String id) { auth.deleteRole(a,id); }
    @PutMapping("/roles/{id}/members") void roleMembers(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { auth.bindRoleMembers(a,id,strings(b,"members")); }
    @PutMapping("/members/{id}/roles") void bindRoles(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { auth.bindRoles(a,id,strings(b,"roles")); }
}
