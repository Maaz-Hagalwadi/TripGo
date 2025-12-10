
package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.RouteDay;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RouteDayRepository extends JpaRepository<RouteDay, UUID> {
}