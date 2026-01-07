package com.tripgo.backend.dto.request;

import lombok.Getter;

@Getter
public class UpdateProfileRequest {
    private String firstName;
    private String lastName;
    private String phone;
}

