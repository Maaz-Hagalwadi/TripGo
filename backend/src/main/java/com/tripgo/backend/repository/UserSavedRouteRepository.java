package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.entities.UserSavedRoute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserSavedRouteRepository extends JpaRepository<UserSavedRoute, UUID> {

    List<UserSavedRoute> findByUserOrderByCreatedAtDesc(User user);

    Optional<UserSavedRoute> findByUserAndFromCityAndToCity(User user, String fromCity, String toCity);

    boolean existsByUserAndFromCityAndToCity(User user, String fromCity, String toCity);
}
