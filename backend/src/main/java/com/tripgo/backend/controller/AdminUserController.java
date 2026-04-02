package com.tripgo.backend.controller;

import com.tripgo.backend.dto.response.AdminUserResponse;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
    public AdminUserResponse getUser(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return toResponse(user);
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
                user.getCreatedAt()
        );
    }
}
