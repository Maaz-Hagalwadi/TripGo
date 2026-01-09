package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final UserRepository userRepository;

    /**
     * For normal USER flow
     */
    public void sendVerificationEmail(String toEmail, String verificationLink) {

        String subject = "Verify your Tripgo account";

        String body =
                "Welcome to Tripgo!\n\n" +
                        "Please verify your email by clicking the link below:\n" +
                        verificationLink + "\n\n" +
                        "This link will expire in 24 hours.\n";

        sendEmail(toEmail, subject, body);
    }

    /**
     * For OPERATOR onboarding flow
     */
    public void sendOperatorVerificationEmail(String toEmail, String verificationLink) {
        System.out.println(">>> OPERATOR EMAIL: " + toEmail);

        String subject = "Verify your Tripgo account";

        String body =
                "Welcome Operator!\n\n" +
        "Please verify your account:\n" +
                verificationLink + "\n\n" +
                "Your account is currently under review.";

        sendEmail(toEmail, subject, body);
    }


    public void notifyAdminsOperatorVerification(Operator op) {
        List<User> admins = userRepository.findAllAdmins();

        if (admins.isEmpty()) {
            throw new RuntimeException("No admin users configured!");
        }

        User operatorUser = userRepository.findByOperator(op)
                .orElseThrow(() -> new RuntimeException("Operator user not found"));

        for (User admin : admins) {
            sendEmail(
                    admin.getEmail(),
                    "Operator Pending Approval",
                    "Operator '" + op.getName() + "' has completed verification.\n" +
                            "Email: " + operatorUser.getEmail() + "\n" +
                            "Please review in admin dashboard."
            );
        }
    }

    public void sendOperatorApproved(Operator op) {

        User operatorUser = userRepository.findByOperator(op)
                .orElseThrow(() -> new RuntimeException("Operator user not found"));

        sendEmail(
                operatorUser.getEmail(),
                "Operator Account Approved",
                "Congratulations!\nYour operator account has been approved.\nYou can now login."
        );
    }


    public void sendOperatorRejected(Operator op) {

        User operatorUser = userRepository.findByOperator(op)
                .orElseThrow(() -> new RuntimeException("Operator user not found"));

        sendEmail(
                operatorUser.getEmail(),
                "Operator Account Rejected",
                "We are sorry.\nYour operator account has been rejected.\nPlease contact support."
        );
    }


    /**
     * Generic reusable mail sender
     */
    private void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);

        } catch (Exception ex) {
            throw new RuntimeException("Failed to send email to " + to, ex);
        }
    }

}
