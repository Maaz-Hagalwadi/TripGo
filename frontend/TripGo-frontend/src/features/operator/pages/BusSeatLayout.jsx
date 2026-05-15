import { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { useBusWizard } from '../context/BusWizardContext';
import { ROUTES } from '../../../shared/constants/routes';

const MARK_FLAGS = [
  { key: 'isLadiesOnly', label: 'Ladies Only', icon: 'female',     bg: 'bg-pink-500',   light: 'bg-pink-50 text-pink-600 border-pink-300',   off: 'bg-white text-slate-500 border-slate-200 hover:border-pink-300'  },
  { key: 'isWindow',     label: 'Window',      icon: 'window',     bg: 'bg-blue-500',   light: 'bg-blue-50 text-blue-600 border-blue-300',   off: 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'  },
  { key: 'isAisle',      label: 'Aisle',       icon: 'swap_horiz', bg: 'bg-teal-500',   light: 'bg-teal-50 text-teal-600 border-teal-300',   off: 'bg-white text-slate-500 border-slate-200 hover:border-teal-300'  },
  { key: 'isBlocked',    label: 'Blocked',     icon: 'block',      bg: 'bg-slate-400',  light: 'bg-slate-100 text-slate-600 border-slate-400', off: 'bg-white text-slate-500 border-slate-200 hover:border-slate-400' },
];

const getSeatColor = (marks, isActive) => {
  if (isActive)           return { bg: 'bg-[#002046]', border: 'border-[#002046]', text: 'text-white' };
  if (!marks)             return { bg: 'bg-white', border: 'border-slate-300', text: 'text-slate-600' };
  if (marks.isBlocked)    return { bg: 'bg-slate-200', border: 'border-slate-400', text: 'text-slate-400' };
  if (marks.isLadiesOnly) return { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-600' };
  if (marks.isWindow)     return { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-600' };
  if (marks.isAisle)      return { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-600' };
  return { bg: 'bg-white', border: 'border-slate-300', text: 'text-slate-600' };
};

const SleeperSeat = memo(({ seat, marks, onSelect, isActive }) => {
  const { bg, border, text } = getSeatColor(marks, isActive);
  return (
    <button
      onClick={() => onSelect(seat)}
      title={`Berth ${seat.number}`}
      className={`relative flex flex-col items-center justify-between rounded-md border-2 transition-all ${border} ${bg} hover:opacity-80`}
      style={{ width: 34, height: 64, padding: '5px 3px' }}
    >
      <div className="w-6 h-4 rounded-sm bg-black/10 border border-black/10" />
      <span className={`text-[9px] font-bold leading-none ${text}`}>{seat.number}</span>
    </button>
  );
});

const SeaterSeat = memo(({ seat, marks, onSelect, isActive }) => {
  const { bg, border, text } = getSeatColor(marks, isActive);
  return (
    <button
      onClick={() => onSelect(seat)}
      title={`Seat ${seat.number}`}
      className={`relative flex flex-col items-center transition-all group hover:opacity-80`}
      style={{ width: 38, height: 46 }}
    >
      <div className={`w-6 h-3 rounded-t-lg border-t-2 border-x-2 ${border} bg-black/10`} />
      <div className={`w-9 h-8 rounded-b-xl border-2 border-t-0 flex items-center justify-center ${border} ${bg}`}>
        <span className={`text-[9px] font-bold ${text}`}>{seat.number}</span>
      </div>
    </button>
  );
});

const SleeperDeck = memo(({ deck, seats, seatMarks, onSelect, selectedIds }) => {
  const rows = Array.from(new Set(seats.filter(s => s.deck === deck).map(s => s.row)));
  return (
    <div className="flex gap-1.5">
      <div className="flex flex-col gap-1.5">
        {rows.map(row => {
          const seat = seats.find(s => s.deck === deck && s.row === row && s.col === 0);
          return seat
            ? <SleeperSeat key={seat.id} seat={seat} marks={seatMarks[seat.number]} onSelect={onSelect} isActive={selectedIds.has(seat.id)} />
            : <div key={row} style={{ width: 34, height: 64 }} />;
        })}
      </div>
      <div className="flex flex-col justify-center" style={{ width: 14 }}>
        <div className="w-px bg-slate-200 mx-auto" style={{ height: rows.length * 64 + (rows.length - 1) * 6 }} />
      </div>
      {[1, 2].map(col => (
        <div key={col} className="flex flex-col gap-1.5">
          {rows.map(row => {
            const seat = seats.find(s => s.deck === deck && s.row === row && s.col === col);
            return seat
              ? <SleeperSeat key={seat.id} seat={seat} marks={seatMarks[seat.number]} onSelect={onSelect} isActive={selectedIds.has(seat.id)} />
              : <div key={row} style={{ width: 34, height: 64 }} />;
          })}
        </div>
      ))}
    </div>
  );
});

const SeaterLayout = memo(({ seats, seatMarks, onSelect, selectedIds }) => {
  const rows = Array.from(new Set(seats.map(s => s.row)));
  return (
    <div className="space-y-2">
      {rows.map(row => {
        const rowSeats = seats.filter(s => s.row === row);
        const left = rowSeats.filter(s => s.col < 2);
        const right = rowSeats.filter(s => s.col >= 2);
        return (
          <div key={row} className="flex items-center gap-2">
            <div className="flex gap-1.5">
              {left.map(s => <SeaterSeat key={s.id} seat={s} marks={seatMarks[s.number]} onSelect={onSelect} isActive={selectedIds.has(s.id)} />)}
            </div>
            <div className="w-5 flex items-center justify-center">
              <div className="h-10 w-px bg-slate-200" />
            </div>
            <div className="flex gap-1.5">
              {right.map(s => <SeaterSeat key={s.id} seat={s} marks={seatMarks[s.number]} onSelect={onSelect} isActive={selectedIds.has(s.id)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
});

const generateSeats = (type, total) => {
  const numTotal = parseInt(total);
  if (type.includes('SLEEPER') && !type.includes('SEMI')) {
    const seats = [];
    const lower = Math.floor(numTotal / 2);
    const upper = numTotal - lower;
    const addDeck = (prefix, count, deck) => {
      let row = 0, counter = 0;
      while (counter < count) {
        for (let col = 0; col < 3 && counter < count; col++) {
          seats.push({ id: `${prefix}${row}-${col}`, row, col, deck, number: `${prefix}${counter + 1}`, type: 'sleeper' });
          counter++;
        }
        row++;
      }
    };
    addDeck('L', lower, 'lower');
    addDeck('U', upper, 'upper');
    return seats;
  } else {
    const seats = [];
    const cols = ['A', 'B', 'C', 'D'];
    const rows = Math.ceil(numTotal / 4);
    for (let i = 0; i < rows && seats.length < numTotal; i++)
      for (let j = 0; j < 4 && seats.length < numTotal; j++)
        seats.push({ id: `${i}-${j}`, row: i, col: j, number: `${i + 1}${cols[j]}`, type: type.includes('SEMI_SLEEPER') ? 'semi-sleeper' : 'seater' });
    return seats;
  }
};

const STEPS = ['Bus Info', 'Seat Layout', 'Review'];

const BusSeatLayout = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { wizardData, updateWizard } = useBusWizard();
  const [seats, setSeats] = useState([]);
  const [seatMarks, setSeatMarks] = useState(wizardData.seatMarks || {});
  const [selectedIds, setSelectedIds] = useState(new Set());

  const busType = wizardData.busType || 'SEATER';
  const totalSeats = parseInt(wizardData.totalSeats) || 40;
  const isSleeper = busType.includes('SLEEPER') && !busType.includes('SEMI');

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  useEffect(() => { setSeats(generateSeats(busType, totalSeats)); }, [busType, totalSeats]);

  useEffect(() => {
    const blockedSeats = Object.entries(seatMarks).filter(([, m]) => m.isBlocked).map(([n]) => n);
    updateWizard({ seatMarks, blockedSeats });
  }, [seatMarks]);

  const handleSelectSeat = useCallback((seat) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(seat.id) ? n.delete(seat.id) : n.add(seat.id); return n; });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const selectAll = useCallback(() => setSelectedIds(new Set(seats.map(s => s.id))), [seats]);

  const toggleFlag = useCallback((flag) => {
    if (!selectedIds.size) return;
    const nums = seats.filter(s => selectedIds.has(s.id)).map(s => s.number);
    const allOn = nums.every(n => seatMarks[n]?.[flag]);
    setSeatMarks(prev => {
      const next = { ...prev };
      nums.forEach(n => {
        const updated = { ...(next[n] || {}), [flag]: !allOn };
        Object.values(updated).some(Boolean) ? (next[n] = updated) : delete next[n];
      });
      return next;
    });
  }, [selectedIds, seats, seatMarks]);

  const clearMarksForSelected = useCallback(() => {
    const nums = seats.filter(s => selectedIds.has(s.id)).map(s => s.number);
    setSeatMarks(prev => { const n = { ...prev }; nums.forEach(num => delete n[num]); return n; });
  }, [selectedIds, seats]);

  const selectionFlags = selectedIds.size
    ? Object.fromEntries(MARK_FLAGS.map(({ key }) => [key, seats.filter(s => selectedIds.has(s.id)).every(s => seatMarks[s.number]?.[key])]))
    : {};

  const markedCount = Object.keys(seatMarks).length;

  return (
    <OperatorLayout activeItem="add-bus" title="Seat Layout">
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors flex-shrink-0">
            <span className="material-symbols-outlined text-base">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900">Configure Seat Layout</h1>
            <p className="text-xs text-slate-500 mt-0.5">{busType.replace(/_/g, ' ')} · {totalSeats} seats</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="rounded-xl bg-white border border-slate-200 px-5 py-3.5">
          <div className="flex items-center">
            {STEPS.map((label, i) => {
              const done = i === 0, active = i === 1;
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${done ? 'bg-emerald-500 text-white' : active ? 'bg-[#002046] text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {done ? <span className="material-symbols-outlined text-xs">check</span> : i + 1}
                    </div>
                    <span className={`text-xs font-semibold hidden sm:block ${done ? 'text-emerald-600' : active ? 'text-[#002046]' : 'text-slate-400'}`}>{label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className="flex-1 h-px mx-3 bg-slate-200" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Two-column: seat layout + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,560px)_1fr] gap-5 items-start">

        {/* LEFT: Seat layout card */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">

          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#002046] text-base">airline_seat_recline_normal</span>
              <span className="text-sm font-black text-slate-800">Seat Map</span>
            </div>
            <div className="flex items-center gap-3">
              {markedCount > 0 && (
                <span className="text-[10px] font-bold text-[#002046] bg-[#002046]/8 px-2 py-0.5 rounded-full">{markedCount} marked</span>
              )}
              <span className="text-xs text-slate-400">{seats.length} seats</span>
            </div>
          </div>

          {/* Selection toolbar */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100">
            <span className="text-xs text-slate-400">
              {selectedIds.size > 0
                ? <span className="font-semibold text-[#002046]">{selectedIds.size} selected</span>
                : 'Click seats to select'}
            </span>
            <div className="flex items-center gap-3">
              <button onClick={selectAll} className="text-xs font-semibold text-slate-500 hover:text-[#002046] transition-colors">Select All</button>
              {selectedIds.size > 0 && (
                <button onClick={clearSelection} className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors">Clear</button>
              )}
            </div>
          </div>

          {/* Bus shell */}
          <div className="p-5">
            {/* Driver cabin */}
            <div className="flex justify-end mb-3 pr-2">
              <div className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1">
                <span className="material-symbols-outlined text-slate-400 text-sm">airline_seat_recline_extra</span>
                <span className="text-[10px] font-semibold text-slate-400">Driver</span>
              </div>
            </div>

            {/* Seat grid */}
            <div className="border border-slate-200 rounded-2xl bg-slate-50/50 p-4 flex justify-center overflow-x-auto">
              {isSleeper ? (
                <div className="inline-flex gap-10">
                  {['lower', 'upper'].map(deck => (
                    <div key={deck}>
                      <div className="flex items-center gap-1.5 mb-3 justify-center">
                        <span className={`w-2 h-2 rounded-full ${deck === 'lower' ? 'bg-[#002046]' : 'bg-slate-400'}`} />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 capitalize">{deck} Deck</p>
                      </div>
                      <SleeperDeck deck={deck} seats={seats} seatMarks={seatMarks} onSelect={handleSelectSeat} selectedIds={selectedIds} />
                    </div>
                  ))}
                </div>
              ) : (
                <SeaterLayout seats={seats} seatMarks={seatMarks} onSelect={handleSelectSeat} selectedIds={selectedIds} />
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
            <button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)}
              className="px-5 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-colors">
              Back
            </button>
            <div className="flex items-center gap-2.5">
              <button onClick={() => setSelectedIds(new Set())}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-colors flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">save</span>
                Save
              </button>
              <button onClick={() => navigate(ROUTES.OPERATOR_BUS_REVIEW)}
                className="px-6 py-2 rounded-lg bg-[#002046] text-white font-bold text-sm flex items-center gap-2 hover:bg-[#003a80] transition-colors shadow-sm">
                Save & Continue
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="hidden lg:block">
          <div className="flex flex-col gap-4 sticky top-6">

            {/* Top row: Registration Steps + Tips */}
            <div className="grid grid-cols-2 gap-4 items-start">

              {/* Registration Steps */}
              <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registration Steps</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {[
                    { step: 1, label: 'Bus Info',    desc: 'Name, code, type & amenities', icon: 'directions_bus', state: 'done'   },
                    { step: 2, label: 'Seat Layout', desc: 'Configure rows & seat grid',   icon: 'grid_view',      state: 'active' },
                    { step: 3, label: 'Review',      desc: 'Confirm and submit your bus',  icon: 'fact_check',     state: 'todo'   },
                  ].map(({ step, label, desc, icon, state }) => (
                    <div key={step} className={`flex items-start gap-2.5 px-4 py-3 ${state === 'active' ? 'bg-[#002046]/[0.02]' : state === 'todo' ? 'opacity-40' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black ${
                        state === 'done' ? 'bg-emerald-500 text-white' : state === 'active' ? 'bg-[#002046] text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {state === 'done' ? <span className="material-symbols-outlined text-xs">check</span> : step}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-[11px] font-bold ${state === 'active' ? 'text-[#002046]' : state === 'done' ? 'text-emerald-600' : 'text-slate-500'}`}>{label}</p>
                          {state === 'active' && <span className="text-[9px] font-bold text-[#002046] bg-[#002046]/10 px-1.5 py-0.5 rounded-full">Now</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 text-sm flex-shrink-0">{icon}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-4 text-white shadow-sm relative overflow-hidden">
                <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
                <p className="text-[9px] font-semibold opacity-60 uppercase tracking-wider mb-3">Seat Tips</p>
                <div className="space-y-3">
                  {[
                    'Click any seat to select it, then apply a mark.',
                    'Use Select All to mark multiple seats at once.',
                    'Blocked seats are hidden from passengers during booking.',
                  ].map(tip => (
                    <div key={tip} className="flex items-start gap-2">
                      <span className="text-white/40 text-xs mt-0.5 flex-shrink-0">•</span>
                      <p className="text-[11px] text-white/70 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Seat Controls: legend + mark panel */}
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seat Controls</p>
              </div>

              {/* Legend */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 mb-2.5">Legend</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    { color: 'bg-white border-slate-300',       label: 'Available'   },
                    { color: 'bg-[#002046] border-[#002046]',   label: 'Selected'    },
                    { color: 'bg-pink-100 border-pink-400',     label: 'Ladies Only' },
                    { color: 'bg-blue-100 border-blue-400',     label: 'Window'      },
                    { color: 'bg-teal-100 border-teal-400',     label: 'Aisle'       },
                    { color: 'bg-slate-200 border-slate-400',   label: 'Blocked'     },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 ${color}`} />
                      <span className="text-[10px] text-slate-500 font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mark panel */}
              <div className="px-4 py-3">
                {selectedIds.size > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-slate-400 mb-2">
                      Mark {selectedIds.size} seat{selectedIds.size > 1 ? 's' : ''} as
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {MARK_FLAGS.map(({ key, label, icon, light, off }) => (
                        <button
                          key={key}
                          onClick={() => toggleFlag(key)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${selectionFlags[key] ? light : off}`}
                        >
                          <span className="material-symbols-outlined text-xs">{icon}</span>
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={clearMarksForSelected}
                      className="w-full text-[11px] text-rose-400 hover:text-rose-600 font-semibold transition-colors pt-1"
                    >
                      Clear marks
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 text-center py-1">Select seats above to mark them</p>
                )}
              </div>
            </div>

          </div>
        </div>

        </div>{/* end grid */}
      </div>
    </OperatorLayout>
  );
};

export default BusSeatLayout;
