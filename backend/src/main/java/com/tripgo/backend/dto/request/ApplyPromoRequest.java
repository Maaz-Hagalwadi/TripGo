package com.tripgo.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ApplyPromoRequest {
    @NotBlank(message = "Promo code is required")
    private String code;

    @NotNull(message = "Booking amount is required")
    private BigDecimal bookingAmount;
}
