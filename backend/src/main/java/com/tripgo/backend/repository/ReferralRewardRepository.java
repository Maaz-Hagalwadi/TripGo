package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.ReferralReward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ReferralRewardRepository extends JpaRepository<ReferralReward, UUID> {

    Optional<ReferralReward> findByReferredId(UUID referredId);

    @Query("SELECT COUNT(r) FROM ReferralReward r WHERE r.referrer.id = :referrerId AND r.status = 'GRANTED'")
    long countGrantedByReferrer(@Param("referrerId") UUID referrerId);

    boolean existsByReferredIdAndStatus(UUID referredId, String status);
}
