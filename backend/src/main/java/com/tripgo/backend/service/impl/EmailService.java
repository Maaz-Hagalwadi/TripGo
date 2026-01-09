package com.tripgo.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

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
