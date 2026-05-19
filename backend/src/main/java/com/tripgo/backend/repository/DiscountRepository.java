package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Discount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DiscountRepository extends JpaRepository<Discount, UUID> {

    Optional<Discount> findByCodeIgnoreCaseAndActiveTrue(String code);

    @Query(value = """
            SELECT code, description, type::text, value,
                   max_discount, min_order_amount, valid_to::text
            FROM discounts
            WHERE active = true
              AND (valid_from IS NULL OR valid_from <= :today)
              AND (valid_to   IS NULL OR valid_to   >= :today)
            ORDER BY value DESC
            """, nativeQuery = true)
    List<Object[]> findActiveDiscountsRaw(@Param("today") LocalDate today);
}