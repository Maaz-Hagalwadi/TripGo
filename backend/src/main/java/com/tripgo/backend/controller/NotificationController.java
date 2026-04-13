package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.AppNotification;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.AppNotificationRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.NotificationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final AppNotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<?> getAll(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        List<AppNotification> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(user);
        long unreadCount = notificationRepository.countByUserAndIsReadFalse(user);

        List<Map<String, Object>> content = notifications.stream().map(n -> Map.<String, Object>of(
                "id", n.getId(),
                "type", n.getType(),
                "title", n.getTitle(),
                "message", n.getMessage(),
                "link", n.getLink() != null ? n.getLink() : "",
                "isRead", n.getIsRead(),
                "createdAt", n.getCreatedAt().toString()
        )).toList();

        return ResponseEntity.ok(Map.of("notifications", content, "unreadCount", unreadCount));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable UUID id, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        notificationRepository.findById(id)
                .filter(n -> n.getUser().getId().equals(user.getId()))
                .ifPresent(n -> {
                    n.setIsRead(true);
                    notificationRepository.save(n);
                });
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    @Transactional
    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllRead(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        notificationRepository.markAllReadByUser(user);
        return ResponseEntity.ok(Map.of("message", "All marked as read"));
    }
}
