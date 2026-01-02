package com.tripgo.backend.controller;

import com.tripgo.backend.dto.request.LoginRequest;
import com.tripgo.backend.dto.request.RefreshTokenRequest;
import com.tripgo.backend.dto.request.RegisterRequest;
import com.tripgo.backend.dto.response.AuthResponse;
import com.tripgo.backend.model.entities.RefreshToken;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.RefreshTokenRepository;
import com.tripgo.backend.security.jwt.JwtTokenProvider;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.security.service.RefreshTokenService;
import com.tripgo.backend.service.impl.AuthenticationService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationService authService;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final RefreshTokenRepository refreshTokenRepository;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/test")
    public String testApi(){
        return "Successfully validated with api";
    }

    @PostMapping("/refresh")
    public ResponseEntity<Void> refresh(HttpServletRequest request,
                                        HttpServletResponse response) {

        String refreshToken = extractCookie(request, "REFRESH_TOKEN");

        RefreshToken storedToken =
                refreshTokenService.validateRefreshToken(refreshToken);

        User user = storedToken.getUser();

        // 🔁 Rotation
        refreshTokenService.revokeToken(storedToken);

        Authentication auth =
                new UsernamePasswordAuthenticationToken(
                        new CustomUserDetails(user),
                        null,
                        new CustomUserDetails(user).getAuthorities()
                );

        String newAccessToken = jwtTokenProvider.generateAccessToken(auth);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(auth);

        refreshTokenService.createRefreshToken(user, newRefreshToken);

        response.addHeader("Set-Cookie",
                ResponseCookie.from("ACCESS_TOKEN", newAccessToken)
                        .httpOnly(true)
                        .path("/")
                        .maxAge(15 * 60)
                        .sameSite("Strict")
                        .build().toString()
        );

        response.addHeader("Set-Cookie",
                ResponseCookie.from("REFRESH_TOKEN", newRefreshToken)
                        .httpOnly(true)
                        .path("/auth/refresh")
                        .maxAge(7 * 24 * 60 * 60)
                        .sameSite("Strict")
                        .build().toString()
        );

        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request,
                                       HttpServletResponse response) {

        String refreshToken = getCookieValue(request, "REFRESH_TOKEN");

        // 🔹 Revoke refresh token ONLY if present
        if (refreshToken != null) {
            refreshTokenRepository
                    .findByTokenAndRevokedFalse(refreshToken)
                    .ifPresent(refreshTokenService::revokeToken);
        }

        // 🔹 Clear ACCESS_TOKEN cookie
        response.addHeader("Set-Cookie",
                ResponseCookie.from("ACCESS_TOKEN", "")
                        .httpOnly(true)
                        .path("/")
                        .maxAge(0)
                        .sameSite("Strict")
                        .build().toString()
        );

        // 🔹 Clear REFRESH_TOKEN cookie
        response.addHeader("Set-Cookie",
                ResponseCookie.from("REFRESH_TOKEN", "")
                        .httpOnly(true)
                        .path("/auth/refresh")
                        .maxAge(0)
                        .sameSite("Strict")
                        .build().toString()
        );

        return ResponseEntity.ok().build();
    }



    private String extractCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            throw new RuntimeException("No cookies found");
        }
        for (Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        throw new RuntimeException("Cookie not found");
    }

    private String getCookieValue(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;

        for (Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }



}
