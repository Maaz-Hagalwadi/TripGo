package com.tripgo.backend.security;

import com.tripgo.backend.model.entities.Role;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.RoleType;
import com.tripgo.backend.repository.RoleRepository;
import com.tripgo.backend.repository.UserRepository;

import com.tripgo.backend.security.jwt.JwtTokenProvider;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.security.service.RefreshTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;
    private final RoleRepository roleRepository;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String fullName = oAuth2User.getAttribute("name");

        String firstName = fullName != null && fullName.contains(" ")
                ? fullName.substring(0, fullName.indexOf(" "))
                : fullName;

        String lastName = fullName != null && fullName.contains(" ")
                ? fullName.substring(fullName.indexOf(" ") + 1)
                : "";

        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    Role userRole = roleRepository.findByName(RoleType.ROLE_USER)
                            .orElseThrow(() -> new RuntimeException("ROLE_USER not found"));
                    return userRepository.save(
                            User.builder()
                                    .email(email)
                                    .username(email)
                                    .firstName(firstName)
                                    .lastName(lastName)
                                    .isEmailVerified(true)
                                    .password(null)
                                    .roles(Set.of(userRole))
                                    .build()
                    );
                });

        CustomUserDetails userDetails = new CustomUserDetails(user);

        Authentication authToken =
                new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );

        if (response.isCommitted()) {
            return;
        }

        // 🔹 Generate tokens
        String accessToken = jwtTokenProvider.generateAccessToken(authToken);
        String refreshToken = jwtTokenProvider.generateRefreshToken(authToken);

        // 🔹 Store refresh token in DB
        refreshTokenService.createRefreshToken(user, refreshToken);

        boolean isSecure = request.isSecure() || frontendUrl.startsWith("https");

        // 🔹 Access token cookie
        response.addHeader("Set-Cookie",
                ResponseCookie.from("ACCESS_TOKEN", accessToken)
                        .httpOnly(true)
                        .secure(isSecure)
                        .path("/")
                        .maxAge(15 * 60)
                        .sameSite(isSecure ? "None" : "Strict")
                        .build().toString()
        );

        // 🔹 Refresh token cookie (VERY IMPORTANT)
        response.addHeader("Set-Cookie",
                ResponseCookie.from("REFRESH_TOKEN", refreshToken)
                        .httpOnly(true)
                        .secure(isSecure)
                        .path("/auth/refresh")
                        .maxAge(refreshTokenExpirationMs / 1000)
                        .sameSite(isSecure ? "None" : "Strict")
                        .build().toString()
        );

        response.sendRedirect(frontendUrl + "/oauth2/callback?token=" + accessToken + "&refresh=" + refreshToken);
    }
}
