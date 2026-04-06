package com.tripgo.backend.controller;

import com.tripgo.backend.dto.request.OperatorRegistrationRequest;
import com.tripgo.backend.dto.response.OperatorResponse;
import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.OperatorRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.OperatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/operators")
@RequiredArgsConstructor
public class OperatorController {

    private final OperatorService operatorService;
    private final OperatorRepository operatorRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody OperatorRegistrationRequest request) throws Exception {
        return ResponseEntity.ok(operatorService.register(request));
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication auth) {
        Operator op = getOperator(auth);
        return ResponseEntity.ok(toResponse(op));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body, Authentication auth) {
        Operator op = getOperator(auth);
        if (body.containsKey("name")) op.setName(body.get("name"));
        if (body.containsKey("shortName")) op.setShortName(body.get("shortName"));
        if (body.containsKey("contactPhone")) op.setContactPhone(body.get("contactPhone"));
        if (body.containsKey("address")) op.setAddress(body.get("address"));
        operatorRepository.save(op);
        return ResponseEntity.ok(toResponse(op));
    }

    private Operator getOperator(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        if (user.getOperator() == null) throw new RuntimeException("Not an operator");
        return user.getOperator();
    }

    private OperatorResponse toResponse(Operator op) {
        return new OperatorResponse(
                op.getId(), op.getName(), op.getShortName(),
                op.getContactEmail(), op.getContactPhone(),
                op.getAddress(), op.getStatus().name(), op.getCreatedAt()
        );
    }
}

