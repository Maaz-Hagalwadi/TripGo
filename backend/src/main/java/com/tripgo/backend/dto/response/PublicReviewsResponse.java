package com.tripgo.backend.dto.response;

import java.util.List;

public record PublicReviewsResponse(
        Double averageRating,
        long totalReviews,
        List<PublicReviewResponse> reviews
) {}
