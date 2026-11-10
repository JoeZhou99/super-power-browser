package com.superpower.browser.api;

import com.superpower.browser.auth.*;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import static com.superpower.browser.shared.Data.*;

@RestController @RequestMapping("/api")
public class AuthController {
    private final AuthService auth;
    private final PublicAuthRateLimiter publicLimits = new PublicAuthRateLimiter();
    public AuthController(AuthService auth) { this.auth=auth; }
    @GetMapping("/health") Object health() { return Map.of("status","UP","version","0.1.0"); }
    @PostMapping("/auth/login") Object login(@RequestBody Map<String,Object> body,jakarta.servlet.http.HttpServletRequest request) { return auth.login(body,Objects.toString(request.getHeader("User-Agent"),""),request.getRemoteAddr()); }
    @PostMapping("/auth/register") Object register(@RequestBody Map<String,Object> body,jakarta.servlet.http.HttpServletRequest request) {
        publicLimits.check("register",request.getRemoteAddr(),12);
        return auth.register(body,Objects.toString(request.getHeader("User-Agent"),""),request.getRemoteAddr());
    }
    @GetMapping("/auth/invitations/{token}") Object invitationInfo(@PathVariable String token) { return auth.invitationInfo(token); }
    @PostMapping("/auth/invitations/{token}/applications") Object applyInvitation(@PathVariable String token,@RequestBody Map<String,Object> body,jakarta.servlet.http.HttpServletRequest request) {
        publicLimits.check("apply",request.getRemoteAddr(),20);
        return auth.applyInvitation(token,body);
    }
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
    @GetMapping("/members/{id}/departure") Object departure(@AuthenticationPrincipal Actor a,@PathVariable String id) { return auth.departure(a,id); }
    @DeleteMapping("/members/{id}") void deleteMember(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody(required=false) Map<String,Object> b) { auth.deleteMember(a,id,b==null?Map.of():b); }
    @GetMapping("/departments") Object departments(@AuthenticationPrincipal Actor a) { return auth.departments(a); }
    @PostMapping("/departments") Object addDepartment(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> b) { return Map.of("id",auth.saveDepartment(a,null,b)); }
    @PatchMapping("/departments/{id}") Object editDepartment(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { return Map.of("id",auth.saveDepartment(a,id,b)); }
    @DeleteMapping("/departments/{id}") void deleteDepartment(@AuthenticationPrincipal Actor a,@PathVariable String id) { auth.deleteDepartment(a,id); }
    @GetMapping("/member-invitations") Object invitations(@AuthenticationPrincipal Actor a) { return auth.invitations(a); }
    @PostMapping("/member-invitations") Object invite(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> b) { return auth.createInvitation(a,b); }
    @DeleteMapping("/member-invitations/{id}") void revokeInvitation(@AuthenticationPrincipal Actor a,@PathVariable String id) { auth.revokeInvitation(a,id); }
    @GetMapping("/member-applications") Object applications(@AuthenticationPrincipal Actor a,@RequestParam(defaultValue="") String status) { return auth.applications(a,status); }
    @PostMapping("/member-applications/{id}/review") void reviewApplication(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { auth.reviewApplication(a,id,b); }
    @GetMapping("/roles") Object roles(@AuthenticationPrincipal Actor a) { return auth.roles(a); }
    @GetMapping("/permission-nodes") Object permissions(@AuthenticationPrincipal Actor a) { a.allow("role.manage");return a.permissions(); }
    @PostMapping("/roles") Object addRole(@AuthenticationPrincipal Actor a,@RequestBody Map<String,Object> b) { return Map.of("id",auth.saveRole(a,null,b)); }
    @PatchMapping("/roles/{id}") Object editRole(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { return Map.of("id",auth.saveRole(a,id,b)); }
    @DeleteMapping("/roles/{id}") void deleteRole(@AuthenticationPrincipal Actor a,@PathVariable String id) { auth.deleteRole(a,id); }
    @PutMapping("/roles/{id}/members") void roleMembers(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { auth.bindRoleMembers(a,id,strings(b,"members")); }
    @PutMapping("/members/{id}/roles") void bindRoles(@AuthenticationPrincipal Actor a,@PathVariable String id,@RequestBody Map<String,Object> b) { auth.bindRoles(a,id,strings(b,"roles")); }
}
