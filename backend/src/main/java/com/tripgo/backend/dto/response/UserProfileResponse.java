package com.tripgo.backend.dto.response;

import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.RoleType;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class UserProfileResponse {
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private boolean emailVerified;
    private List<String> roles;
    private String operatorStatus;

    public static UserProfileResponse from(User user) {
        String operatorStatus = null;
        if (user.hasRole(RoleType.ROLE_OPERATOR) && user.getOperator() != null) {
            operatorStatus = user.getOperator().getStatus().name();
        }
        return new UserProfileResponse(
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.isEmailVerified(),
                user.getRoles().stream()
                    .map(role -> role.getName().name())
                    .toList(),
                operatorStatus
        );
    }
}

