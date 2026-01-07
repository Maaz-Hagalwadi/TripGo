package com.tripgo.backend.controller;

import com.tripgo.backend.dto.request.ChangePasswordRequest;
import com.tripgo.backend.dto.request.UpdateProfileRequest;
import com.tripgo.backend.dto.response.UserProfileResponse;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.RefreshTokenRepository;
import com.tripgo.backend.repository.UserRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.security.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    @GetMapping("/me")
    public UserProfileResponse getProfile(Authentication authentication) {

        CustomUserDetails userDetails =
                (CustomUserDetails) authentication.getPrincipal();

        User user = userDetails.getUser();

        return UserProfileResponse.from(user);
    }


    @PutMapping("/me")
    public UserProfileResponse updateProfile(
            @RequestBody UpdateProfileRequest request,
            Authentication authentication) {

        CustomUserDetails userDetails =
                (CustomUserDetails) authentication.getPrincipal();

        User user = userDetails.getUser();

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());

        userRepository.save(user);

        return UserProfileResponse.from(user);
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @RequestBody ChangePasswordRequest request,
            Authentication authentication) {

        CustomUserDetails userDetails =
                (CustomUserDetails) authentication.getPrincipal();

        User user = userDetails.getUser();

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new RuntimeException("Old password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        refreshTokenService.revokeAllForUser(user);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutAll(Authentication authentication) {

        CustomUserDetails userDetails =
                (CustomUserDetails) authentication.getPrincipal();

        User user = userDetails.getUser();

        refreshTokenService.revokeAllForUser(user);

        return ResponseEntity.ok().build();
    }



}

