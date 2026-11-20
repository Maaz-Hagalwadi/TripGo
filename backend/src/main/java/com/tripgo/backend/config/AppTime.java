package com.tripgo.backend.config;

import java.time.ZoneId;

/**
 * TripGo operates in India: schedules are entered in local time and travel dates, departure
 * times-of-day, refunds windows and reports are all evaluated in IST. Instants stay UTC in the DB.
 * (Emails and ticket PDFs already format in this zone.)
 */
public final class AppTime {

    public static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

    private AppTime() {}
}
