import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  getScheduleSeats,
  getSchedulePolicies,
  rescheduleBooking,
} from '../../../api/bookingService';
import { isSeatAvailableForBooking } from '../../../shared/utils/scheduleSearchUtils';

const SEATER_COL_MAP = { A: 0, B: 1, C: 2, D: 3 };

const parseSleeperSeat = (seat) => {
  const match = String(seat.seatNumber || '').trim().toUpperCase().match(/^([LU])(\d+)$/);
  if (!match) return null;
  const deck = match[1] === 'L' ? 'lower' : 'upper';
  const position = Number(match[2]) - 1;
  if (Number.isNaN(position) || position < 0) return null;
  return { ...seat, deck, row: Math.floor(position / 3), col: position % 3 };
};

const parseSeaterSeat = (seat) => {
  const match = String(seat.seatNumber || '').trim().toUpperCase().match(/^(\d+)([A-Z])$/);
  if (!match) return null;
  const row = Number(match[1]) - 1;
  const col = SEATER_COL_MAP[match[2]];
  if (Number.isNaN(row) || row < 0 || col === undefined) return null;
  return { ...seat, row, col };
};

const SleeperSeat = ({ seat, selectedSeats, onToggle }) => {
  const isSelected = selectedSeats.includes(seat.seatNumber);
  const isAvailable = isSeatAvailableForBooking(seat);
  return (
    <button
      onClick={() => isAvailable && onToggle(seat.seatNumber)}
      disabled={!isAvailable}
      title={seat.seatNumber}
      className={`relative flex flex-col items-center justify-between rounded border-2 transition-all disabled:cursor-not-allowed ${
        isAvailable
          ? isSelected
            ? 'border-[#002046] bg-[#002046]/[0.08]'
            : 'border-emerald-400/70 bg-emerald-400/10'
          : 'border-slate-300 bg-slate-100/60'
      }`}
      style={{ width: 30, height: 58, padding: '4px 2px' }}
    >
      <div className="h-4 w-5 rounded-sm border border-slate-300 bg-slate-100" />
      <span className={`text-[8px] font-bold leading-none ${isAvailable ? (isSelected ? 'text-[#002046]' : 'text-emerald-700') : 'text-slate-400'}`}>
        {seat.seatNumber}
      </span>
    </button>
  );
};

const SeaterSeat = ({ seat, selectedSeats, onToggle }) => {
  const isSelected = selectedSeats.includes(seat.seatNumber);
  const isAvailable = isSeatAvailableForBooking(seat);
  return (
    <button
      onClick={() => isAvailable && onToggle(seat.seatNumber)}
      disabled={!isAvailable}
      title={seat.seatNumber}
      className="group relative flex flex-col items-center transition-all disabled:cursor-not-allowed"
      style={{ width: 36, height: 44 }}
    >
      <div className={`h-2.5 w-6 rounded-t-md border-t-2 border-x-2 ${
        isAvailable ? (isSelected ? 'border-[#002046] bg-[#002046]/[0.12]' : 'border-emerald-400/80 bg-emerald-400/20') : 'border-slate-300 bg-slate-200/40'
      }`} />
      <div className={`flex h-7 w-8 items-end justify-center rounded-b-lg border-2 border-t-0 pb-0.5 ${
        isAvailable ? (isSelected ? 'border-[#002046] bg-[#002046]/[0.08]' : 'border-emerald-400/80 bg-emerald-400/10') : 'border-slate-300 bg-slate-200/30'
      }`}>
        <span className={`text-[9px] font-bold ${isAvailable ? (isSelected ? 'text-[#002046]' : 'text-emerald-700') : 'text-slate-400'}`}>
          {seat.seatNumber}
        </span>
      </div>
    </button>
  );
};

const SleeperDeck = ({ deck, seats, selectedSeats, onToggle }) => {
  const deckSeats = seats.filter((s) => s.deck === deck);
  const rows = [...new Set(deckSeats.map((s) => s.row))].sort((a, b) => a - b);
  return (
    <div className="flex gap-1">
      <div className="flex flex-col gap-1">
        {rows.map((row) => {
          const seat = deckSeats.find((s) => s.row === row && s.col === 0);
          return seat
            ? <SleeperSeat key={seat.seatNumber} seat={seat} selectedSeats={selectedSeats} onToggle={onToggle} />
            : <div key={`${deck}-${row}-0`} style={{ width: 30, height: 58 }} />;
        })}
      </div>
      <div className="flex flex-col justify-center" style={{ width: 16 }}>
        <div className="w-px bg-slate-300" style={{ height: rows.length * 58 + Math.max(0, rows.length - 1) * 4 }} />
      </div>
      {[1, 2].map((col) => (
        <div key={`${deck}-col-${col}`} className="flex flex-col gap-1">
          {rows.map((row) => {
            const seat = deckSeats.find((s) => s.row === row && s.col === col);
            return seat
              ? <SleeperSeat key={seat.seatNumber} seat={seat} selectedSeats={selectedSeats} onToggle={onToggle} />
              : <div key={`${deck}-${row}-${col}`} style={{ width: 30, height: 58 }} />;
          })}
        </div>
      ))}
    </div>
  );
};

const SeaterLayout = ({ seats, selectedSeats, onToggle }) => {
  const rows = [...new Set(seats.map((s) => s.row))].sort((a, b) => a - b);
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const rowSeats = seats.filter((s) => s.row === row).sort((a, b) => a.col - b.col);
        const left = rowSeats.filter((s) => s.col < 2);
        const right = rowSeats.filter((s) => s.col >= 2);
        return (
          <div key={`row-${row}`} className="flex items-center gap-1">
            <div className="flex gap-1">{left.map((s) => <SeaterSeat key={s.seatNumber} seat={s} selectedSeats={selectedSeats} onToggle={onToggle} />)}</div>
            <div className="flex w-6 items-center justify-center"><div className="h-8 w-px bg-slate-300" /></div>
            <div className="flex gap-1">{right.map((s) => <SeaterSeat key={s.seatNumber} seat={s} selectedSeats={selectedSeats} onToggle={onToggle} />)}</div>
          </div>
        );
      })}
    </div>
  );
};

const todayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const UserRescheduleModal = ({ booking, onClose, onSuccess }) => {
  const scheduleId = String(booking?.scheduleId || '');
  const bookingId = String(booking?.bookingId || booking?.id || '');
  const seatCount = Array.isArray(booking?.seatNumbers) ? booking.seatNumbers.length : 1;
  const isSleeperFromBooking = String(booking?.selectedType || booking?.busType || '').toLowerCase().includes('sleeper');

  const [step, setStep] = useState('date');
  const [newDate, setNewDate] = useState('');
  const [policy, setPolicy] = useState(null);
  const [seatData, setSeatData] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!scheduleId) return;
    getSchedulePolicies(scheduleId).then((p) => setPolicy(p)).catch(() => {});
  }, [scheduleId]);

  const minHours = policy?.dateChange?.minHoursBeforeDeparture ?? 12;

  const handleContinue = async () => {
    if (!newDate) return;
    setLoadingSeats(true);
    try {
      const data = await getScheduleSeats(scheduleId, newDate, booking?.from || '', booking?.to || '');
      setSeatData(data);
      setSelectedSeats([]);
      setStep('seats');
    } catch (e) {
      toast.error(e?.message || 'Failed to load seats for selected date');
    } finally {
      setLoadingSeats(false);
    }
  };

  const isSleeper = (() => {
    if (!seatData) return isSleeperFromBooking;
    if (Array.isArray(seatData?.upperDeck) || Array.isArray(seatData?.lowerDeck)) return true;
    if (Array.isArray(seatData?.seats) && seatData.seats.length > 0) {
      return /^[LU]\d+$/i.test(String(seatData.seats[0]?.seatNumber || ''));
    }
    return isSleeperFromBooking;
  })();

  const allSeats = (() => {
    if (!seatData) return [];
    if (Array.isArray(seatData?.upperDeck) || Array.isArray(seatData?.lowerDeck)) {
      const lower = (seatData.lowerDeck || []).map((s) => ({ ...s, deck: 'lower' }));
      const upper = (seatData.upperDeck || []).map((s) => ({ ...s, deck: 'upper' }));
      return [...lower, ...upper];
    }
    if (Array.isArray(seatData?.seats)) {
      return seatData.seats.map((s) => ({ ...s, deck: seatData.deck || 'lower' }));
    }
    return [];
  })();

  const parsedSeats = (() => {
    if (!allSeats.length) return [];
    const parser = isSleeper ? parseSleeperSeat : parseSeaterSeat;
    return allSeats.map(parser).filter(Boolean).sort((a, b) => (a.row - b.row) || (a.col - b.col));
  })();

  const onToggle = (seatNumber) => {
    setSelectedSeats((prev) =>
      prev.includes(seatNumber) ? prev.filter((s) => s !== seatNumber) : [...prev, seatNumber]
    );
  };

  const handleConfirm = async () => {
    if (selectedSeats.length !== seatCount) return;
    setSubmitting(true);
    try {
      await rescheduleBooking(bookingId, { newTravelDate: newDate, newSeatNumbers: selectedSeats });
      toast.success(`Booking rescheduled to ${new Date(newDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`);
      onSuccess();
    } catch (e) {
      toast.error(e?.message || 'Unable to reschedule booking right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200/70 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#002046]/80">Reschedule booking</p>
            <h2 className="mt-1.5 text-2xl font-black text-slate-900">{booking?.from || '--'} to {booking?.to || '--'}</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              {step === 'date' ? 'Choose a new travel date.' : `Select ${seatCount} seat${seatCount > 1 ? 's' : ''} for the new date.`}
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors flex-shrink-0">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Step indicator */}
          <div className="flex gap-2">
            {['Pick date', 'Select seats'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  (i === 0 && step === 'date') || (i === 1 && step === 'seats')
                    ? 'bg-[#002046] text-white'
                    : i < (step === 'seats' ? 1 : 0)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}>{i + 1}</div>
                <span className="text-xs text-slate-500 font-medium">{label}</span>
                {i < 1 && <div className="w-6 h-px bg-slate-200 mx-1" />}
              </div>
            ))}
          </div>

          {step === 'date' && (
            <>
              {/* Current booking info */}
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current booking</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Travel date</span>
                  <span className="font-semibold text-slate-900">{booking?.travelDate || booking?.departureTime?.split('T')[0] || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Seats</span>
                  <span className="font-semibold text-slate-900">{Array.isArray(booking?.seatNumbers) ? booking.seatNumbers.join(', ') : '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Bus</span>
                  <span className="font-semibold text-slate-900 truncate max-w-[200px]">{booking?.busName || '—'}</span>
                </div>
              </div>

              {/* Policy */}
              <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-200/70">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-600 text-lg mt-0.5 flex-shrink-0">info</span>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold">Reschedule policy</p>
                    <p className="mt-1 text-blue-700">Must reschedule at least <strong>{minHours} hours</strong> before departure. No additional fee.</p>
                  </div>
                </div>
              </div>

              {/* Date input */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">New travel date</label>
                <input
                  type="date"
                  value={newDate}
                  min={todayStr()}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200/70 focus:ring-2 focus:ring-[#002046]/30"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleContinue}
                  disabled={!newDate || loadingSeats}
                  className="flex-1 rounded-2xl bg-[#002046] px-4 py-3 text-sm font-bold text-white hover:bg-[#003a80] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingSeats && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                  {loadingSeats ? 'Loading seats…' : 'Continue'}
                </button>
              </div>
            </>
          )}

          {step === 'seats' && (
            <>
              {/* Seat legend */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 font-semibold ring-1 ring-emerald-200">Available</span>
                <span className="rounded-full bg-[#002046]/[0.08] px-3 py-1.5 text-[#002046] font-semibold ring-1 ring-[#002046]/20">Selected</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-500 font-semibold ring-1 ring-slate-200">Unavailable</span>
              </div>

              {/* Seat counter */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Select <strong className="text-slate-900">{seatCount}</strong> seat{seatCount > 1 ? 's' : ''}
                </p>
                <p className={`text-sm font-bold ${selectedSeats.length === seatCount ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {selectedSeats.length} / {seatCount} selected
                </p>
              </div>

              {/* Seat layout */}
              <div className="overflow-x-auto rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
                {parsedSeats.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No seat data available for this date.</p>
                ) : isSleeper ? (
                  <div className="flex gap-8">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Lower Deck</p>
                      <SleeperDeck deck="lower" seats={parsedSeats} selectedSeats={selectedSeats} onToggle={onToggle} />
                    </div>
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Upper Deck</p>
                      <SleeperDeck deck="upper" seats={parsedSeats} selectedSeats={selectedSeats} onToggle={onToggle} />
                    </div>
                  </div>
                ) : (
                  <SeaterLayout seats={parsedSeats} selectedSeats={selectedSeats} onToggle={onToggle} />
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setStep('date'); setSelectedSeats([]); }} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors">
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={selectedSeats.length !== seatCount || submitting}
                  className="flex-1 rounded-2xl bg-[#002046] px-4 py-3 text-sm font-bold text-white hover:bg-[#003a80] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                  {submitting ? 'Rescheduling…' : 'Confirm Reschedule'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserRescheduleModal;
