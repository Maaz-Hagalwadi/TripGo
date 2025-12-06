package com.tripgo.backend.model.entities;

import com.tripgo.backend.model.enums.NotificationType;
import com.tripgo.backend.model.enums.NotificationStatus;
import com.tripgo.backend.util.JsonConverter;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Enumerated(EnumType.STRING)
    private NotificationType type; // EMAIL, SMS, WHATSAPP, PUSH

    private String channel;  // Example: "AWS_SES", "TWILIO", "META_WHATSAPP"

    private String recipient;

    @Column(columnDefinition = "jsonb")
    @Convert(converter = JsonConverter.class)
    private Map<String, Object> payload; // message content

    @Enumerated(EnumType.STRING)
    private NotificationStatus status;

    @Column(name = "sent_at")
    private Instant sentAt;
}
