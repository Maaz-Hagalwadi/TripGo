package com.tripgo.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VerifyOtpRequest {

    @NotBlank(message = "Email or phone is required")
    private String emailOrPhone;

    @NotBlank(message = "OTP is required")
    private String otp;
}
