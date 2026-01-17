package com.tripgo.backend.dto.request;

public record GenerateLayoutRequest(
        String template,
        int rows
) {}
