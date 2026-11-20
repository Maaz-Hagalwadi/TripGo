package com.tripgo.backend.service.impl;

import java.util.List;
import java.util.Map;

/**
 * Single source of truth for cancellation refunds.
 * A slab {hoursBeforeDeparture: H, refundPercent: P} means "cancel at least H hours before
 * departure and get P% back"; the slab with the highest H that still applies wins.
 * Used both to calculate refunds and to show the policy to travellers, so the two always match.
 */
public final class RefundPolicy {

    /** Applies when the operator hasn't configured slabs for a schedule. */
    public static final List<Map<String, Object>> DEFAULT_SLABS = List.of(
            Map.of("hoursBeforeDeparture", 24, "refundPercent", 75, "label", "24+ hrs before departure"),
            Map.of("hoursBeforeDeparture", 12, "refundPercent", 50, "label", "12–24 hrs before"),
            Map.of("hoursBeforeDeparture", 4, "refundPercent", 25, "label", "4–12 hrs before"),
            Map.of("hoursBeforeDeparture", 0, "refundPercent", 0, "label", "Less than 4 hrs")
    );

    private RefundPolicy() {}

    public static List<Map<String, Object>> slabsOrDefault(List<Map<String, Object>> slabs) {
        return slabs == null || slabs.isEmpty() ? DEFAULT_SLABS : slabs;
    }

    /** Refund percentage (0–100) for a cancellation made {@code hoursBeforeDeparture} hours ahead. */
    public static int refundPercent(List<Map<String, Object>> slabs, double hoursBeforeDeparture) {
        double bestHours = -1;
        int percent = 0;
        for (Map<String, Object> slab : slabsOrDefault(slabs)) {
            double hours = toDouble(slab.get("hoursBeforeDeparture"));
            if (hoursBeforeDeparture >= hours && hours > bestHours) {
                bestHours = hours;
                percent = (int) Math.round(toDouble(slab.get("refundPercent")));
            }
        }
        return Math.max(0, Math.min(100, percent));
    }

    private static double toDouble(Object value) {
        if (value instanceof Number n) return n.doubleValue();
        try {
            return value == null ? 0 : Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
