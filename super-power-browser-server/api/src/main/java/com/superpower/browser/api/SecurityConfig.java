package com.superpower.browser.api;

import com.superpower.browser.auth.*;
import com.superpower.browser.ai.AiTickets;
import com.superpower.browser.shared.*;
import com.superpower.browser.extension.ExtensionSessions;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfig {
    @Bean SecurityFilterChain chain(HttpSecurity http,AuthService auth,ExtensionSessions extensions,AiTickets tickets) throws Exception {
        return http.csrf(c->c.disable()).sessionManagement(c->c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(c->c.requestMatchers("/api/auth/login","/api/health","/api/ai/skills/files/*").permitAll().anyRequest().authenticated())
            .exceptionHandling(c->c.authenticationEntryPoint((req,res,e)->error(res,401,"请先登录")))
            .addFilterBefore(new OncePerRequestFilter() {
                @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
                    String header=req.getHeader("Authorization");
                    if(header!=null && header.startsWith("Bearer ")) {
                        try {
                            Actor actor;
                            if(req.getRequestURI().startsWith("/extension/")) {
                                var context=extensions.authenticate(header.substring(7));req.setAttribute("extensionSession",context);actor=context.actor();
                            } else if(req.getRequestURI().startsWith("/api/ai/gateway/")) actor=tickets.authenticate(header.substring(7),"gateway","");
                            else actor=auth.authenticate(header.substring(7));
                            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(actor,null,List.of()));
                        }
                        catch(BusinessException e) { error(res,e.status,e.getMessage());return; }
                    }
                    chain.doFilter(req,res);
                }
            },UsernamePasswordAuthenticationFilter.class).build();
    }
    private static void error(HttpServletResponse res,int status,String message) throws IOException { res.setStatus(status);res.setContentType("application/json;charset=UTF-8");res.getWriter().write(Data.json(java.util.Map.of("message",message))); }
}
