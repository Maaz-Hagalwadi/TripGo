package com.tripgo.backend.controller;

import com.tripgo.backend.dto.request.LoginRequest;
import com.tripgo.backend.dto.request.RefreshTokenRequest;
import com.tripgo.backend.dto.request.RegisterRequest;
import com.tripgo.backend.dto.request.ResetPasswordRequest;
import com.tripgo.backend.dto.response.AuthResponse;
import com.tripgo.backend.model.entities.EmailVerificationToken;
import com.tripgo.backend.model.entities.PasswordResetToken;
import com.tripgo.backend.model.entities.RefreshToken;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.RoleType;
import com.tripgo.backend.repository.RefreshTokenRepository;
import com.tripgo.backend.repository.UserRepository;
import com.tripgo.backend.security.jwt.JwtTokenProvider;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.security.service.EmailVerificationService;
import com.tripgo.backend.security.service.RefreshTokenService;
import com.tripgo.backend.service.impl.AuthenticationService;
import com.tripgo.backend.service.impl.EmailService;
import com.tripgo.backend.service.impl.PasswordResetService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationService authService;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationService emailVerificationService;
    private final UserRepository userRepository;
    private final PasswordResetService passwordResetService;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.backend.url}")
    private String backendUrl;

    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok("Registration successful. Please verify your email.");
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@Valid @RequestBody LoginRequest request,
                                      HttpServletResponse response) {
        authService.login(request, response);
        return ResponseEntity.ok(Map.of("message", "Login successful"));
    }

    @GetMapping("/test")
    public String testApi(){
        return "Successfully validated with api";
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(HttpServletRequest request,
                                        HttpServletResponse response) {

        String refreshToken = extractCookie(request, "REFRESH_TOKEN");
        RefreshToken storedToken = refreshTokenService.validateRefreshToken(refreshToken);
        User user = storedToken.getUser();

        refreshTokenService.revokeToken(storedToken);

        Authentication auth = new UsernamePasswordAuthenticationToken(
                new CustomUserDetails(user), null, new CustomUserDetails(user).getAuthorities());

        String newAccessToken = jwtTokenProvider.generateAccessToken(auth);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(auth);

        refreshTokenService.createRefreshToken(user, newRefreshToken);

        response.addHeader("Set-Cookie",
                ResponseCookie.from("ACCESS_TOKEN", newAccessToken)
                        .httpOnly(true).path("/").maxAge(15 * 60).sameSite("Strict").build().toString());

        response.addHeader("Set-Cookie",
                ResponseCookie.from("REFRESH_TOKEN", newRefreshToken)
                        .httpOnly(true).path("/auth/refresh").maxAge(7 * 24 * 60 * 60).sameSite("Strict").build().toString());

        return ResponseEntity.ok(Map.of("message", "Token refreshed"));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {

        String refreshToken = getCookieValue(request, "REFRESH_TOKEN");

        if (refreshToken != null) {
            refreshTokenRepository.findByTokenAndRevokedFalse(refreshToken)
                    .ifPresent(refreshTokenService::revokeToken);
        }

        response.addHeader("Set-Cookie",
                ResponseCookie.from("ACCESS_TOKEN", "").httpOnly(true).path("/").maxAge(0).sameSite("Strict").build().toString());

        response.addHeader("Set-Cookie",
                ResponseCookie.from("REFRESH_TOKEN", "").httpOnly(true).path("/auth/refresh").maxAge(0).sameSite("Strict").build().toString());

        return ResponseEntity.ok().build();
    }

    @GetMapping("/verify-email")
    public void verifyEmail(@RequestParam String token, HttpServletResponse response) throws IOException {

        try {
            EmailVerificationToken verificationToken = emailVerificationService.validateToken(token);
            User user = verificationToken.getUser();
            boolean isOperator = user.getRoles().stream()
                    .anyMatch(r -> r.getName() == RoleType.ROLE_OPERATOR);

            if (isOperator) {
                emailService.notifyAdminsOperatorVerification(user.getOperator());
            }

            user.setEmailVerified(true);
            userRepository.save(user);
            emailVerificationService.markUsed(verificationToken);

            response.sendRedirect(frontendUrl + "/verify-email?status=success");
        } catch (Exception e) {
            response.sendRedirect(frontendUrl + "/verify-email?status=error&message=" + e.getMessage());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@RequestParam String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        PasswordResetToken token = passwordResetService.createToken(user);

        emailService.sendResetPasswordEmail(user,
                frontendUrl + "/reset-password?token=" + token.getToken());

        return ResponseEntity.ok().build();
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<String> resendVerification(@RequestParam String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isEmailVerified()) {
            throw new RuntimeException("Email already verified");
        }

        EmailVerificationToken token = emailVerificationService.createToken(user);
        String verificationLink = backendUrl + "/auth/verify-email?token=" + token.getToken();

        if (user.getRoles().stream().anyMatch(r -> r.getName() == RoleType.ROLE_OPERATOR)) {
            emailService.sendOperatorVerificationEmail(user, verificationLink);
        } else {
            emailService.sendUserVerificationEmail(user, verificationLink);
        }

        return ResponseEntity.ok("Verification email sent successfully");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@RequestBody ResetPasswordRequest request) {

        PasswordResetToken resetToken = passwordResetService.validateToken(request.getToken());
        User user = resetToken.getUser();
        
        if (user.getPassword() == null) {
            throw new RuntimeException("Password reset not allowed for OAuth users");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        passwordResetService.markUsed(resetToken);
        refreshTokenService.revokeAllForUser(user);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/reset-password")
    public void validateResetToken(@RequestParam String token, HttpServletResponse response) throws IOException {
        passwordResetService.validateToken(token);
        response.sendRedirect(frontendUrl + "/reset-password?token=" + token);
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