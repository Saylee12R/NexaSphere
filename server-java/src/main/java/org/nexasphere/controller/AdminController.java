package org.nexasphere.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.extern.slf4j.Slf4j;
import org.nexasphere.model.TokenSession;
import org.nexasphere.service.AdminAuthService;
import org.nexasphere.service.LoginRateLimitService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@Validated
@Slf4j
public class AdminController {

    private final AdminAuthService adminAuthService;
    private final LoginRateLimitService rateLimitService;

    public AdminController(AdminAuthService adminAuthService, LoginRateLimitService rateLimitService) {
        this.adminAuthService = adminAuthService;
        this.rateLimitService = rateLimitService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String clientIp = getClientIp(servletRequest);
        if (!rateLimitService.tryConsume(clientIp)) {
            log.warn("Rate limit exceeded for IP: {}", clientIp);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many login attempts. Please try again later.");
        }
        log.info("Login attempt for user: {}", request.email());
        TokenSession session = adminAuthService.login(request.email().trim(), request.password());
        return ResponseEntity.ok(new LoginResponse(session.token(), session.sessionInfo().email()));
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Boolean>> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            log.info("Logout request received");
            adminAuthService.logout(token);
        }
        return ResponseEntity.ok(Collections.singletonMap("ok", true));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, String>> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        log.debug("Fetching current user info for: {}", auth.getName());
        return ResponseEntity.ok(Collections.singletonMap("email", auth.getName()));
    }

    @GetMapping("/ping")
    public ResponseEntity<Map<String, String>> ping() {
        return ResponseEntity.ok(Collections.singletonMap("status", "ok"));
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {
    }

    public record LoginResponse(String token, String email) {
    }
}
