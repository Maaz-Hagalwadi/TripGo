package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Bus;
import com.tripgo.backend.model.entities.Operator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface BusRepository extends JpaRepository<Bus, UUID> {
    List<Bus> findByOperator(Operator operator);
    long countByOperator(Operator operator);
    long countByActive(boolean active);

    @Query("SELECT DISTINCT b FROM Bus b LEFT JOIN FETCH b.amenities")
    List<Bus> findAllWithAmenities();

    @Query("SELECT DISTINCT b FROM Bus b LEFT JOIN FETCH b.amenities WHERE b.active = :active")
    List<Bus> findByActiveWithAmenities(@Param("active") boolean active);

    @Query("SELECT DISTINCT b FROM Bus b LEFT JOIN FETCH b.amenities WHERE b.operator = :operator")
    List<Bus> findByOperatorWithAmenities(@Param("operator") Operator operator);

    @Query("SELECT DISTINCT b FROM Bus b LEFT JOIN FETCH b.amenities WHERE b.operator = :operator AND b.active = :active")
    List<Bus> findByOperatorAndActiveWithAmenities(@Param("operator") Operator operator, @Param("active") boolean active);

    List<Bus> findByOperatorAndActiveTrue(Operator operator);
    List<Bus> findByOperatorAndActiveFalse(Operator operator);
}