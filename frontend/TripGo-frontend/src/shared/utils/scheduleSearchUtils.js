const normalizeStatus = (value) => String(value || '').trim().toUpperCase();
const isNumericValue = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const pad = (value) => String(value).padStart(2, '0');

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
  // If totalSeats is 0 and seatAvailability is empty, data is missing — treat as unknown
  const totalSeats = Number(item?.totalSeats ?? 0);
  const seatAvailabilityEmpty = !Array.isArray(item?.seatAvailability) || item.seatAvailability.length === 0;
  if (totalSeats === 0 && seatAvailabilityEmpty) return null;

  if (isNumericValue(item?.availableSeatCount) && Number(item.availableSeatCount) > 0) return Number(item.availableSeatCount);
  if (isNumericValue(item?.availableSeats) && Number(item.availableSeats) > 0) return Number(item.availableSeats);
  if (Array.isArray(item?.seatAvailability) && item.seatAvailability.length > 0) {
    return item.seatAvailability.filter(isSeatAvailableForBooking).length;
  }
  // availableSeats explicitly 0 but totalSeats > 0 → truly sold out
  if (isNumericValue(item?.availableSeats)) return Number(item.availableSeats);
  if (isNumericValue(item?.availableSeatCount)) return Number(item.availableSeatCount);
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

// TripGo runs in India: trip times and travel dates are shown and compared in IST (UTC+05:30, no DST)
// whatever the device's zone — operators enter schedules in IST and the backend projects them in IST.
// Shifting an instant by the offset lets the getUTC* getters read its IST fields.
export const TRIP_TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = 330 * 60000;
const istFields = (date) => new Date(date.getTime() + IST_OFFSET_MS);
const toDate = (value) => (value instanceof Date ? value : new Date(value));

export const toIstYmd = (value) => {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';
  const ist = istFields(date);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
};

/** Hour of day (0-23) in IST. */
export const getIstHours = (value) => istFields(toDate(value)).getUTCHours();

/** The instant at which `timeSource`'s IST time of day falls on travel date `ymd` (YYYY-MM-DD). */
export const onTravelDate = (ymd, timeSource) => {
  const time = istFields(toDate(timeSource));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || '')) || Number.isNaN(time.getTime())) return null;
  return new Date(Date.UTC(
    Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)),
    time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), time.getUTCMilliseconds(),
  ) - IST_OFFSET_MS);
};

/** Whole IST calendar days from `from` to `to` (0 = same day, 1 = next day). */
export const istDayDiff = (from, to) => {
  const a = toIstYmd(from);
  const b = toIstYmd(to);
  if (!a || !b) return 0;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
};

export const formatIstTime = (value) => {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '--';
  const ist = istFields(date);
  let hours = ist.getUTCHours();
  const minutes = pad(ist.getUTCMinutes());
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${pad(hours)}:${minutes} ${suffix}`;
};

export const formatIstDateTime = (value) => {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '--';
  const ist = istFields(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${pad(ist.getUTCDate())} ${months[ist.getUTCMonth()]} ${ist.getUTCFullYear()}, ${formatIstTime(date)}`;
};

const parseSearchDate = (searchDate) => {
  if (!searchDate) return null;
  const parsed = new Date(`${searchDate}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const projectScheduleToSearchDate = (bus, searchDate) => {
  if (!bus || !searchDate) return bus;

  const frequency = normalizeStatus(bus?.frequency || bus?.scheduleFrequency || 'ONCE');
  if (!['DAILY', 'WEEKDAYS', 'WEEKENDS', 'WEEKLY'].includes(frequency)) return bus;

  const departure = new Date(bus?.departureTime);
  const arrival = new Date(bus?.arrivalTime);
  const projectedDeparture = onTravelDate(searchDate, departure);
  if (!projectedDeparture || Number.isNaN(arrival.getTime())) return bus;

  const durationMs = arrival.getTime() - departure.getTime();
  const projectedArrival = new Date(projectedDeparture.getTime() + Math.max(durationMs, 0));

  return {
    ...bus,
    departureTime: projectedDeparture.toISOString(),
    arrivalTime: projectedArrival.toISOString(),
  };
};

const matchesFrequency = (bus, searchDate) => {
  if (!searchDate) return true;
  const scheduleDate = parseSearchDate(searchDate);
  if (!scheduleDate) return true;

  const frequency = normalizeStatus(bus?.frequency || bus?.scheduleFrequency || 'ONCE');
  const weekday = scheduleDate.getUTCDay();
  const templateDeparture = new Date(bus?.departureTime);
  const templateWeekday = Number.isNaN(templateDeparture.getTime()) ? weekday : istFields(templateDeparture).getUTCDay();
  const templateDate = toIstYmd(templateDeparture);

  if (frequency === 'DAILY') return true;
  if (frequency === 'WEEKDAYS') return weekday >= 1 && weekday <= 5;
  if (frequency === 'WEEKENDS') return weekday === 0 || weekday === 6;
  if (frequency === 'WEEKLY') return weekday === templateWeekday;
  return searchDate === templateDate;
};

export const shouldShowBusForSearch = (bus, searchDate, now = new Date()) => {
  const departure = new Date(bus?.departureTime);
  if (Number.isNaN(departure.getTime())) return false;
  if (getTripStatusValue(bus) === 'COMPLETED') return false;
  if (!matchesFrequency(bus, searchDate)) return false;
  if (searchDate) {
    if (searchDate === toIstYmd(now) && departure.getTime() <= now.getTime()) return false;
  }
  return true;
};
