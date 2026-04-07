const normalizeStatus = (value) => String(value || '').trim().toUpperCase();
const isNumericValue = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

export const getTripStatusValue = (item) => (
  normalizeStatus(
    item?.tripStatus ||
    item?.status ||
    item?.tripState ||
    item?.currentStatus
  )
);

export const getDelayMinutes = (item) => {
  const values = [
    item?.delayMinutes,
    item?.delayedMinutes,
    item?.currentDelayMinutes,
    item?.delayInMinutes,
  ];
  const match = values.find(isNumericValue);
  return match === undefined ? 0 : Number(match);
};

const getSeatStatus = (seat) => (
  normalizeStatus(
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

export const isSeatBooked = (seat) => {
  const status = getSeatStatus(seat);
  return (
    Boolean(seat?.isBooked || seat?.booked) ||
    status === 'BOOKED' ||
    status === 'CONFIRMED' ||
    status === 'RESERVED' ||
    status === 'SOLD'
  );
};

export const isSeatAvailableForBooking = (seat) => {
  if (!seat) return false;
  if (isSeatBlocked(seat) || isSeatBooked(seat)) return false;
  if (seat?.available === true || seat?.isAvailable === true) return true;
  const status = getSeatStatus(seat);
  if (status === 'AVAILABLE') return true;
  return false;
};

export const getAvailableSeatCount = (item) => {
  if (Array.isArray(item?.seatAvailability)) {
    return item.seatAvailability.filter(isSeatAvailableForBooking).length;
  }
  if (Number.isFinite(Number(item?.availableSeatCount))) return Number(item.availableSeatCount);
  if (Number.isFinite(Number(item?.availableSeats))) return Number(item.availableSeats);
  return null;
};

export const toLocalYmd = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const shouldShowBusForSearch = (bus, searchDate, now = new Date()) => {
  const departure = new Date(bus?.departureTime);
  if (Number.isNaN(departure.getTime())) return false;
  if (getTripStatusValue(bus) === 'COMPLETED') return false;
  if (searchDate && toLocalYmd(departure) !== searchDate) return false;
  if (searchDate && searchDate === toLocalYmd(now) && departure.getTime() <= now.getTime()) return false;
  return true;
};
