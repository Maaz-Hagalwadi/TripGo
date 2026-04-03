package com.tripgo.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record BoardingDroppingPointRequest(
        @NotBlank String name,
        @NotBlank @Pattern(regexp = "BOARDING|DROPPING") String type,
        String address,
        String arrivalTime, // HH:mm
        String landmark
) {}
