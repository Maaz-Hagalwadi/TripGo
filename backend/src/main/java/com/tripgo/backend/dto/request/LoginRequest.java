package com.tripgo.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {

    @NotBlank(message = "Email or Phone is required")
    private String emailOrPhone;

    @NotBlank(message = "Password is required")
    private String password;

}
