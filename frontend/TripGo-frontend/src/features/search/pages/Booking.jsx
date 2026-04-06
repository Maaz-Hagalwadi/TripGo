import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { ROUTES } from '../../../shared/constants/routes';
import { getSchedulePointsForBooking, getScheduleSeats, lockScheduleSeats } from '../../../api/bookingService';

const seatComparator = (a, b) => String(a.seatNumber || '').localeCompare(String(b.seatNumber || ''), undefined, { numeric: true, sensitivity: 'base' });
const SEATER_COL_MAP = { A: 0, B: 1, C: 2, D: 3 };
const formatDuration = (dep, arr) => {
  if (!dep || !arr) return '--';
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} hr ${m} min`;
};
const formatCountdown = (seconds) => {
  const safe = Math.max(0, seconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

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

const SeatMarks = ({ seat }) => {
  const marks = [];
  if (seat.isLadiesOnly) marks.push({ text: 'F', className: 'bg-pink-500 text-white' });
  if (seat.isWindow) marks.push({ text: 'W', className: 'bg-blue-500 text-white' });
  if (seat.isAisle) marks.push({ text: 'A', className: 'bg-emerald-500 text-white' });
  if (seat.isBlocked) marks.push({ text: 'X', className: 'bg-red-500 text-white' });
  if (!marks.length) return null;
  return (
    <div className="absolute -top-1 -right-1 flex gap-0.5">
      {marks.map((mark, idx) => (
        <span
          key={`${mark.text}-${idx}`}
          className={`w-3 h-3 rounded text-[8px] leading-3 text-center font-bold ${mark.className}`}
        >
          {mark.text}
        </span>
      ))}
    </div>
  );
};

const UserSeaterSeat = ({ seat, selectedSeats, onToggleSeat }) => {
  const isSelected = selectedSeats.includes(seat.seatNumber);
  const isAvailable = Boolean(seat.available);
  return (
    <button
      onClick={() => isAvailable && onToggleSeat(seat.seatNumber)}
      disabled={!isAvailable}
      className="relative flex flex-col items-center transition-all group disabled:cursor-not-allowed"
      style={{ width: 36, height: 44 }}
      title={seat.seatNumber}
    >
      <SeatMarks seat={seat} />
      <div className={`w-6 h-2.5 rounded-t-md border-t-2 border-x-2 ${
        isAvailable ? (isSelected ? 'border-primary bg-primary/25' : 'border-emerald-500/70 bg-emerald-500/20') : 'border-slate-500 bg-slate-700/40'
      }`} />
      <div className={`w-8 h-7 rounded-b-lg border-2 border-t-0 flex items-end justify-center pb-0.5 ${
        isAvailable ? (isSelected ? 'border-primary bg-primary/10' : 'border-emerald-500/70 bg-emerald-500/10') : 'border-slate-500 bg-slate-700/30'
      }`}>
        <span className={`text-[9px] font-bold ${
          isAvailable ? (isSelected ? 'text-primary' : 'text-emerald-300') : 'text-slate-300'
        }`}>{seat.seatNumber}</span>
      </div>
    </button>
  );
};

const UserSleeperSeat = ({ seat, selectedSeats, onToggleSeat }) => {
  const isSelected = selectedSeats.includes(seat.seatNumber);
  const isAvailable = Boolean(seat.available);
  return (
    <button
      onClick={() => isAvailable && onToggleSeat(seat.seatNumber)}
      disabled={!isAvailable}
      className={`relative flex flex-col items-center justify-between rounded border-2 transition-all group disabled:cursor-not-allowed ${
        isAvailable ? (isSelected ? 'border-primary bg-primary/10' : 'border-emerald-500/70 bg-emerald-500/10') : 'border-slate-500 bg-slate-700/30'
      }`}
      style={{ width: 30, height: 58, padding: '4px 2px' }}
      title={seat.seatNumber}
    >
      <SeatMarks seat={seat} />
      <div className="w-5 h-4 rounded-sm border border-slate-300 dark:border-slate-500 bg-slate-100 dark:bg-slate-600" />
      <span className={`text-[8px] font-bold leading-none ${
        isAvailable ? (isSelected ? 'text-primary' : 'text-emerald-300') : 'text-slate-300'
      }`}>{seat.seatNumber}</span>
    </button>
  );
};

const UserSleeperDeck = ({ deck, seats, selectedSeats, onToggleSeat }) => {
  const deckSeats = seats.filter((seat) => seat.deck === deck);
  const rows = [...new Set(deckSeats.map((seat) => seat.row))].sort((a, b) => a - b);
  return (
    <div className="flex gap-1">
      <div className="flex flex-col gap-1">
        {rows.map((row) => {
          const seat = deckSeats.find((item) => item.row === row && item.col === 0);
          return seat ? <UserSleeperSeat key={seat.seatNumber} seat={seat} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} /> : <div key={`${deck}-${row}-0`} style={{ width: 30, height: 58 }} />;
        })}
      </div>
      <div className="flex flex-col justify-center" style={{ width: 16 }}>
        <div className="w-px bg-slate-300 dark:bg-slate-600" style={{ height: rows.length * 58 + (rows.length - 1) * 4 }} />
      </div>
      {[1, 2].map((col) => (
        <div key={`${deck}-${col}`} className="flex flex-col gap-1">
          {rows.map((row) => {
            const seat = deckSeats.find((item) => item.row === row && item.col === col);
            return seat ? <UserSleeperSeat key={seat.seatNumber} seat={seat} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} /> : <div key={`${deck}-${row}-${col}`} style={{ width: 30, height: 58 }} />;
          })}
        </div>
      ))}
    </div>
  );
};

const UserSeaterLayout = ({ seats, selectedSeats, onToggleSeat }) => {
  const rows = [...new Set(seats.map((seat) => seat.row))].sort((a, b) => a - b);
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const rowSeats = seats.filter((seat) => seat.row === row).sort((a, b) => a.col - b.col);
        const left = rowSeats.filter((seat) => seat.col < 2);
        const right = rowSeats.filter((seat) => seat.col >= 2);
        return (
          <div key={`row-${row}`} className="flex items-center gap-1">
            <div className="flex gap-1">
              {left.map((seat) => <UserSeaterSeat key={seat.seatNumber} seat={seat} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} />)}
            </div>
            <div className="w-6 flex items-center justify-center"><div className="h-8 w-px bg-slate-300 dark:bg-slate-600" /></div>
            <div className="flex gap-1">
              {right.map((seat) => <UserSeaterSeat key={seat.seatNumber} seat={seat} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const pointLabel = (point) => [point.arrivalTime, point.name, point.landmark, point.address].filter(Boolean).join(' • ');

const Booking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bus, selectedType, selectedFare, searchParams } = location.state || {};
  const scheduleId = bus?.scheduleId;

  const [step, setStep] = useState('seats');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatsResponse, setSeatsResponse] = useState(null);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [loadingSeatsError, setLoadingSeatsError] = useState('');
  const [lockInfo, setLockInfo] = useState(null);
  const [lockingSeats, setLockingSeats] = useState(false);
  const [lockExpiresAt, setLockExpiresAt] = useState(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);

  const [points, setPoints] = useState({ boardingPoints: [], droppingPoints: [] });
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [selection, setSelection] = useState({ boardingPointId: '', droppingPointId: '' });
  const [contact, setContact] = useState({ countryCode: '+91 (IND)', phone: '', email: '', stateOfResidence: '', whatsappOptIn: true });
  const [passenger, setPassenger] = useState({ name: '', age: '', gender: '', phone: '', email: '' });

  useEffect(() => {
    if (!scheduleId) return;
    const fetchSeats = async () => {
      setLoadingSeats(true);
      setLoadingSeatsError('');
      try {
        setSeatsResponse(await getScheduleSeats(scheduleId));
      } catch (e) {
        setLoadingSeatsError(e.message || 'Failed to load seats');
      } finally {
        setLoadingSeats(false);
      }
    };
    fetchSeats();
  }, [scheduleId]);

  useEffect(() => {
    if (step !== 'details' || !scheduleId) return;
    const fetchPoints = async () => {
      setLoadingPoints(true);
      try {
        const data = await getSchedulePointsForBooking(scheduleId);
        setPoints({
          boardingPoints: Array.isArray(data?.boardingPoints) ? data.boardingPoints : [],
          droppingPoints: Array.isArray(data?.droppingPoints) ? data.droppingPoints : [],
        });
      } finally {
        setLoadingPoints(false);
      }
    };
    fetchPoints();
  }, [step, scheduleId]);

  useEffect(() => {
    if (!lockExpiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000));
      setLockSecondsLeft(left);
      if (left <= 0) {
        setStep('seats');
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [lockExpiresAt]);

  const seats = useMemo(() => {
    if (Array.isArray(seatsResponse?.upperDeck) || Array.isArray(seatsResponse?.lowerDeck)) {
      const lower = (seatsResponse?.lowerDeck || []).map((seat) => ({ ...seat, deck: 'lower' }));
      const upper = (seatsResponse?.upperDeck || []).map((seat) => ({ ...seat, deck: 'upper' }));
      return [...lower, ...upper].sort(seatComparator);
    }
    if (Array.isArray(seatsResponse?.seats)) {
      return seatsResponse.seats.map((seat) => ({ ...seat, deck: seatsResponse.deck || 'lower' })).sort(seatComparator);
    }
    if (Array.isArray(bus?.seatAvailability)) return [...bus.seatAvailability].sort(seatComparator);
    return [];
  }, [seatsResponse, bus]);

  const isSleeper = useMemo(() => {
    if (seats.some((seat) => String(seat.seatType || '').toUpperCase().includes('SLEEPER'))) return true;
    return String(bus?.busType || '').includes('SLEEPER') && !String(bus?.busType || '').includes('SEMI');
  }, [seats, bus]);

  const parsedLayoutSeats = useMemo(() => {
    if (!seats.length) return [];
    const parser = isSleeper ? parseSleeperSeat : parseSeaterSeat;
    return seats
      .map(parser)
      .filter(Boolean)
      .sort((a, b) => (a.row - b.row) || (a.col - b.col) || String(a.seatNumber).localeCompare(String(b.seatNumber), undefined, { numeric: true }));
  }, [seats, isSleeper]);
  const hasLayoutData = parsedLayoutSeats.length === seats.length;

  const boardingPoints = points.boardingPoints || [];
  const droppingPoints = points.droppingPoints || [];
  const routeStops = useMemo(() => {
    if (Array.isArray(bus?.routeStops) && bus.routeStops.length) return bus.routeStops;
    return [searchParams?.from, searchParams?.to].filter(Boolean);
  }, [bus, searchParams]);
  const busFeatures = useMemo(() => {
    const amenities = Array.isArray(bus?.amenities) ? bus.amenities : [];
    if (!amenities.length) return ['Charging Point', 'Reading Light'];
    return amenities;
  }, [bus]);

  const onToggleSeat = (seatNumber) => {
    setSelectedSeats((prev) => (prev.includes(seatNumber) ? prev.filter((seat) => seat !== seatNumber) : [...prev, seatNumber]));
    setLockInfo(null);
    setLockExpiresAt(null);
    setLockSecondsLeft(0);
  };

  if (!bus) {
    return (
      <UserLayout activeItem="search" title="Select Seat">
        <div className="bg-charcoal border border-white/5 rounded-xl p-6 text-slate-100">
          <p className="text-sm text-slate-300 mb-4">No bus selected. Please search and choose a bus first.</p>
          <button onClick={() => navigate(ROUTES.SEARCH_RESULTS)} className="px-4 py-2 bg-primary text-black rounded-lg font-semibold">Back to Search</button>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout activeItem="search" title="Booking Flow">
      <div className="space-y-6 bg-deep-black rounded-2xl p-4 md:p-6 text-slate-100">
        <div className="bg-charcoal border border-white/5 rounded-xl p-5">
          <h3 className="text-lg font-bold">{bus.busName}</h3>
          <p className="text-sm text-slate-300 mt-1">{searchParams?.from} → {searchParams?.to} · {selectedType || 'Seat'}</p>
          <p className="text-sm font-semibold text-primary mt-2">Fare: ₹{selectedFare ? Math.round(selectedFare.totalFare) : '--'}</p>
          <p className="text-xs text-slate-400 mt-2">Step: {step === 'seats' ? '1. Select & Lock Seats' : '2. Boarding, Dropping & Passenger'}</p>
          {!!selectedSeats.length && <p className="text-xs text-slate-300 mt-1">Selected: {selectedSeats.join(', ')}</p>}
          {lockInfo && lockSecondsLeft > 0 && (
            <p className="text-xs text-amber-300 mt-1">
              Make payment within <span className="font-bold">{formatCountdown(lockSecondsLeft)}</span> or the seat lock will expire.
            </p>
          )}
        </div>

        {step === 'seats' && (
          <div className="bg-charcoal border border-white/5 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Seats</h3>
              <p className="text-xs text-slate-300">Available: <span className="text-emerald-400 font-bold">{seats.filter((seat) => seat.available).length}</span> / {seats.length}</p>
            </div>

            <div className="flex flex-wrap gap-3 mb-4 text-xs">
              <span className="px-2 py-1 rounded border border-emerald-500/40 text-emerald-400 bg-emerald-500/10">Available</span>
              <span className="px-2 py-1 rounded border border-slate-500/50 text-slate-300 bg-slate-700/30">Booked</span>
              <span className="px-2 py-1 rounded border border-blue-500/40 text-blue-300 bg-blue-500/10">W Window</span>
              <span className="px-2 py-1 rounded border border-pink-500/40 text-pink-300 bg-pink-500/10">F Female</span>
              <span className="px-2 py-1 rounded border border-emerald-500/40 text-emerald-300 bg-emerald-500/10">A Aisle</span>
            </div>

            {loadingSeatsError && <p className="text-sm text-red-500 mb-3">{loadingSeatsError}</p>}
            {loadingSeats ? (
              <p className="text-sm text-slate-300">Loading seats...</p>
            ) : seats.length === 0 ? (
              <p className="text-sm text-slate-300">Seat layout is not available for this bus yet.</p>
            ) : (
              <div className="overflow-x-auto pb-2">
                {hasLayoutData ? (
                  isSleeper ? (
                    <div className="flex gap-8">
                      <div>
                        <p className="text-xs text-slate-500 mb-2">Lower Deck</p>
                        <UserSleeperDeck deck="lower" seats={parsedLayoutSeats} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-2">Upper Deck</p>
                        <UserSleeperDeck deck="upper" seats={parsedLayoutSeats} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} />
                      </div>
                    </div>
                  ) : (
                    <UserSeaterLayout seats={parsedLayoutSeats} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} />
                  )
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {seats.map((seat) => {
                        const isSelected = selectedSeats.includes(seat.seatNumber);
                        const isAvailable = Boolean(seat.available);
                        return (
                          <button
                          key={seat.seatNumber}
                          disabled={!isAvailable}
                          onClick={() => isAvailable && onToggleSeat(seat.seatNumber)}
                          className={`px-2 py-3 rounded-lg text-xs font-semibold border transition-colors ${
                            isAvailable
                              ? isSelected
                                ? 'border-primary bg-primary/15 text-primary'
                                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400'
                              : 'border-slate-600 bg-slate-700/30 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          <div className="leading-tight">
                            <div>{seat.seatNumber}</div>
                            <div className="text-[9px]">{isAvailable ? 'Available' : 'Booked'}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5">Back</button>
              <button
                onClick={async () => {
                  if (!selectedSeats.length) return toast.error('Please select seat(s)');
                  if (!scheduleId) return toast.error('Schedule ID missing for this bus');
                  try {
                    setLockingSeats(true);
                    const result = await lockScheduleSeats(scheduleId, selectedSeats);
                    setLockInfo(result || null);
                    const expiresInMinutes = Number(result?.expiresInMinutes || 15);
                    setLockExpiresAt(Date.now() + expiresInMinutes * 60 * 1000);
                    setLockSecondsLeft(expiresInMinutes * 60);
                    toast.success(`Seats locked. Complete payment within ${result?.expiresInMinutes || 15} minutes to confirm booking.`);
                    setStep('details');
                  } catch (e) {
                    toast.error(e.message || 'Failed to lock seats');
                  } finally {
                    setLockingSeats(false);
                  }
                }}
                disabled={lockingSeats || loadingSeats}
                className="px-4 py-2 rounded-lg bg-primary text-black font-semibold hover:bg-primary/90 disabled:opacity-60"
              >
                {lockingSeats ? 'Locking...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="bg-charcoal border border-white/5 rounded-xl p-5 space-y-4">
            <h3 className="text-lg font-bold">Boarding, Dropping & Passenger</h3>
            <div className="border border-white/10 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold">Contact details</h4>
              <p className="text-xs text-slate-400">Ticket details will be sent to</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Country Code</label>
                  <input value={contact.countryCode} readOnly className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-input-gray text-slate-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone *</label>
                  <input
                    value={contact.phone}
                    onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10) }))}
                    placeholder="Phone"
                    className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-input-gray text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email ID *</label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Enter email id"
                    className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-input-gray text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">State of Residence *</label>
                  <input
                    value={contact.stateOfResidence}
                    onChange={(e) => setContact((p) => ({ ...p, stateOfResidence: e.target.value }))}
                    placeholder="Required for GST invoicing"
                    className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-input-gray text-white"
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contact.whatsappOptIn}
                  onChange={(e) => setContact((p) => ({ ...p, whatsappOptIn: e.target.checked }))}
                  className="accent-primary"
                />
                Send booking details and trip updates on WhatsApp
              </label>
            </div>
            {loadingPoints ? (
              <p className="text-sm text-slate-300">Loading boarding/dropping points...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Boarding Point *</label>
                    <select
                      value={selection.boardingPointId}
                      onChange={(e) => setSelection((p) => ({ ...p, boardingPointId: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-input-gray text-white"
                    >
                      <option value="">Select boarding point</option>
                      {boardingPoints.map((point) => <option key={point.id} value={point.id}>{pointLabel(point)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Dropping Point *</label>
                    <select
                      value={selection.droppingPointId}
                      onChange={(e) => setSelection((p) => ({ ...p, droppingPointId: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-input-gray text-white"
                    >
                      <option value="">Select dropping point</option>
                      {droppingPoints.map((point) => <option key={point.id} value={point.id}>{pointLabel(point)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="bg-input-gray border border-white/10 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-300 mb-2">Boarding points</p>
                    {boardingPoints.length === 0 ? (
                      <p className="text-xs text-slate-400">No boarding points available</p>
                    ) : (
                      <div className="space-y-1">
                        {boardingPoints.map((point) => (
                          <p key={point.id} className="text-xs text-slate-300">{pointLabel(point)}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-input-gray border border-white/10 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-300 mb-2">Dropping points</p>
                    {droppingPoints.length === 0 ? (
                      <p className="text-xs text-slate-400">No dropping points available</p>
                    ) : (
                      <div className="space-y-1">
                        {droppingPoints.map((point) => (
                          <p key={point.id} className="text-xs text-slate-300">{pointLabel(point)}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {!loadingPoints && boardingPoints.length + droppingPoints.length === 0 && (
              <p className="text-xs text-amber-300">No boarding/dropping points available from API yet. You can continue with manual passenger details for now.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Passenger Name *</label>
                <input value={passenger.name} onChange={(e) => setPassenger((p) => ({ ...p, name: e.target.value }))} placeholder="Enter passenger name" className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-input-gray text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Age *</label>
                <input type="number" min="1" value={passenger.age} onChange={(e) => setPassenger((p) => ({ ...p, age: e.target.value }))} placeholder="Enter age" className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-input-gray text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Gender *</label>
                <select value={passenger.gender} onChange={(e) => setPassenger((p) => ({ ...p, gender: e.target.value }))} className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-input-gray text-white">
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Phone *</label>
                <input value={passenger.phone} onChange={(e) => setPassenger((p) => ({ ...p, phone: e.target.value }))} placeholder="Enter phone number" className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-input-gray text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Email *</label>
                <input type="email" value={passenger.email} onChange={(e) => setPassenger((p) => ({ ...p, email: e.target.value }))} placeholder="Enter email" className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-input-gray text-white" />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setStep('seats')} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5">Back to Seats</button>
              <button
                onClick={() => {
                  const phoneValid = /^[6-9]\d{9}$/.test(contact.phone.trim());
                  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim());
                  if (!phoneValid) {
                    return toast.error('Enter a valid 10-digit phone number');
                  }
                  if (!emailValid) {
                    return toast.error('Enter a valid email address');
                  }
                  if (!contact.stateOfResidence.trim()) {
                    return toast.error('State of residence is required');
                  }
                  if (!passenger.name.trim() || !passenger.age || !passenger.gender || !passenger.phone.trim() || !passenger.email.trim()) {
                    return toast.error('Please fill passenger details');
                  }
                  if (lockSecondsLeft <= 0) {
                    return toast.error('Seat lock expired. Please select and lock seats again.');
                  }
                  if (boardingPoints.length + droppingPoints.length > 0 && (!selection.boardingPointId || !selection.droppingPointId)) {
                    return toast.error('Please select boarding and dropping points');
                  }
                  toast.success('Passenger details captured. Payment integration is next.');
                }}
                className="px-4 py-2 rounded-lg bg-primary text-black font-semibold hover:bg-primary/90"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        )}

        <div className="bg-charcoal border border-white/5 rounded-xl p-5 space-y-3">
          <h3 className="text-lg font-bold">Bus route</h3>
          <p className="text-sm text-slate-300">{bus?.distanceKm || 487} km · {formatDuration(bus?.departureTime, bus?.arrivalTime)}</p>
          <div className="text-xs text-slate-300 flex flex-wrap gap-1">
            {routeStops.map((stop, idx) => (
              <span key={`${stop}-${idx}`}>
                {stop}{idx < routeStops.length - 1 ? ' → ' : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-charcoal border border-white/5 rounded-xl p-5 space-y-3">
          <h3 className="text-lg font-bold">Rest stop</h3>
          <p className="text-sm text-slate-300">
            {bus?.restStopName ? bus.restStopName : 'This bus has no rest stop'}
          </p>
        </div>

        <div className="bg-charcoal border border-white/5 rounded-xl p-5 space-y-3">
          <h3 className="text-lg font-bold">Bus Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {busFeatures.map((feature, idx) => (
              <div key={`${feature}-${idx}`} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-charcoal border border-white/5 rounded-xl p-5 space-y-3">
          <h3 className="text-lg font-bold">Cancellation & Date Change Policy</h3>
          <p className="text-xs text-slate-300">Cancellation charges may vary based on cancellation time and operator rules. Refund, if eligible, will be processed as per platform T&C.</p>
          <p className="text-xs text-slate-300">Date change is subject to seat availability and operator policy. Fare difference and applicable reschedule charges may apply.</p>
        </div>

        <div className="bg-charcoal border border-white/5 rounded-xl p-5 space-y-2">
          <h3 className="text-lg font-bold">Other Policies</h3>
          <p className="text-xs text-slate-300"><span className="font-semibold">Child passenger policy:</span> Children above the age of 5 will need a ticket.</p>
          <p className="text-xs text-slate-300"><span className="font-semibold">Luggage policy:</span> 2 pieces of luggage accepted free of charge per passenger. Excess baggage over 20 kgs is chargeable.</p>
          <p className="text-xs text-slate-300"><span className="font-semibold">Pets policy:</span> Pets are not allowed.</p>
          <p className="text-xs text-slate-300"><span className="font-semibold">Liquor policy:</span> Carrying or consuming liquor inside the bus is prohibited.</p>
          <p className="text-xs text-slate-300"><span className="font-semibold">Pick up time policy:</span> Operator is not obligated to wait beyond scheduled departure time.</p>
        </div>
      </div>
    </UserLayout>
  );
};

export default Booking;
