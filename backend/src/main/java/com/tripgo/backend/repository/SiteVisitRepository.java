package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.SiteVisit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface SiteVisitRepository extends JpaRepository<SiteVisit, UUID> {

    @Query(value = "SELECT COUNT(*) FROM site_visits WHERE created_at >= :start AND created_at < :end", nativeQuery = true)
    long countVisits(@Param("start") Instant start, @Param("end") Instant end);

    @Query(value = "SELECT COUNT(DISTINCT visitor_id) FROM site_visits WHERE created_at >= :start AND created_at < :end", nativeQuery = true)
    long countUniqueVisitors(@Param("start") Instant start, @Param("end") Instant end);

    @Query(value = "SELECT COUNT(DISTINCT user_id) FROM site_visits WHERE created_at >= :start AND created_at < :end AND user_id IS NOT NULL", nativeQuery = true)
    long countSignedInVisitors(@Param("start") Instant start, @Param("end") Instant end);

    // Returns [day (date string), visits (long), uniqueVisitors (long)]
    @Query(value = """
        SELECT DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS day,
               COUNT(*)                                     AS visits,
               COUNT(DISTINCT visitor_id)                   AS uv
        FROM site_visits
        WHERE created_at >= :start AND created_at < :end
        GROUP BY day ORDER BY day
        """, nativeQuery = true)
    List<Object[]> getDailyBreakdown(@Param("start") Instant start, @Param("end") Instant end);

    // Returns [path (string), visits (long)]
    @Query(value = """
        SELECT path, COUNT(*) AS visits
        FROM site_visits
        WHERE created_at >= :start AND created_at < :end
        GROUP BY path ORDER BY visits DESC LIMIT 10
        """, nativeQuery = true)
    List<Object[]> getTopPages(@Param("start") Instant start, @Param("end") Instant end);

    // Returns [source (string), visits (long)]
    @Query(value = """
        SELECT COALESCE(NULLIF(TRIM(utm_source), ''), NULLIF(TRIM(referrer), ''), 'Direct') AS source,
               COUNT(*) AS visits
        FROM site_visits
        WHERE created_at >= :start AND created_at < :end
        GROUP BY source ORDER BY visits DESC LIMIT 10
        """, nativeQuery = true)
    List<Object[]> getTopSources(@Param("start") Instant start, @Param("end") Instant end);

    // Returns [id, created_at, path, visitor_id, referrer, utm_source, utm_campaign, screen_width, email, first_name, last_name]
    @Query(value = """
        SELECT sv.id, sv.created_at, sv.path, sv.visitor_id, sv.referrer,
               sv.utm_source, sv.utm_campaign, sv.screen_width,
               u.email, u.first_name, u.last_name
        FROM site_visits sv
        LEFT JOIN users u ON sv.user_id = u.id
        WHERE sv.created_at >= :start
          AND (:signedInOnly = false OR sv.user_id IS NOT NULL)
          AND (CAST(:email AS text) IS NULL OR u.email ILIKE CONCAT('%', CAST(:email AS text), '%'))
        ORDER BY sv.created_at DESC
        """,
        countQuery = """
        SELECT COUNT(*)
        FROM site_visits sv
        LEFT JOIN users u ON sv.user_id = u.id
        WHERE sv.created_at >= :start
          AND (:signedInOnly = false OR sv.user_id IS NOT NULL)
          AND (CAST(:email AS text) IS NULL OR u.email ILIKE CONCAT('%', CAST(:email AS text), '%'))
        """,
        nativeQuery = true)
    Page<Object[]> findVisits(
            @Param("start") Instant start,
            @Param("signedInOnly") boolean signedInOnly,
            @Param("email") String email,
            Pageable pageable);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM site_visits WHERE created_at < :cutoff", nativeQuery = true)
    int deleteOlderThan(@Param("cutoff") Instant cutoff);
}
