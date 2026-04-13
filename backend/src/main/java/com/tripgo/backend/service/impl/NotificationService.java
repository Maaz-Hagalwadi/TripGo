package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.AppNotification;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.AppNotificationRepository;
import com.tripgo.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final AppNotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    public AppNotification send(User user, String type, String title, String message, String link) {
        AppNotification notification = notificationRepository.save(
                AppNotification.builder()
                        .user(user)
                        .type(type)
                        .title(title)
                        .message(message)
                        .link(link)
                        .build()
        );
        push(user.getEmail(), notification);
        return notification;
    }

    public void sendToAdmins(String type, String title, String message, String link) {
        userRepository.findAllAdmins().forEach(admin -> send(admin, type, title, message, link));
    }

    private void push(String userEmail, AppNotification notification) {
        Map<String, Object> payload = Map.of(
                "id", notification.getId().toString(),
                "type", notification.getType(),
                "title", notification.getTitle(),
                "message", notification.getMessage(),
                "link", notification.getLink() != null ? notification.getLink() : "",
                "isRead", false,
                "createdAt", notification.getCreatedAt().toString()
        );
        try {
            messagingTemplate.convertAndSendToUser(userEmail, "/queue/notifications", payload);
        } catch (Exception e) {
            log.debug("User {} is offline, notification saved to DB only", userEmail);
        }
    }
}
