import { useMemo, useState } from 'react';
import { isSeatAvailableForBooking, isSeatBlocked } from '../../../shared/utils/scheduleSearchUtils';
import { aisleAfter as getAisleAfter, getWomenOnlySeats, placeSeat } from '../utils/seatLayout';

const SEAT_W = 40;
const SEAT_H = 38;
const BERTH_H = 78;

const seatState = (seat, selected) => {
  if (selected) return 'selected';
  if (isSeatAvailableForBooking(seat)) return 'available';
  return isSeatBlocked(seat) ? 'blocked' : 'sold';
};

const SteeringWheel = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-label="Driver">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.2" />
    <path d="M3.5 10.5h6.3M14.2 10.5h6.3M12 14.2V21" />
  </svg>
);

const SEAT_STYLES = {
  available: { box: 'bg-white border-emerald-500 hover:bg-emerald-50', bar: 'bg-emerald-500/35', num: 'text-slate-500', price: 'text-slate-700' },
  ladies: { box: 'bg-white border-pink-500 hover:bg-pink-50', bar: 'bg-pink-500/35', num: 'text-pink-600', price: 'text-pink-600' },
  selected: { box: 'bg-primary border-primary shadow-md shadow-primary/25', bar: 'bg-[#FDBA74]', num: 'text-white', price: 'text-primary font-black' },
  sold: { box: 'bg-slate-100 border-slate-200', bar: 'bg-slate-300', num: 'text-slate-400', price: 'text-slate-400' },
  soldFemale: { box: 'bg-pink-50 border-pink-200', bar: 'bg-pink-200', num: 'text-pink-300', price: 'text-pink-400' },
};

const Seat = ({ seat, price, selected, dimmed, womenOnly, onToggle }) => {
  const state = seatState(seat, selected);
  const open = state === 'available' || state === 'selected';
  const style = state === 'available' && womenOnly ? SEAT_STYLES.ladies
    : state === 'sold' && seat.bookedByFemale ? SEAT_STYLES.soldFemale
    : SEAT_STYLES[state === 'blocked' ? 'sold' : state];
  const kind = seat.berth ? (seat.deck === 'upper' ? 'Upper berth' : 'Lower berth') : 'Seat';
  const label = [
    `${kind} ${seat.seatNumber}`,
    open && price ? `₹${price}` : state === 'blocked' ? 'Not available' : !open ? 'Sold' : '',
    seat.isWindow && 'Window',
    womenOnly === 'reserved' && 'Reserved for women',
    womenOnly === 'beside-woman' && 'Women only — next to a woman traveller',
    seat.bookedByFemale && 'Booked by a woman',
  ].filter(Boolean).join(' · ');

  return (
    <div className={`flex flex-col items-center gap-1 transition-opacity ${dimmed ? 'opacity-25' : ''}`} style={{ width: SEAT_W + 4 }}>
      <button
        type="button"
        disabled={!open}
        onClick={() => onToggle(seat.seatNumber)}
        title={label}
        aria-label={label}
        aria-pressed={selected}
        className={`relative flex flex-col items-center justify-end rounded-lg border-2 transition-all disabled:cursor-not-allowed ${style.box}`}
        style={{ width: SEAT_W, height: seat.berth ? BERTH_H : SEAT_H }}
      >
        <span className={`absolute top-1 text-[9px] font-bold leading-none ${style.num}`}>{seat.seatNumber}</span>
        {seat.bookedByFemale && !open && seat.berth && (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-pink-400" aria-hidden="true">♀</span>
        )}
        {seat.bookedByFemale && !open && !seat.berth
          ? <span className="mb-0.5 text-xs leading-none text-pink-400" aria-hidden="true">♀</span>
          : <span className={`mb-1.5 h-1.5 rounded-full ${seat.berth ? 'w-6' : 'w-5'} ${style.bar}`} />}
      </button>
      <span className={`h-3.5 text-[10px] font-semibold leading-none ${style.price}`}>
        {open ? (price ? `₹${price}` : '') : state === 'blocked' ? 'N/A' : 'Sold'}
      </span>
    </div>
  );
};

const Deck = ({ title, seats, showWheel, renderSeat }) => {
  const cols = Math.max(...seats.map((s) => s.col)) + 1;
  const rows = Math.max(...seats.map((s) => s.row)) + 1;
  const aisleAfter = getAisleAfter(cols);
  const byPos = new Map(seats.map((s) => [`${s.row}:${s.col}`, s]));
  const cellH = (seats.some((s) => s.berth) ? BERTH_H : SEAT_H) + 18;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-6 border-b border-dashed border-slate-200 pb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
        {showWheel ? <SteeringWheel /> : <span className="w-6 h-6" />}
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex items-start">
            {Array.from({ length: cols }, (_, col) => {
              const seat = byPos.get(`${row}:${col}`);
              return (
                <div key={col} className="flex">
                  {seat ? renderSeat(seat) : <div style={{ width: SEAT_W + 4, height: cellH }} />}
                  {col === aisleAfter && <div className="w-5 sm:w-7" aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const LEGEND = [
  ['Available', 'bg-white border-emerald-500'],
  ['Selected', 'bg-primary border-primary'],
  ['Sold', 'bg-slate-100 border-slate-200'],
  ['For women', 'bg-white border-pink-500'],
  ['Booked by a woman', 'bg-pink-50 border-pink-200'],
];

/**
 * Seat picker: lower/upper deck panels with the driver up front, the fare under every seat,
 * fare filter chips and a legend. `priceOf(seat)` returns the seat's total fare (or null).
 */
const SeatMap = ({ seats, selectedSeats, onToggleSeat, priceOf }) => {
  const [priceFilter, setPriceFilter] = useState(null);
  const placed = useMemo(() => seats.map(placeSeat), [seats]);
  const womenOnly = useMemo(() => getWomenOnlySeats(seats), [seats]);
  const hasLayout = placed.length > 0 && placed.every(Boolean);
  const lower = hasLayout ? placed.filter((s) => s.deck === 'lower') : [];
  const upper = hasLayout ? placed.filter((s) => s.deck === 'upper') : [];

  const prices = useMemo(() => [...new Set(
    seats.filter(isSeatAvailableForBooking).map(priceOf).filter((p) => p != null),
  )].sort((a, b) => a - b), [seats, priceOf]);

  const renderSeat = (seat) => {
    const price = priceOf(seat);
    return (
      <Seat
        key={seat.seatNumber}
        seat={seat}
        price={price}
        selected={selectedSeats.includes(seat.seatNumber)}
        womenOnly={womenOnly.get(seat.seatNumber)}
        dimmed={priceFilter != null && price !== priceFilter && !selectedSeats.includes(seat.seatNumber)}
        onToggle={onToggleSeat}
      />
    );
  };

  return (
    <div>
      {prices.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter seats by fare">
          {[null, ...prices].map((p) => (
            <button
              key={p ?? 'all'}
              type="button"
              onClick={() => setPriceFilter(p)}
              aria-pressed={priceFilter === p}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                priceFilter === p ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-[#FF8A65]'
              }`}
            >
              {p == null ? 'All' : `₹${p.toLocaleString('en-IN')}`}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto pb-1">
        {hasLayout ? (
          <div className="mx-auto flex w-max flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            {lower.length > 0 && <Deck title={upper.length ? 'Lower deck' : 'Seats'} seats={lower} showWheel renderSeat={renderSeat} />}
            {upper.length > 0 && <Deck title="Upper deck" seats={upper} renderSeat={renderSeat} />}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
            {seats.map((seat) => renderSeat({ ...seat, berth: false }))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {LEGEND.map(([label, cls]) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-4 h-4 rounded border-2 ${cls}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SeatMap;
