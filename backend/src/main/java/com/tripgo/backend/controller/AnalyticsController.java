package com.tripgo.backend.controller;

import com.tripgo.backend.config.AppTime;
import com.tripgo.backend.model.entities.SiteVisit;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.SiteVisitRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.util.*;

@Slf4j
@RestController
@RequiredArgsConstructor
public class AnalyticsController {

    private final SiteVisitRepository visitRepository;

    // ── POST /analytics/visits (public) ──────────────────────────────────────

    @PostMapping("/analytics/visits")
    public ResponseEntity<Void> recordVisit(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        try {
            String path = trim(body.get("path"), 255);
            String visitorId = trim(body.get("visitorId"), 64);

            if (path == null || !path.startsWith("/") || path.startsWith("/admin")) {
                return ResponseEntity.noContent().build();
            }
            if (visitorId == null || visitorId.isBlank()) {
                return ResponseEntity.noContent().build();
            }

            User user = null;
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails cd) {
                user = cd.getUser();
            }

            visitRepository.save(SiteVisit.builder()
                    .visitorId(visitorId)
                    .sessionId(nullIfBlank(trim(body.get("sessionId"), 64)))
                    .user(user)
                    .path(path)
                    .referrer(nullIfBlank(trim(body.get("referrer"), 255)))
                    .utmSource(nullIfBlank(trim(body.get("utmSource"), 100)))
                    .utmMedium(nullIfBlank(trim(body.get("utmMedium"), 100)))
                    .utmCampaign(nullIfBlank(trim(body.get("utmCampaign"), 100)))
                    .screenWidth(toInt(body.get("screenWidth")))
                    .build());
        } catch (Exception e) {
            log.debug("Visit record failed: {}", e.getMessage());
        }
        return ResponseEntity.noContent().build();
    }

    // ── GET /admin/visits/summary ─────────────────────────────────────────────

    @GetMapping("/admin/visits/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> summary(@RequestParam(defaultValue = "7") int days) {
        days = Math.max(1, Math.min(90, days));

        LocalDate today = LocalDate.now(AppTime.ZONE);
        Instant start = today.minusDays(days - 1L).atStartOfDay(AppTime.ZONE).toInstant();
        Instant end   = today.plusDays(1).atStartOfDay(AppTime.ZONE).toInstant();

        long totalVisits       = visitRepository.countVisits(start, end);
        long uniqueVisitors    = visitRepository.countUniqueVisitors(start, end);
        long signedInVisitors  = visitRepository.countSignedInVisitors(start, end);

        List<Object[]> rawDaily = visitRepository.getDailyBreakdown(start, end);
        Map<String, Object[]> byDay = new LinkedHashMap<>();
        for (Object[] row : rawDaily) {
            byDay.put(String.valueOf(row[0]), row);
        }

        List<Map<String, Object>> daily = new ArrayList<>();
        for (long i = days - 1; i >= 0; i--) {
            String date = today.minusDays(i).toString();
            Object[] row = byDay.get(date);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", date);
            entry.put("visits", row != null ? ((Number) row[1]).longValue() : 0L);
            entry.put("uniqueVisitors", row != null ? ((Number) row[2]).longValue() : 0L);
            daily.add(entry);
        }

        List<Map<String, Object>> topPages = visitRepository.getTopPages(start, end).stream()
                .map(r -> { Map<String, Object> m = new LinkedHashMap<>(); m.put("path", r[0]); m.put("visits", ((Number) r[1]).longValue()); return m; })
                .toList();

        List<Map<String, Object>> topSources = visitRepository.getTopSources(start, end).stream()
                .map(r -> { Map<String, Object> m = new LinkedHashMap<>(); m.put("source", r[0]); m.put("visits", ((Number) r[1]).longValue()); return m; })
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalVisits", totalVisits);
        result.put("uniqueVisitors", uniqueVisitors);
        result.put("signedInVisitors", signedInVisitors);
        result.put("daily", daily);
        result.put("topPages", topPages);
        result.put("topSources", topSources);
        return ResponseEntity.ok(result);
    }

    // ── GET /admin/visits ─────────────────────────────────────────────────────

    @GetMapping("/admin/visits")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> listVisits(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(defaultValue = "false") boolean signedIn,
            @RequestParam(required = false) String email) {

        days = Math.max(1, Math.min(90, days));
        size = Math.min(100, Math.max(1, size));

        LocalDate today = LocalDate.now(AppTime.ZONE);
        Instant start = today.minusDays(days - 1L).atStartOfDay(AppTime.ZONE).toInstant();

        String emailFilter = (email != null && !email.isBlank()) ? email.trim() : null;

        Page<Object[]> pageResult = visitRepository.findVisits(
                start, signedIn, emailFilter, PageRequest.of(page, size));

        List<Map<String, Object>> content = pageResult.getContent().stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           r[0]);
            m.put("createdAt",    r[1] != null ? r[1].toString() : null);
            m.put("path",         r[2]);
            m.put("visitorId",    r[3]);
            m.put("referrer",     r[4]);
            m.put("utmSource",    r[5]);
            m.put("utmCampaign",  r[6]);
            m.put("screenWidth",  r[7]);
            m.put("email",        r[8]);
            String firstName = r[9] != null ? String.valueOf(r[9]) : null;
            String lastName  = r[10] != null ? String.valueOf(r[10]) : null;
            m.put("userName", firstName != null
                    ? (firstName + (lastName != null && !lastName.isBlank() ? " " + lastName : "")).trim()
                    : null);
            return m;
        }).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content",       content);
        result.put("totalElements", pageResult.getTotalElements());
        result.put("totalPages",    pageResult.getTotalPages());
        return ResponseEntity.ok(result);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String trim(Object val, int maxLen) {
        if (val == null) return null;
        String s = String.valueOf(val).trim();
        return s.length() > maxLen ? s.substring(0, maxLen) : s;
    }

    private String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private Integer toInt(Object val) {
        if (val == null) return null;
        try { return ((Number) val).intValue(); } catch (Exception e) { return null; }
    }
}
