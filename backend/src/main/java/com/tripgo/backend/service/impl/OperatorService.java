package com.tripgo.backend.service.impl;

import com.tripgo.backend.dto.request.OperatorRegistrationRequest;
import com.tripgo.backend.dto.response.OperatorRegistrationResponse;
import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.Role;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.OperatorStatus;
import com.tripgo.backend.model.enums.RoleType;
import com.tripgo.backend.repository.OperatorRepository;
import com.tripgo.backend.repository.RoleRepository;
import com.tripgo.backend.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class OperatorService {

    private final UserRepository userRepository;
    private final OperatorRepository operatorRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public OperatorRegistrationResponse register(OperatorRegistrationRequest req) {

        if (userRepository.existsByEmail(req.email())) {
            throw new RuntimeException("Email already used");
        }

        Role operatorRole = roleRepository.findByName(RoleType.ROLE_OPERATOR)
                .orElseThrow(() -> new RuntimeException("ROLE_OPERATOR not found"));

        Operator operator = operatorRepository.save(
                Operator.builder()
                        .name(req.operatorName())
                        .contactPhone(req.contactPhone())
                        .address(req.address())
                        .status(OperatorStatus.PENDING)
                        .build()
        );

        User user = userRepository.save(
                User.builder()
                        .firstName(req.firstName())
                        .lastName(req.lastName())
                        .email(req.email())
                        .phone(req.phone())
                        .password(passwordEncoder.encode(req.password()))
                        .operator(operator)
                        .roles(Set.of(operatorRole))
                        .isEmailVerified(false)
                        .build()
        );

        return new OperatorRegistrationResponse(
                user.getId(),
                operator.getId(),
                operator.getStatus().name(),
                "Operator registered. Awaiting admin approval."
        );
    }
}


