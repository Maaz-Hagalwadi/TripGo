package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/support")
@RequiredArgsConstructor
public class SupportController {

    private final EmailService emailService;

    @PostMapping("/ticket")
    public ResponseEntity<?> submitTicket(
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String subject = body.getOrDefault("subject", "").trim();
        String category = body.getOrDefault("category", "").trim();
        String message = body.getOrDefault("message", "").trim();

        if (subject.isEmpty() || category.isEmpty() || message.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "subject, category, and message are required"));
        }

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        emailService.sendSupportTicket(user, subject, category, message);

        return ResponseEntity.ok(Map.of("message", "Support ticket submitted successfully"));
    }
}
