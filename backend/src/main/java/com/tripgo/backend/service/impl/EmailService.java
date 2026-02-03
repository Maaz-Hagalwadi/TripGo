package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.List;
import java.util.Map;
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final UserRepository userRepository;
    private final TemplateEngine templateEngine;

    @Async
    public void sendUserVerificationEmail(User user, String link) {
        sendTemplate(
                user.getEmail(),
                "Verify Your TripGo Account",
                "user-verification",
                Map.of(
                        "firstName", user.getFirstName(),
                        "verificationLink", link
                )
        );
    }

    @Async
    public void sendResetPasswordEmail(User user, String resetLink) {
        sendTemplate(
                user.getEmail(),
                "Reset Your TripGo Password",
                "reset-password",
                Map.of(
                        "firstName", user.getFirstName(),
                        "resetLink", resetLink
                )
        );
    }

    @Async
    public void sendOperatorVerificationEmail(User user, String link) {
        sendTemplate(
                user.getEmail(),
                "Verify Your Operator Account",
                "operator-verification",
                Map.of(
                        "firstName", user.getFirstName(),
                        "verificationLink", link
                )
        );
    }

    @Async
    public void notifyAdminsOperatorVerification(Operator op) {
        System.out.println("🔍 DEBUG: Starting admin notification for operator: " + op.getName());
        
        List<User> admins = userRepository.findAllAdmins();
        System.out.println("🔍 DEBUG: Found " + admins.size() + " admin users");
        
        if (admins.isEmpty()) {
            System.out.println("❌ ERROR: No admin users found in database!");
            return;
        }
        
        User opUser = userRepository.findByOperator(op).orElseThrow();
        System.out.println("🔍 DEBUG: Operator user email: " + opUser.getEmail());

        for (User admin : admins) {
            System.out.println("📧 DEBUG: Sending email to admin: " + admin.getEmail());
            try {
                sendTemplate(
                        admin.getEmail(),
                        "Operator Pending Approval",
                        "operator-pending",
                        Map.of(
                                "operatorName", op.getName(),
                                "operatorEmail", opUser.getEmail(),
                                "approveUrl", "http://localhost:8080/admin/operators/" + op.getId() + "/approve",
                                "rejectUrl", "http://localhost:8080/admin/operators/" + op.getId() + "/reject",
                                "adminUrl", "http://localhost:5174/admin/operators"
                        )
                );
                System.out.println("✅ DEBUG: Email sent successfully to " + admin.getEmail());
            } catch (Exception e) {
                System.out.println("❌ ERROR: Failed to send email to " + admin.getEmail() + ": " + e.getMessage());
            }
        }
    }

    @Async
    public void sendOperatorApproved(Operator op) {
        User opUser = userRepository.findByOperator(op).orElseThrow();

        sendTemplate(
                opUser.getEmail(),
                "Operator Account Approved",
                "operator-approved",
                Map.of(
                        "operatorName", op.getName(),
                        "loginUrl", "https://tripgo.com/login"
                )
        );
    }

    @Async
    public void sendOperatorRejected(Operator op) {
        User opUser = userRepository.findByOperator(op).orElseThrow();

        sendTemplate(
                opUser.getEmail(),
                "Operator Account Rejected",
                "operator-rejected",
                Map.of(
                        "operatorName", op.getName()
                )
        );
    }


    private void sendTemplate(String to, String subject, String template, Map<String, Object> model) {
        try {
            Context ctx = new Context();
            model.forEach(ctx::setVariable);

            String html = templateEngine.process("email/" + template, ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            System.out.println("Email sent to " + to);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send email to " + to, e);
        }
    }
}
