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

export const toUtcYmd = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

export const formatUtcTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  let hours = date.getUTCHours();
  const minutes = pad(date.getUTCMinutes());
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${pad(hours)}:${minutes} ${suffix}`;
};

export const formatUtcDateTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  const day = pad(date.getUTCDate());
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${formatUtcTime(date)}`;
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

  const targetDate = parseSearchDate(searchDate);
  const departure = new Date(bus?.departureTime);
  const arrival = new Date(bus?.arrivalTime);
  if (!targetDate || Number.isNaN(departure.getTime()) || Number.isNaN(arrival.getTime())) return bus;

  const projectedDeparture = new Date(Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
    departure.getUTCHours(),
    departure.getUTCMinutes(),
    departure.getUTCSeconds(),
    departure.getUTCMilliseconds()
  ));

  const durationMs = arrival.getTime() - departure.getTime();
  const projectedArrival = Number.isFinite(durationMs)
    ? new Date(projectedDeparture.getTime() + Math.max(durationMs, 0))
    : arrival;

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
  const templateWeekday = Number.isNaN(templateDeparture.getTime()) ? weekday : templateDeparture.getUTCDay();
  const templateDate = toUtcYmd(templateDeparture);

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
    const searchMoment = parseSearchDate(searchDate);
    const nowUtcYmd = toUtcYmd(now);
    if (searchMoment && searchDate === nowUtcYmd) {
      const departureMinutes = departure.getUTCHours() * 60 + departure.getUTCMinutes();
      const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      if (departureMinutes <= nowMinutes) return false;
    }
  }
  return true;
};
