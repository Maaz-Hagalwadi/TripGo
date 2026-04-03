package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.Bus;
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

    @org.springframework.beans.factory.annotation.Value("${app.backend.url}")
    private String backendUrl;

    @org.springframework.beans.factory.annotation.Value("${app.frontend.url}")
    private String frontendUrl;

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
                                "approveUrl", backendUrl + "/admin/operators/" + op.getId() + "/approve",
                                "rejectUrl", backendUrl + "/admin/operators/" + op.getId() + "/reject",
                                "adminUrl", frontendUrl + "/admin/operators"
                        )
                );
                System.out.println("✅ DEBUG: Email sent successfully to " + admin.getEmail());
            } catch (Exception e) {
                System.out.println("❌ ERROR: Failed to send email to " + admin.getEmail() + ": " + e.getMessage());
            }
        }
    }

    @Async
    public void notifyAdminsBusAdded(Bus bus, User operatorUser) {
        List<User> admins = userRepository.findAllAdmins();
        for (User admin : admins) {
            sendTemplate(
                    admin.getEmail(),
                    "New Bus Pending Approval - " + bus.getName(),
                    "bus-pending",
                    Map.of(
                            "busName", bus.getName(),
                            "busCode", bus.getBusCode(),
                            "vehicleNumber", bus.getVehicleNumber(),
                            "busType", bus.getBusType().name(),
                            "operatorName", bus.getOperator().getName(),
                            "operatorEmail", operatorUser.getEmail(),
                            "approveUrl", frontendUrl + "/admin/buses?approve=" + bus.getId(),
                            "rejectUrl", frontendUrl + "/admin/buses?reject=" + bus.getId(),
                            "adminUrl", frontendUrl + "/admin/buses"
                    )
            );
        }
    }

    @Async
    public void sendBusApproved(Bus bus) {
        User opUser = userRepository.findByOperator(bus.getOperator()).orElseThrow();
        sendTemplate(
                opUser.getEmail(),
                "Your Bus Has Been Approved - " + bus.getName(),
                "bus-approved",
                Map.of(
                        "operatorName", bus.getOperator().getName(),
                        "busName", bus.getName(),
                        "busCode", bus.getBusCode()
                )
        );
    }

    @Async
    public void sendBusRejected(Bus bus) {
        User opUser = userRepository.findByOperator(bus.getOperator()).orElseThrow();
        sendTemplate(
                opUser.getEmail(),
                "Your Bus Has Been Rejected - " + bus.getName(),
                "bus-rejected",
                Map.of(
                        "operatorName", bus.getOperator().getName(),
                        "busName", bus.getName(),
                        "busCode", bus.getBusCode()
                )
        );
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
    public void sendOperatorSuspended(Operator op) {
        sendTemplate(
                op.getContactEmail(),
                "Your Operator Account Has Been Suspended",
                "operator-suspended",
                Map.of("operatorName", op.getName())
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
            System.out.println("✅ Email sent successfully to " + to);
        } catch (Exception e) {
            System.err.println("❌ Failed to send email to " + to);
            System.err.println("Error type: " + e.getClass().getName());
            System.err.println("Error message: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to send email to " + to + ": " + e.getMessage(), e);
        }
    }
}
