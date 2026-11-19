package com.tripgo.backend.dto.response;

import java.time.LocalDate;

public record PublicReviewResponse(
        String name,
        Integer rating,
        String title,
        String comment,
        String from,
        String to,
        LocalDate travelDate
) {}
