package com.tripgo.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class TripGoBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TripGoBackendApplication.class, args);
    }
}
