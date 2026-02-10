package com.tripgo.backend.controller;
import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.enums.OperatorStatus;
import com.tripgo.backend.repository.OperatorRepository;
import com.tripgo.backend.service.impl.EmailService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/admin/operators")
@RequiredArgsConstructor
public class AdminOperatorController {

    private final OperatorRepository operatorRepository;
    private final EmailService emailService;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @PostMapping("/{id}/approve")
    public ResponseEntity<String> approve(@PathVariable UUID id) {
        Operator op = operatorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Operator not found"));

        op.setStatus(OperatorStatus.APPROVED);
        operatorRepository.save(op);

        emailService.sendOperatorApproved(op);

        return ResponseEntity.ok("Operator approved");
    }

    @GetMapping("/{id}/approve")
    public void approveFromEmail(@PathVariable UUID id, HttpServletResponse response) throws IOException {
        try {
            Operator op = operatorRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Operator not found"));

            op.setStatus(OperatorStatus.APPROVED);
            operatorRepository.save(op);
            emailService.sendOperatorApproved(op);

            response.sendRedirect(frontendUrl + "/admin/operator-action?status=approved&operator=" + op.getName());
        } catch (Exception e) {
            response.sendRedirect(frontendUrl + "/admin/operator-action?status=error&message=" + e.getMessage());
        }
    }

    @GetMapping("/{id}/reject")
    public void rejectFromEmail(@PathVariable UUID id, HttpServletResponse response) throws IOException {
        try {
            Operator op = operatorRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Operator not found"));

            op.setStatus(OperatorStatus.REJECTED);
            operatorRepository.save(op);
            emailService.sendOperatorRejected(op);

            response.sendRedirect(frontendUrl + "/admin/operator-action?status=rejected&operator=" + op.getName());
        } catch (Exception e) {
            response.sendRedirect(frontendUrl + "/admin/operator-action?status=error&message=" + e.getMessage());
        }
    }
}
