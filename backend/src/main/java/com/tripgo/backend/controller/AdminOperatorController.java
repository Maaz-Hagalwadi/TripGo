package com.tripgo.backend.controller;

import com.tripgo.backend.dto.response.OperatorResponse;
import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.OperatorStatus;
import com.tripgo.backend.repository.OperatorRepository;
import com.tripgo.backend.repository.UserRepository;
import com.tripgo.backend.security.service.RefreshTokenService;
import com.tripgo.backend.service.impl.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/operators")
@RequiredArgsConstructor
public class AdminOperatorController {

    private final OperatorRepository operatorRepository;
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;
    private final EmailService emailService;

    @GetMapping
    public List<OperatorResponse> listOperators(@RequestParam(required = false) OperatorStatus status) {
        List<Operator> operators = status != null
                ? operatorRepository.findByStatus(status)
                : operatorRepository.findAll();
        return operators.stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public OperatorResponse getOperator(@PathVariable UUID id) {
        Operator op = operatorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Operator not found"));
        return toResponse(op);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<String> approve(@PathVariable UUID id) {
        Operator op = operatorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Operator not found"));

        op.setStatus(OperatorStatus.APPROVED);
        operatorRepository.save(op);
        emailService.sendOperatorApproved(op);

        return ResponseEntity.ok("Operator approved");
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<String> reject(@PathVariable UUID id) {
        Operator op = operatorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Operator not found"));

        op.setStatus(OperatorStatus.REJECTED);
        operatorRepository.save(op);
        emailService.sendOperatorRejected(op);

        return ResponseEntity.ok("Operator rejected");
    }

    @PostMapping("/{id}/suspend")
    public ResponseEntity<String> suspend(@PathVariable UUID id) {
        Operator op = operatorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Operator not found"));

        op.setStatus(OperatorStatus.SUSPENDED);
        operatorRepository.save(op);

        userRepository.findByOperator(op)
                .ifPresent(refreshTokenService::revokeAllForUser);

        emailService.sendOperatorSuspended(op);

        return ResponseEntity.ok("Operator suspended");
    }

    private OperatorResponse toResponse(Operator op) {
        return new OperatorResponse(
                op.getId(),
                op.getName(),
                op.getShortName(),
                op.getContactEmail(),
                op.getContactPhone(),
                op.getAddress(),
                op.getStatus().name(),
                op.getCreatedAt()
        );
    }
}
