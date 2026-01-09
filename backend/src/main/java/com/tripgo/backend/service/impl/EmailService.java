package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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

    /**
     * For normal USER flow
     */
    public void sendVerificationEmail(User user, String link) {
        sendEmail(
                user.getEmail(),
                "Verify Your Email",
                "Welcome to TripGo!\n\nPlease verify your email by clicking the link below:\n" + link + "\n\nThis link will expire in 24 hours."
        );
    }

    public void sendResetPassword(User user, String resetLink) {
        sendEmail(
                user.getEmail(),
                "Reset Password",
                "Reset your TripGo password by clicking the link below:\n" + resetLink + "\n\nThis link will expire in 15 minutes."
        );
    }


    /**
     * For OPERATOR onboarding flow
     */
    public void sendOperatorVerificationEmail(User user, String verificationLink) {
        sendEmail(
                user.getEmail(),
                "Verify Your TripGo Operator Account",
                "Welcome Operator " + user.getFirstName() + "!\n\n" +
                "Please verify your account by clicking the link below:\n" +
                verificationLink + "\n\n" +
                "Your account is currently under review."
        );
    }



    public void notifyAdminsOperatorVerification(Operator op) {
        List<User> admins = userRepository.findAllAdmins();
        User opUser = userRepository.findByOperator(op).orElseThrow();

        for (User admin : admins) {
            sendEmail(
                    admin.getEmail(),
                    "Operator Pending Approval",
                    "Operator '" + op.getName() + "' has completed verification.\n" +
                    "Email: " + opUser.getEmail() + "\n" +
                    "Please review in admin dashboard."
            );
        }
    }


    public void sendOperatorApproved(Operator op) {
        User u = userRepository.findByOperator(op).orElseThrow();

        sendEmail(
                u.getEmail(),
                "Operator Account Approved",
                "Congratulations!\nYour operator account '" + op.getName() + "' has been approved.\nYou can now login at https://tripgo.com/login"
        );
    }

    public void sendOperatorRejected(Operator op) {
        User u = userRepository.findByOperator(op).orElseThrow();

        sendEmail(
                u.getEmail(),
                "Operator Account Rejected",
                "We are sorry.\nYour operator account '" + op.getName() + "' has been rejected.\nPlease contact support."
        );
    }


    private void sendTemplate(String to, String subject, String templateName, Map<String, Object> model) {
        try {
            Context ctx = new Context();
            model.forEach(ctx::setVariable);

            String htmlContent = templateEngine.process("../../../java/com/tripgo/backend/templates/email/" + templateName, ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);

        } catch (Exception e) {
            throw new RuntimeException("Failed to send email to " + to, e);
        }
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

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true = HTML

            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send email to " + to, e);
        }
    }

}
