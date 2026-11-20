package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.entities.WalletTransaction;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping
    public Map<String, Object> getWallet(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        List<WalletTransaction> transactions = walletService.getTransactions(user);
        return Map.of(
                "balance", walletService.getBalance(user),
                "transactions", transactions.stream().map(t -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("id", t.getId());
                    m.put("type", t.getType());
                    m.put("amount", t.getAmount());
                    m.put("description", t.getDescription() != null ? t.getDescription() : "");
                    m.put("bookingId", t.getBookingId() != null ? t.getBookingId().toString() : null);
                    m.put("createdAt", t.getCreatedAt().toString());
                    return m;
                }).toList()
        );
    }
}
