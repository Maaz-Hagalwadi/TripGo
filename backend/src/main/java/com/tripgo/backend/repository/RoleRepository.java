package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Role;
import com.tripgo.backend.model.enums.RoleType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    Optional<Role> findByName(RoleType name);
}