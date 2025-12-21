package com.tripgo.backend.security.service;

import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.UserRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String emailOrPhone) throws UsernameNotFoundException {

        User user = userRepository
                .findByEmailOrPhone(emailOrPhone, emailOrPhone)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found with: " + emailOrPhone)
                );

        return new CustomUserDetails(user);
    }
}
