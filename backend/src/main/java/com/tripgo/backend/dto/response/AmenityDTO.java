package com.tripgo.backend.dto.response;

import java.util.UUID;

public record AmenityDTO(
        UUID id,
        String code,
        String description
) {}

