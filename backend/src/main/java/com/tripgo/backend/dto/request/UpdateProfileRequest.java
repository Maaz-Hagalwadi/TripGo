package com.tripgo.backend.dto.request;

import jakarta.validation.constraints.Pattern;
import lombok.Getter;

@Getter
public class UpdateProfileRequest {
    private String firstName;
    private String lastName;

    @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be exactly 10 digits")
    private String phone;
}

