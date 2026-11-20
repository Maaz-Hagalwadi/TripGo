package com.tripgo.backend.config;

import com.tripgo.backend.model.entities.Role;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.RoleType;
import com.tripgo.backend.repository.RoleRepository;
import com.tripgo.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD on startup, so no credentials live in the
 * repository (they used to be seeded by a migration). Does nothing when either variable is unset, and
 * never changes an existing account's password — remove the variables once the admin exists.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrap implements ApplicationRunner {

    // Same rule as RegisterRequest
    private static final Pattern STRONG_PASSWORD =
            Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{12,}$");

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminEmail.isBlank() || adminPassword.isBlank()) return;
        String email = adminEmail.trim().toLowerCase();

        Role adminRole = roleRepository.findByName(RoleType.ROLE_ADMIN)
                .orElseThrow(() -> new IllegalStateException("ROLE_ADMIN missing"));

        userRepository.findByEmail(email).ifPresentOrElse(existing -> {
            if (existing.getRoles().stream().noneMatch(r -> r.getName() == RoleType.ROLE_ADMIN)) {
                existing.getRoles().add(adminRole);
                userRepository.save(existing);
                log.info("Admin bootstrap: granted ROLE_ADMIN to {}", email);
            }
        }, () -> {
            if (!STRONG_PASSWORD.matcher(adminPassword).matches()) {
                log.warn("Admin bootstrap skipped: ADMIN_PASSWORD must be 12+ characters with upper, lower, number and one of @$!%*?&#");
                return;
            }
            userRepository.save(User.builder()
                    .email(email)
                    .firstName("TripGo")
                    .lastName("Admin")
                    .password(passwordEncoder.encode(adminPassword))
                    .isEmailVerified(true)
                    .roles(new HashSet<>(Set.of(adminRole)))
                    .build());
            log.info("Admin bootstrap: created admin account {}", email);
        });
    }
}
