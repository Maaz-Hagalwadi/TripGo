package com.tripgo.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;

@Getter
public class ChangePasswordRequest {
    @NotBlank(message = "Current password is required")
    private String oldPassword;

    // Same rule as RegisterRequest.password
    @NotBlank(message = "New password is required")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$",
            message = "Password must have upper, lower, number, special char and be 8+ chars"
    )
    private String newPassword;
}

