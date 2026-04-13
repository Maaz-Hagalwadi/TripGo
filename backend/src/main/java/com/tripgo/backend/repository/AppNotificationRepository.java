package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.AppNotification;
import com.tripgo.backend.model.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AppNotificationRepository extends JpaRepository<AppNotification, UUID> {

    List<AppNotification> findByUserOrderByCreatedAtDesc(User user);

    long countByUserAndIsReadFalse(User user);

    @Modifying
    @Query("UPDATE AppNotification n SET n.isRead = true WHERE n.user = :user AND n.isRead = false")
    void markAllReadByUser(@Param("user") User user);
}
