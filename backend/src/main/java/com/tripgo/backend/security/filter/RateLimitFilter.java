package com.tripgo.backend.security.filter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> loginBuckets           = new ConcurrentHashMap<>();
    private final Map<String, Bucket> registerBuckets        = new ConcurrentHashMap<>();
    private final Map<String, Bucket> forgotPasswordBuckets  = new ConcurrentHashMap<>();
    private final Map<String, Bucket> globalBuckets          = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String ip   = getClientIp(request);
        String path = request.getRequestURI();

        Bucket bucket = resolveBucket(ip, path);

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Too many requests. Please try again later.\"}");
        }
    }

    private Bucket resolveBucket(String ip, String path) {
        if (path.equals("/auth/login")) {
            return loginBuckets.computeIfAbsent(ip, k -> newBucket(5, Duration.ofMinutes(1)));
        } else if (path.equals("/auth/register")) {
            return registerBuckets.computeIfAbsent(ip, k -> newBucket(5, Duration.ofMinutes(1)));
        } else if (path.equals("/auth/forgot-password")) {
            return forgotPasswordBuckets.computeIfAbsent(ip, k -> newBucket(3, Duration.ofMinutes(1)));
        } else {
            return globalBuckets.computeIfAbsent(ip, k -> newBucket(300, Duration.ofMinutes(1)));
        }
    }

    private Bucket newBucket(long capacity, Duration duration) {
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacity)
                        .refillGreedy(capacity, duration)
                        .build())
                .build();
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
