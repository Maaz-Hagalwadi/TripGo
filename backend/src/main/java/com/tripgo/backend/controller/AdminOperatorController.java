package com.tripgo.backend.controller;
import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.enums.OperatorStatus;
import com.tripgo.backend.repository.OperatorRepository;
import com.tripgo.backend.service.impl.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/operators")
@RequiredArgsConstructor
public class AdminOperatorController {

    private final OperatorRepository operatorRepository;
    private final EmailService emailService;

    @PostMapping("/{id}/approve")
    public ResponseEntity<String> approve(@PathVariable UUID id) {
        Operator op = operatorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Operator not found"));

        op.setStatus(OperatorStatus.APPROVED);
        operatorRepository.save(op);

        emailService.sendOperatorApproved(op);

        return ResponseEntity.ok("Operator approved");
    }

   //heuyu
    @PostMapping("/{id}/reject")
    public ResponseEntity<String> reject(@PathVariable UUID id) {
        Operator op = operatorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Operator not found"));

        op.setStatus(OperatorStatus.REJECTED);
        operatorRepository.save(op);
        emailService.sendOperatorRejected(op);


        return ResponseEntity.ok("Operator rejected");
    }
}

