package com.tripgo.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.mail.internet.MimeMessage;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class EmailTestController {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.host}")
    private String mailHost;

    @Value("${spring.mail.port}")
    private String mailPort;

    @Value("${spring.mail.username}")
    private String mailUsername;

    @Value("${spring.mail.password}")
    private String mailPassword;

    @Value("${app.mail.from}")
    private String fromEmail;

    @GetMapping("/email-config")
    public Map<String, Object> getEmailConfig() {
        return Map.of(
            "host", mailHost,
            "port", mailPort,
            "username", mailUsername,
            "password", mailPassword != null ? "***SET***" : "***NOT SET***",
            "fromEmail", fromEmail
        );
    }

    @GetMapping("/send-test-email")
    public Map<String, Object> sendTestEmail(@RequestParam String to) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject("Test Email from TripGo");
            helper.setText("This is a test email from TripGo backend.", false);

            mailSender.send(message);
            log.info("Test email sent successfully to {}", to);
            return Map.of("success", true, "message", "Email sent successfully");
        } catch (Exception e) {
            log.error("Failed to send test email: {}", e.getMessage(), e);
            return Map.of("success", false, "error", e.getMessage());
        }
    }
}