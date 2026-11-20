package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.entities.Wallet;
import com.tripgo.backend.model.entities.WalletTransaction;
import com.tripgo.backend.repository.WalletRepository;
import com.tripgo.backend.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;

    @Transactional
    public Wallet getOrCreate(User user) {
        return walletRepository.findByUserId(user.getId())
                .orElseGet(() -> walletRepository.save(
                        Wallet.builder().user(user).balance(BigDecimal.ZERO).build()));
    }

    @Transactional
    public void credit(User user, BigDecimal amount, String description, UUID bookingId) {
        Wallet wallet = getOrCreate(user);
        wallet.setBalance(wallet.getBalance().add(amount));
        walletRepository.save(wallet);
        transactionRepository.save(WalletTransaction.builder()
                .wallet(wallet)
                .type("CREDIT")
                .amount(amount)
                .description(description)
                .bookingId(bookingId)
                .build());
    }

    @Transactional
    public void debit(User user, BigDecimal amount, String description, UUID bookingId) {
        Wallet wallet = getOrCreate(user);
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient wallet balance");
        }
        wallet.setBalance(wallet.getBalance().subtract(amount));
        walletRepository.save(wallet);
        transactionRepository.save(WalletTransaction.builder()
                .wallet(wallet)
                .type("DEBIT")
                .amount(amount)
                .description(description)
                .bookingId(bookingId)
                .build());
    }

    public BigDecimal getBalance(User user) {
        return walletRepository.findByUserId(user.getId())
                .map(Wallet::getBalance)
                .orElse(BigDecimal.ZERO);
    }

    public List<WalletTransaction> getTransactions(User user) {
        return walletRepository.findByUserId(user.getId())
                .map(w -> transactionRepository.findByWalletIdOrderByCreatedAtDesc(w.getId()))
                .orElse(List.of());
    }
}
