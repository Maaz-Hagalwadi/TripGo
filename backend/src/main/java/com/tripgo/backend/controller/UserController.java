package com.tripgo.backend.controller;

import com.tripgo.backend.dto.request.ChangePasswordRequest;
import com.tripgo.backend.dto.request.UpdateProfileRequest;
import com.tripgo.backend.dto.response.UserProfileResponse;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.RefreshTokenRepository;
import com.tripgo.backend.repository.UserRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.security.service.RefreshTokenService;
import com.tripgo.backend.service.impl.S3Service;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final S3Service s3Service;

    @GetMapping("/me")
    public UserProfileResponse getProfile(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return UserProfileResponse.from(userDetails.getUser());
    }

    @PutMapping("/me")
    public UserProfileResponse updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        if (request.getPhone() != null && !request.getPhone().equals(user.getPhone())
                && userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Phone number already in use");
        }

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        userRepository.save(user);

        return UserProfileResponse.from(user);
    }

    @PostMapping(value = "/me/profile-picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserProfileResponse uploadProfilePicture(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) throws IOException {

        if (file.isEmpty()) throw new RuntimeException("No file provided");

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Only image files are allowed");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new RuntimeException("File size must not exceed 5MB");
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        String url = s3Service.uploadProfilePicture(user.getId(), file);
        user.setProfilePictureUrl(url);
        userRepository.save(user);

        return UserProfileResponse.from(user);
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @RequestBody ChangePasswordRequest request,
            Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
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
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        refreshTokenService.revokeAllForUser(userDetails.getUser());
        return ResponseEntity.ok().build();
    }
}
