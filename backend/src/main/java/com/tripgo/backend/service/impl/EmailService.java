package com.tripgo.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendVerificationEmail(String toEmail, String verificationLink) {

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Verify your Tripgo account");
        message.setText(
                "Welcome to Tripgo!\n\n" +
                        "Please verify your email by clicking the link below:\n" +
                        verificationLink + "\n\n" +
                        "This link will expire in 24 hours."
        );

        mailSender.send(message);
    }
}

