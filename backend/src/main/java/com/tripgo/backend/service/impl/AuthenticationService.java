package com.tripgo.backend.service.impl;

import com.tripgo.backend.dto.request.LoginRequest;
import com.tripgo.backend.dto.request.RegisterRequest;
import com.tripgo.backend.dto.response.AuthResponse;
import com.tripgo.backend.exception.BadRequestException;
import com.tripgo.backend.exception.ResourceNotFoundException;
import com.tripgo.backend.model.entities.EmailVerificationToken;
import com.tripgo.backend.model.entities.Role;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.RoleType;
import com.tripgo.backend.repository.RoleRepository;
import com.tripgo.backend.repository.UserRepository;
import com.tripgo.backend.security.jwt.JwtTokenProvider;
import com.tripgo.backend.security.service.EmailVerificationService;
import com.tripgo.backend.security.service.RefreshTokenService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.tripgo.backend.security.service.CustomUserDetails;


import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final EmailVerificationService emailVerificationService;
    private final EmailService emailService;

    @Value("${app.jwt.access-token-expiration}")
    private long accessTokenExpirationMs;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    public void login(LoginRequest request, HttpServletResponse response) {
        Authentication authentication;
        try {
             authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmailOrPhone(),
                            request.getPassword()
                    )
            );
        } catch (BadCredentialsException ex) {
            //invalid username/password
            throw new BadCredentialsException("Invalid email or password");
        }

        CustomUserDetails userDetails =
                (CustomUserDetails) authentication.getPrincipal();

        User user = userDetails.getUser();

        if (!user.isEmailVerified()) {
            throw new RuntimeException("Please verify your email before login");
        }

        // 🔹 Generate tokens
        String accessToken = jwtTokenProvider.generateAccessToken(authentication);
        String refreshToken = jwtTokenProvider.generateRefreshToken(authentication);

        // 🔹 Store refresh token in DB
        refreshTokenService.createRefreshToken(
                userDetails.getUser(),
                refreshToken
        );

        // 🔹 Set ACCESS_TOKEN cookie
        response.addHeader("Set-Cookie",
                ResponseCookie.from("ACCESS_TOKEN", accessToken)
                        .httpOnly(true)
                        .secure(false) // true in prod
                        .path("/")
                        .maxAge(accessTokenExpirationMs / 1000)
                        .sameSite("Strict")
                        .build().toString()
        );

        // 🔹 Set REFRESH_TOKEN cookie
        response.addHeader("Set-Cookie",
                ResponseCookie.from("REFRESH_TOKEN", refreshToken)
                        .httpOnly(true)
                        .secure(false)
                        .path("/auth/refresh")
                        .maxAge(refreshTokenExpirationMs / 1000)
                        .sameSite("Strict")
                        .build().toString()
        );
    }


    public AuthResponse register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already in use");
        }

        if (userRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("Phone already in use");
        }

        Role userRole = roleRepository.findByName(RoleType.ROLE_USER)
                .orElseThrow(() -> new BadRequestException("ROLE_USER not found"));

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(Set.of(userRole))
                .isEmailVerified(false)
                .build();

        userRepository.save(user);

        EmailVerificationToken token =
                emailVerificationService.createToken(user);

        emailService.sendVerificationEmail(
                user.getEmail(),
                "http://localhost:8080/auth/verify-email?token=" + token.getToken()
        );

        // Auto-login using email
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        user.getEmail(),
                        request.getPassword()
                )
        );

        String accessToken = jwtTokenProvider.generateAccessToken(auth);
        String refreshToken = jwtTokenProvider.generateRefreshToken(auth);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(user.getId().toString())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .roles(user.getRoles().stream().map(r -> r.getName().name()).toList())
                .build();
    }

    public AuthResponse refreshToken(String refreshToken) {

        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BadRequestException("Invalid or expired refresh token");
        }

        String username = jwtTokenProvider.getUsernameFromToken(refreshToken);

        User user = userRepository.findByEmailOrPhone(username, username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // 👉 Wrap User into CustomUserDetails
        CustomUserDetails userDetails = new CustomUserDetails(user);

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );

        String newAccessToken = jwtTokenProvider.generateAccessToken(authentication);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(user.getId().toString())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .roles(user.getRoles().stream().map(r -> r.getName().name()).toList())
                .build();
    }



}
