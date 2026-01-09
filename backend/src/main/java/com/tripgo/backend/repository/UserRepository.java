package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailOrPhone(String email, String phone);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);


    Optional<User> findByEmail(String email);

    @Query("""
    SELECT u 
    FROM User u 
    JOIN u.roles r 
    WHERE r.name = 'ROLE_ADMIN'
""")
    List<User> findAllAdmins();

    Optional<User> findByOperator(Operator operator);

}