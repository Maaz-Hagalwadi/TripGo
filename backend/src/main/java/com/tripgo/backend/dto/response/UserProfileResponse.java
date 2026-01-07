package com.tripgo.backend.dto.response;

import com.tripgo.backend.model.entities.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserProfileResponse {
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private boolean emailVerified;

    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.isEmailVerified()
        );
    }
}

