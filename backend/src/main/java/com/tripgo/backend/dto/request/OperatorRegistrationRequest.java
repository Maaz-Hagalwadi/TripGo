package com.tripgo.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

// Same rules as RegisterRequest for the account fields, so operator and traveller signups behave alike
public record OperatorRegistrationRequest(
        @NotBlank(message = "First Name is required")
        String firstName,

        @NotBlank(message = "Last Name is required")
        String lastName,

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @NotBlank(message = "Phone Number is required")
        @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be exactly 10 digits")
        String phone,

        @NotBlank(message = "Password is required")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$",
                message = "Password must have upper, lower, number, special char and be 8+ chars"
        )
        String password,

        @NotBlank(message = "Company name is required")
        String operatorName,

        @NotBlank(message = "Contact phone is required")
        @Pattern(regexp = "^[0-9]{10}$", message = "Contact phone must be exactly 10 digits")
        String contactPhone,

        @NotBlank(message = "Short name is required")
        String shortName,

        @NotBlank(message = "Contact email is required")
        @Email(message = "Invalid contact email format")
        String contactEmail,

        @NotBlank(message = "Address is required")
        String address
) {}
