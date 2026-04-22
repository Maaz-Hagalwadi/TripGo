package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.BookingSeat;
import com.tripgo.backend.model.entities.Bus;
import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final UserRepository userRepository;
    private final TemplateEngine templateEngine;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${RESEND_API_KEY}")
    private String resendApiKey;

    @Value("${app.mail.from:tripGo@mzdev.co.in}")
    private String fromEmail;

    @Value("${app.backend.url}")
    private String backendUrl;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Async
    public void sendCancellationEmail(String userEmail, String firstName, String bookingCode,
                                       String from, String to, String busName,
                                       com.tripgo.backend.model.enums.CancelledBy cancelledBy,
                                       String reason, java.math.BigDecimal refundAmount,
                                       String refundStatus) {
        String cancelledByLabel = switch (cancelledBy) {
            case USER -> "You";
            case OPERATOR -> "The operator";
            case SYSTEM -> "System";
        };
        Map<String, Object> data = new HashMap<>();
        data.put("subject", "Booking Cancelled - " + bookingCode + " | TripGo");
        data.put("firstName", firstName);
        data.put("bookingCode", bookingCode);
        data.put("from", from);
        data.put("to", to);
        data.put("busName", busName);
        data.put("cancelledBy", cancelledByLabel);
        data.put("reason", reason);
        data.put("refundAmount", refundAmount);
        data.put("refundStatus", refundStatus);
        data.put("frontendUrl", frontendUrl);
        sendResendTemplate(userEmail, "booking-cancellation", data);
    }

    @Async
    public void sendPaymentFailed(User user, String from, String to, String busName, BigDecimal amount) {
        Map<String, Object> data = new HashMap<>();
        data.put("subject", "Payment Failed for Your TripGo Booking");
        data.put("firstName", user.getFirstName());
        data.put("from", from);
        data.put("to", to);
        data.put("busName", busName);
        data.put("amount", amount);
        data.put("frontendUrl", frontendUrl);
        sendResendTemplate(user.getEmail(), "payment-failed", data);
    }

    @Async
    public void notifyOperatorNewBooking(Booking booking, List<BookingSeat> seats) {
        User opUser = userRepository.findByOperator(booking.getOperator()).orElse(null);
        if (opUser == null) return;
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a").withZone(ZoneId.of("Asia/Kolkata"));
        String seatNumbers = seats.stream().map(BookingSeat::getSeatNumber).reduce((a, b) -> a + ", " + b).orElse("-");
        Map<String, Object> model = new java.util.HashMap<>();
        model.put("operatorName", booking.getOperator().getName());
        model.put("bookingCode", booking.getBookingCode());
        model.put("from", seats.isEmpty() ? "-" : seats.get(0).getFromStop());
        model.put("to", seats.isEmpty() ? "-" : seats.get(0).getToStop());
        model.put("busName", booking.getRouteSchedule().getBus().getName());
        model.put("departureTime", fmt.format(booking.getRouteSchedule().getDepartureTime()));
        model.put("seatNumbers", seatNumbers);
        model.put("payableAmount", booking.getPayableAmount());
        model.put("passengers", seats.stream().map(s -> {
            Map<String, Object> p = new java.util.HashMap<>();
            p.put("seatNumber", s.getSeatNumber());
            if (s.getPassenger() != null) {
                p.put("firstName", s.getPassenger().getFirstName());
                p.put("lastName", s.getPassenger().getLastName() != null ? s.getPassenger().getLastName() : "");
                p.put("age", s.getPassenger().getAge());
                p.put("gender", s.getPassenger().getGender());
            }
            return p;
        }).toList());
        model.put("frontendUrl", frontendUrl);
        sendTemplate(opUser.getEmail(), "New Booking - " + booking.getBookingCode() + " | TripGo", "operator-new-booking", model);
    }

    @Async
    public void notifyOperatorReviewReceived(User operatorUser, String operatorName, String busName,
                                              String from, String to, String reviewerName,
                                              int rating, String title, String comment) {
        Map<String, Object> model = new java.util.HashMap<>();
        model.put("operatorName", operatorName);
        model.put("busName", busName);
        model.put("from", from);
        model.put("to", to);
        model.put("reviewerName", reviewerName);
        model.put("rating", rating);
        model.put("title", title != null ? title : "");
        model.put("comment", comment != null ? comment : "");
        model.put("frontendUrl", frontendUrl);
        sendTemplate(operatorUser.getEmail(), "New Review Received - " + rating + "★ | TripGo", "operator-review-received", model);
    }

    @Async
    public void sendUserReviewSubmitted(User user, String busName, String from, String to, int rating, String comment) {
        Map<String, Object> model = new java.util.HashMap<>();
        model.put("firstName", user.getFirstName());
        model.put("busName", busName);
        model.put("from", from);
        model.put("to", to);
        model.put("rating", rating);
        model.put("comment", comment != null ? comment : "");
        sendTemplate(user.getEmail(), "Thanks for your review! | TripGo", "user-review-submitted", model);
    }

    @Async
    public void sendTripCompletedReviewPrompt(User user, String from, String to,
                                               String busName, String operatorName, UUID scheduleId) {
        String reviewUrl = frontendUrl + "/my-bookings?review=" + scheduleId;
        Map<String, Object> model = new java.util.HashMap<>();
        model.put("firstName", user.getFirstName());
        model.put("from", from);
        model.put("to", to);
        model.put("busName", busName);
        model.put("operatorName", operatorName);
        model.put("reviewUrl", reviewUrl);
        sendTemplate(user.getEmail(), "How was your trip? Rate your experience | TripGo", "trip-completed-review", model);
    }

    @Async
    public void sendUserVerificationEmail(User user, String link) {
        sendResendTemplate(user.getEmail(), "user-verification", Map.of(
                "subject", "Verify Your TripGo Account",
                "firstName", user.getFirstName(),
                "verificationLink", link
        ));
    }

    @Async
    public void sendResetPasswordEmail(User user, String resetLink) {
        sendResendTemplate(user.getEmail(), "reset-password", Map.of(
                "subject", "Reset Your TripGo Password",
                "firstName", user.getFirstName(),
                "resetLink", resetLink
        ));
    }

    @Async
    public void sendOperatorVerificationEmail(User user, String link) {
        sendResendTemplate(user.getEmail(), "operator-verification", Map.of(
                "subject", "Verify Your TripGo Operator Account",
                "firstName", user.getFirstName(),
                "verificationLink", link
        ));
    }

    @Async
    public void sendBookingConfirmation(User user, Map<String, Object> bookingDetails) {
        Map<String, Object> templateData = new HashMap<>(bookingDetails);
        templateData.put("subject", "Booking Confirmed - " + bookingDetails.getOrDefault("bookingCode", "") + " | TripGo");
        templateData.put("firstName", user.getFirstName());
        templateData.put("frontendUrl", frontendUrl);
        sendResendTemplate(user.getEmail(), "booking-confirmation", templateData);
    }

    private void sendResendTemplate(String to, String templateName, Map<String, Object> variables) {
        try {
            Context ctx = new Context();
            ctx.setVariables(variables);
            String html = templateEngine.process("email/" + templateName, ctx);

            String subject = variables.getOrDefault("subject", "TripGo Notification").toString();

            String url = "https://api.resend.com/emails";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(resendApiKey);

            Map<String, Object> emailData = new HashMap<>();
            emailData.put("from", fromEmail);
            emailData.put("to", new String[]{to});
            emailData.put("subject", subject);
            emailData.put("html", html);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(emailData, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Email sent successfully to {} using template {}", to, templateName);
            } else {
                log.error("Failed to send email to {} using template {}. Status: {} Body: {}", to, templateName, response.getStatusCode(), response.getBody());
            }
        } catch (Exception e) {
            log.error("Error sending email to {} using template {}: {}", to, templateName, e.getMessage(), e);
        }
    }

    @Async
    public void notifyAdminsOperatorVerification(Operator op) {
        List<User> admins = userRepository.findAllAdmins();
        if (admins.isEmpty()) return;

        User opUser = userRepository.findByOperator(op).orElseThrow();

        for (User admin : admins) {
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
                "operator-approved",
                Map.of(
                        "operatorName", bus.getOperator().getName(),
                        "loginUrl", frontendUrl + "/login"
                )
        );
    }

    @Async
    public void sendBusRejected(Bus bus) {
        User opUser = userRepository.findByOperator(bus.getOperator()).orElseThrow();
        sendTemplate(
                opUser.getEmail(),
                "Your Bus Has Been Rejected - " + bus.getName(),
                "operator-rejected",
                Map.of("operatorName", bus.getOperator().getName())
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
                        "loginUrl", frontendUrl + "/login"
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
                Map.of("operatorName", op.getName())
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

    private void sendTemplate(String to, String subject, String template, Map<String, Object> model) {
        model = new HashMap<>(model);
        model.put("subject", subject);
        sendResendTemplate(to, template, model);
    }
}
