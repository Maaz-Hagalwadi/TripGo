package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.OtpCode;
import com.tripgo.backend.model.enums.OtpPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface OtpCodeRepository extends JpaRepository<OtpCode, UUID> {

    Optional<OtpCode> findByPhoneAndPurpose(String identifier, OtpPurpose purpose);

    @Modifying
    @Query("DELETE FROM OtpCode o WHERE o.phone = :identifier AND o.purpose = :purpose")
    void deleteByPhoneAndPurpose(String identifier, OtpPurpose purpose);
}