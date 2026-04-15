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
import com.tripgo.backend.service.impl.NotificationService;
import com.tripgo.backend.service.impl.PasswordResetService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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
    private final NotificationService notificationService;

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String googleClientId;

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
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                      HttpServletResponse response) {
        try {
            authService.login(request, response);
            return ResponseEntity.ok(Map.of(
                "message", "Login successful",
                "accessToken", response.getHeader("X-Access-Token"),
                "refreshToken", response.getHeader("X-Refresh-Token")
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/test")
    public String testApi(){
        return "Successfully validated with api";
    }

    @GetMapping("/test-email")
    public ResponseEntity<Map<String, Object>> testEmail(@RequestParam String to) {
        try {
            // Log configuration for debugging
            System.out.println("=== EMAIL CONFIG DEBUG ===");
            System.out.println("Mail Host: smtp.resend.com");
            System.out.println("Mail Port: 587");
            System.out.println("Mail Username: resend");
            System.out.println("From Email: " + fromEmail);
            System.out.println("API Key Set: " + (System.getenv("RESEND_API_KEY") != null ? "YES" : "NO"));
            System.out.println("=========================");
            
            User testUser = new User();
            testUser.setFirstName("Test");
            testUser.setEmail(to);
            
            emailService.sendUserVerificationEmail(testUser, "http://test-link.com");
            return ResponseEntity.ok(Map.of("success", true, "message", "Test email sent via Resend"));
        } catch (Exception e) {
            System.err.println("Email error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/google-client-id")
    public ResponseEntity<Map<String, String>> getGoogleClientId() {
        return ResponseEntity.ok(Map.of("clientId", googleClientId));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(@RequestBody(required = false) Map<String, String> body,
                                                       HttpServletRequest request) {
        // Support both body-based (localStorage flow) and cookie-based refresh
        String refreshToken = (body != null && body.get("refreshToken") != null)
                ? body.get("refreshToken")
                : getCookieValue(request, "REFRESH_TOKEN");

        if (refreshToken == null) throw new RuntimeException("Refresh token missing");

        RefreshToken storedToken = refreshTokenService.validateRefreshToken(refreshToken);
        User user = storedToken.getUser();

        refreshTokenService.revokeToken(storedToken);

        Authentication auth = new UsernamePasswordAuthenticationToken(
                new CustomUserDetails(user), null, new CustomUserDetails(user).getAuthorities());

        String newAccessToken = jwtTokenProvider.generateAccessToken(auth);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(auth);

        refreshTokenService.createRefreshToken(user, newRefreshToken);

        return ResponseEntity.ok(Map.of(
                "accessToken", newAccessToken,
                "refreshToken", newRefreshToken
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false) Map<String, String> body,
                                       HttpServletRequest request) {
        // Support both body-based and cookie-based refresh token revocation
        String refreshToken = (body != null && body.get("refreshToken") != null)
                ? body.get("refreshToken")
                : getCookieValue(request, "REFRESH_TOKEN");

        if (refreshToken != null) {
            refreshTokenRepository.findByTokenAndRevokedFalse(refreshToken)
                    .ifPresent(refreshTokenService::revokeToken);
        }

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
                notificationService.sendToAdmins(
                        "OPERATOR_PENDING",
                        "New Operator Pending Approval 📄",
                        "Operator '" + user.getOperator().getName() + "' has verified their email and is awaiting approval.",
                        "/admin/dashboard?tab=operators&status=PENDING&operatorId=" + user.getOperator().getId()
                );
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
