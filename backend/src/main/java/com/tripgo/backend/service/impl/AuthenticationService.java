package com.tripgo.backend.service.impl;

import com.tripgo.backend.dto.request.LoginRequest;
import com.tripgo.backend.dto.request.RegisterRequest;
import com.tripgo.backend.dto.response.AuthResponse;
import com.tripgo.backend.model.entities.Role;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.RoleType;
import com.tripgo.backend.repository.RoleRepository;
import com.tripgo.backend.repository.UserRepository;
import com.tripgo.backend.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    // 🔥 REGISTER USER
    public AuthResponse register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use");
        }

        if (userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Phone already in use");
        }

        Role userRole = roleRepository.findByName(RoleType.ROLE_USER)
                .orElseThrow(() -> new RuntimeException("ROLE_USER not found"));

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(Set.of(userRole))
                .build();

        userRepository.save(user);

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

    // 🔥 LOGIN USER
    public AuthResponse login(LoginRequest request) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmailOrPhone(),
                        request.getPassword()
                )
        );

        String accessToken = jwtTokenProvider.generateAccessToken(authentication);
        String refreshToken = jwtTokenProvider.generateRefreshToken(authentication);

        User user = userRepository.findByEmailOrPhone(
                request.getEmailOrPhone(),
                request.getEmailOrPhone()
        ).orElseThrow(() -> new RuntimeException("User not found"));

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
            throw new RuntimeException("Invalid or expired refresh token");
        }

        // extract email from refresh token
        String username = jwtTokenProvider.getUsernameFromToken(refreshToken);

        User user = userRepository.findByEmailOrPhone(username, username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // manually create an Authentication object
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(username, null,
                        user.getRoles().stream()
                                .map(r -> new org.springframework.security.core.authority.SimpleGrantedAuthority(r.getName().name()))
                                .toList()
                );

        // generate new access token
        String newAccessToken = jwtTokenProvider.generateAccessToken(auth);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken) // SAME refresh token is returned
                .userId(user.getId().toString())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .roles(user.getRoles().stream().map(r -> r.getName().name()).toList())
                .build();
    }


}
