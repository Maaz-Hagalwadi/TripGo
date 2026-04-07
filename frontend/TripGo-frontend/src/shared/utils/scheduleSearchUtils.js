const toStatus = (value) => String(value || '').trim().toUpperCase();

export const getSeatStatus = (seat) => (
  toStatus(
    seat?.status ||
    seat?.seatStatus ||
    seat?.availabilityStatus ||
    seat?.bookingStatus
  )
);

export const isSeatBlocked = (seat) => (
  Boolean(seat?.isBlocked || seat?.blocked) ||
  getSeatStatus(seat) === 'BLOCKED'
);

export const isSeatLocked = (seat) => {
  const status = getSeatStatus(seat);
  return Boolean(seat?.isLocked || seat?.locked) || status === 'LOCKED' || status === 'HELD';
};

export const isSeatBooked = (seat) => {
  const status = getSeatStatus(seat);
  if (Boolean(seat?.isBooked || seat?.booked)) return true;
  if (status === 'BOOKED' || status === 'RESERVED' || status === 'SOLD') return true;
  if (seat?.available === false || seat?.isAvailable === false) {
    return !isSeatBlocked(seat) && !isSeatLocked(seat);
  }
  return false;
};

export const isSeatAvailableForBooking = (seat) => {
  if (!seat) return false;
  if (isSeatBlocked(seat) || isSeatLocked(seat) || isSeatBooked(seat)) return false;
  const status = getSeatStatus(seat);
  if (seat?.available === true || seat?.isAvailable === true) return true;
  if (status === 'AVAILABLE') return true;
  if (seat?.available === undefined && seat?.isAvailable === undefined && !status) return true;
  return false;
};

export const flattenSeatInventory = (response, fallbackSeats = []) => {
  if (Array.isArray(response?.upperDeck) || Array.isArray(response?.lowerDeck)) {
    const lower = (response?.lowerDeck || []).map((seat) => ({ ...seat, deck: seat?.deck || 'lower' }));
    const upper = (response?.upperDeck || []).map((seat) => ({ ...seat, deck: seat?.deck || 'upper' }));
    return [...lower, ...upper];
  }

  if (Array.isArray(response?.seats)) {
    return response.seats.map((seat) => ({ ...seat, deck: seat?.deck || response?.deck || 'lower' }));
  }

  if (Array.isArray(response)) return response;
  if (Array.isArray(fallbackSeats)) return fallbackSeats;
  return [];
};

export const getAvailableSeatCount = (data) => {
  const seatInventory = flattenSeatInventory(data, data?.seatAvailability);
  if (seatInventory.length > 0) {
    return seatInventory.filter(isSeatAvailableForBooking).length;
  }

  const countCandidates = [
    data?.bookableSeatCount,
    data?.availableSeatCount,
    data?.availableSeats,
  ];
  const numericCount = countCandidates.find((value) => Number.isFinite(Number(value)));
  return numericCount !== undefined ? Number(numericCount) : null;
};

export const getDelayMinutes = (data) => {
  const candidates = [
    data?.delayMinutes,
    data?.delayedMinutes,
    data?.currentDelayMinutes,
    data?.delayInMinutes,
  ];
  const numericValue = candidates.find((value) => Number.isFinite(Number(value)) && Number(value) > 0);
  return numericValue !== undefined ? Number(numericValue) : 0;
};

export const getTripStatusValue = (data) => (
  toStatus(
    data?.tripStatus ||
    data?.status ||
    data?.currentStatus ||
    data?.tripState
  )
);

export const toLocalYmd = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const shouldIncludeBusForDate = (bus, searchDateYmd, now = new Date()) => {
  if (!searchDateYmd) return true;
  const departure = new Date(bus?.departureTime);
  if (Number.isNaN(departure.getTime())) return false;
  if (toLocalYmd(departure) !== searchDateYmd) return false;
  const todayYmd = toLocalYmd(now);
  if (searchDateYmd === todayYmd && departure.getTime() <= now.getTime()) return false;
  return true;
};
