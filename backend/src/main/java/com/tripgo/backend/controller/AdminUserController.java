package com.tripgo.backend.controller;

import com.tripgo.backend.dto.response.AdminUserResponse;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;

    @GetMapping
    public List<AdminUserResponse> listUsers() {
        return userRepository.findAll().stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminUserResponse> getUser(@PathVariable UUID id) {
        return userRepository.findById(id)
                .map(u -> ResponseEntity.ok(toResponse(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/suspend")
    public ResponseEntity<?> suspendUser(@PathVariable UUID id) {
        return userRepository.findById(id).map(u -> {
            u.setSuspended(true);
            userRepository.save(u);
            return ResponseEntity.ok(toResponse(u));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/unsuspend")
    public ResponseEntity<?> unsuspendUser(@PathVariable UUID id) {
        return userRepository.findById(id).map(u -> {
            u.setSuspended(false);
            userRepository.save(u);
            return ResponseEntity.ok(toResponse(u));
        }).orElse(ResponseEntity.notFound().build());
    }

    private AdminUserResponse toResponse(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.isEmailVerified(),
                user.getRoles().stream().map(r -> r.getName().name()).toList(),
                user.getCreatedAt(),
                user.isSuspended(),
                user.getProfilePictureUrl()
        );
    }
}
