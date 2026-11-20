import { isSeatAvailableForBooking } from '../../../shared/utils/scheduleSearchUtils';

/**
 * Places a seat on its deck grid. Two numbering schemes exist:
 *  - berths "L1"/"U1": 3 per row (1 + 2), as the operator layout builder generates them;
 *  - seats "1A" (operator builder) or "A1" (seed data): number = row, letter = column.
 * Returns null when a seat number fits neither.
 */
export const placeSeat = (seat) => {
  const number = String(seat.seatNumber || '').trim().toUpperCase();
  let m = number.match(/^([LU])(\d+)$/);
  if (m) {
    const pos = Number(m[2]) - 1;
    return { ...seat, deck: m[1] === 'U' ? 'upper' : 'lower', row: Math.floor(pos / 3), col: pos % 3, berth: true };
  }
  m = number.match(/^(\d+)([A-F])$/) || number.match(/^([A-F])(\d+)$/);
  if (m) {
    const [rowPart, colPart] = /^\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
    return { ...seat, deck: 'lower', row: Number(rowPart) - 1, col: colPart.charCodeAt(0) - 65, berth: false };
  }
  return null;
};

/** Column after which the aisle runs: 2 + 2 for four columns, otherwise after the first (1 + 2, 1 + 1). */
export const aisleAfter = (cols) => (cols >= 4 ? Math.floor(cols / 2) - 1 : cols >= 2 ? 0 : -1);

/** seatNumber → seat numbers directly beside it (same deck and row, same side of the aisle). */
export const buildSeatNeighbours = (placedSeats) => {
  const neighbours = new Map();
  const decks = new Map();
  placedSeats.forEach((s) => decks.set(s.deck, [...(decks.get(s.deck) || []), s]));
  decks.forEach((deckSeats) => {
    const aisle = aisleAfter(Math.max(...deckSeats.map((s) => s.col)) + 1);
    const side = (col) => (col <= aisle ? 0 : 1);
    const byPos = new Map(deckSeats.map((s) => [`${s.row}:${s.col}`, s]));
    deckSeats.forEach((s) => {
      const next = [s.col - 1, s.col + 1]
        .map((col) => byPos.get(`${s.row}:${col}`))
        .filter((n) => n && side(n.col) === side(s.col));
      neighbours.set(s.seatNumber, next.map((n) => n.seatNumber));
    });
  });
  return neighbours;
};

/**
 * Seats only women may book: seats the operator reserved for women, and any open seat right
 * beside a seat already booked by a woman (from `bookedByFemale` on the seat map).
 * Returns Map seatNumber → 'reserved' | 'beside-woman'.
 */
export const getWomenOnlySeats = (seats) => {
  const placed = seats.map(placeSeat);
  const neighbours = placed.every(Boolean) ? buildSeatNeighbours(placed) : new Map();
  const bySeat = new Map(seats.map((s) => [s.seatNumber, s]));
  const result = new Map();
  seats.forEach((seat) => {
    if (seat.isLadiesOnly) { result.set(seat.seatNumber, 'reserved'); return; }
    if (!isSeatAvailableForBooking(seat)) return;
    const besideWoman = (neighbours.get(seat.seatNumber) || []).some((n) => {
      const other = bySeat.get(n);
      return other?.bookedByFemale && !isSeatAvailableForBooking(other);
    });
    if (besideWoman) result.set(seat.seatNumber, 'beside-woman');
  });
  return result;
};
