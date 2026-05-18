package com.tripgo.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PassengerProfileRequest {
    private String firstName;
    private String lastName;
    private Integer age;
    private String gender;
    private String phone;
}
