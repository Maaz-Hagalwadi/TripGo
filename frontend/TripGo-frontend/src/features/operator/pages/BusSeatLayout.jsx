import { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { useBusWizard } from '../context/BusWizardContext';
import { ROUTES } from '../../../shared/constants/routes';
import './OperatorDashboard.css';

const MARK_FLAGS = [
  { key: 'isLadiesOnly', label: 'Ladies Only', icon: 'female', color: 'text-pink-500 border-pink-400 bg-pink-50 dark:bg-pink-900/20' },
  { key: 'isWindow',     label: 'Window',      icon: 'window', color: 'text-blue-500 border-blue-400 bg-blue-50 dark:bg-blue-900/20' },
  { key: 'isAisle',      label: 'Aisle',       icon: 'swap_horiz', color: 'text-green-500 border-green-400 bg-green-50 dark:bg-green-900/20' },
  { key: 'isBlocked',    label: 'Blocked',     icon: 'block', color: 'text-red-500 border-red-400 bg-red-50 dark:bg-red-900/20' },
];

const FLAG_DOTS = [
  { key: 'isLadiesOnly', dot: 'bg-pink-500' },
  { key: 'isWindow',     dot: 'bg-blue-500' },
  { key: 'isAisle',      dot: 'bg-green-500' },
  { key: 'isBlocked',    dot: 'bg-red-500' },
];

const getSeatBorder = (marks, isActive) => {
  if (isActive) return 'border-primary';
  if (!marks) return 'border-slate-400 dark:border-slate-500';
  if (marks.isBlocked)    return 'border-red-500';
  if (marks.isLadiesOnly) return 'border-pink-500';
  if (marks.isWindow)     return 'border-blue-500';
  if (marks.isAisle)      return 'border-green-500';
  return 'border-slate-400 dark:border-slate-500';
};

const MarkDots = ({ marks }) => {
  if (!marks) return null;
  const active = FLAG_DOTS.filter(f => marks[f.key]);
  if (!active.length) return null;
  return (
    <div className="absolute -top-1 -right-1 flex gap-0.5">
      {active.map(f => <span key={f.key} className={`w-2 h-2 rounded-full ${f.dot} ring-1 ring-white dark:ring-slate-800`} />)}
    </div>
  );
};

const SeaterSeat = memo(({ seat, marks, onSelect, isActive }) => {
  const border = getSeatBorder(marks, isActive);
  const bg = isActive ? 'bg-primary/10' : (marks ? 'bg-white dark:bg-slate-700' : 'bg-white dark:bg-slate-700');
  return (
    <button onClick={() => onSelect(seat)} title={`Seat ${seat.number}`}
      className="relative flex flex-col items-center transition-all group" style={{ width: 36, height: 44 }}>
      <MarkDots marks={marks} />
      <div className={`w-6 h-2.5 rounded-t-md border-t-2 border-x-2 ${border} ${isActive ? 'bg-primary/30' : 'bg-slate-200 dark:bg-slate-600 group-hover:bg-slate-300'}`} />
      <div className={`w-8 h-7 rounded-b-lg border-2 border-t-0 flex items-end justify-center pb-0.5 ${border} ${bg} group-hover:border-primary`}>
        <span className={`text-[9px] font-bold ${isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-300'}`}>{seat.number}</span>
      </div>
    </button>
  );
});

const SleeperSeat = memo(({ seat, marks, onSelect, isActive }) => {
  const border = getSeatBorder(marks, isActive);
  return (
    <button onClick={() => onSelect(seat)} title={`Berth ${seat.number}`}
      className={`relative flex flex-col items-center justify-between rounded border-2 transition-all group ${border} ${isActive ? 'bg-primary/10' : 'bg-white dark:bg-slate-700 hover:border-primary'}`}
      style={{ width: 30, height: 58, padding: '4px 2px' }}>
      <MarkDots marks={marks} />
      <div className={`w-5 h-4 rounded-sm border border-slate-300 dark:border-slate-500 bg-slate-100 dark:bg-slate-600`} />
      <span className={`text-[8px] font-bold leading-none ${isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-300'}`}>{seat.number}</span>
    </button>
  );
});

const SleeperDeck = memo(({ deck, seats, seatMarks, onSelect, selectedIds }) => {
  const rows = Array.from(new Set(seats.filter(s => s.deck === deck).map(s => s.row)));
  return (
    <div className="flex gap-1">
      <div className="flex flex-col gap-1">
        {rows.map(row => {
          const seat = seats.find(s => s.deck === deck && s.row === row && s.col === 0);
          return seat ? <SleeperSeat key={seat.id} seat={seat} marks={seatMarks[seat.number]} onSelect={onSelect} isActive={selectedIds.has(seat.id)} /> : <div key={row} style={{ width: 30, height: 58 }} />;
        })}
      </div>
      <div className="flex flex-col justify-center" style={{ width: 16 }}>
        <div className="w-px bg-slate-300 dark:bg-slate-600" style={{ height: rows.length * 58 + (rows.length - 1) * 4 }} />
      </div>
      {[1, 2].map(col => (
        <div key={col} className="flex flex-col gap-1">
          {rows.map(row => {
            const seat = seats.find(s => s.deck === deck && s.row === row && s.col === col);
            return seat ? <SleeperSeat key={seat.id} seat={seat} marks={seatMarks[seat.number]} onSelect={onSelect} isActive={selectedIds.has(seat.id)} /> : <div key={row} style={{ width: 30, height: 58 }} />;
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
          <div key={row} className="flex items-center gap-1">
            <div className="flex gap-1">
              {left.map(seat => <SeaterSeat key={seat.id} seat={seat} marks={seatMarks[seat.number]} onSelect={onSelect} isActive={selectedIds.has(seat.id)} />)}
            </div>
            <div className="w-6 flex items-center justify-center">
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />
            </div>
            <div className="flex gap-1">
              {right.map(seat => <SeaterSeat key={seat.id} seat={seat} marks={seatMarks[seat.number]} onSelect={onSelect} isActive={selectedIds.has(seat.id)} />)}
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
    const generatedSeats = [];
    const lowerDeckSeats = Math.floor(numTotal / 2);
    const upperDeckSeats = numTotal - lowerDeckSeats;
    const addDeck = (prefix, count, deck) => {
      let row = 0, counter = 0;
      while (counter < count) {
        for (let col = 0; col < 3 && counter < count; col++) {
          generatedSeats.push({ id: `${prefix}${row}-${col}`, row, col, deck, number: `${prefix}${counter + 1}`, type: 'sleeper' });
          counter++;
        }
        row++;
      }
    };
    addDeck('L', lowerDeckSeats, 'lower');
    addDeck('U', upperDeckSeats, 'upper');
    return generatedSeats;
  } else {
    const generatedSeats = [];
    const cols = ['A', 'B', 'C', 'D'];
    const rows = Math.ceil(numTotal / 4);
    for (let i = 0; i < rows && generatedSeats.length < numTotal; i++) {
      for (let j = 0; j < 4 && generatedSeats.length < numTotal; j++) {
        const seatNumber = `${i + 1}${cols[j]}`;
        generatedSeats.push({ id: `${i}-${j}`, row: i, col: j, number: seatNumber, type: type.includes('SEMI_SLEEPER') ? 'semi-sleeper' : 'seater' });
      }
    }
    return generatedSeats;
  }
};

const BusSeatLayout = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { wizardData, updateWizard } = useBusWizard();
  const [seats, setSeats] = useState([]);
  const [seatMarks, setSeatMarks] = useState(wizardData.seatMarks || {});
  const [selectedIds, setSelectedIds] = useState(new Set());

  const busType = wizardData.busType || 'SEATER';
  const totalSeats = parseInt(wizardData.totalSeats) || 40;

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  useEffect(() => {
    setSeats(generateSeats(busType, totalSeats));
  }, [busType, totalSeats]);

  // Auto-save marks to wizard whenever they change
  useEffect(() => {
    const blockedSeats = Object.entries(seatMarks)
      .filter(([, m]) => m.isBlocked)
      .map(([num]) => num);
    updateWizard({ seatMarks, blockedSeats });
  }, [seatMarks]);

  const handleSelectSeat = useCallback((seat) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(seat.id) ? next.delete(seat.id) : next.add(seat.id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(seats.map(s => s.id)));
  }, [seats]);

  // Apply a flag toggle to ALL selected seats — do NOT clear selection so user can stack multiple marks
  const toggleFlag = useCallback((flag) => {
    if (!selectedIds.size) return;
    const selectedNumbers = seats.filter(s => selectedIds.has(s.id)).map(s => s.number);
    const allOn = selectedNumbers.every(num => seatMarks[num]?.[flag]);
    setSeatMarks(prev => {
      const next = { ...prev };
      selectedNumbers.forEach(num => {
        const current = next[num] || {};
        const updated = { ...current, [flag]: !allOn };
        const hasAny = Object.values(updated).some(Boolean);
        if (!hasAny) { delete next[num]; } else { next[num] = updated; }
      });
      return next;
    });
  }, [selectedIds, seats, seatMarks]);

  const clearMarksForSelected = useCallback(() => {
    const selectedNumbers = seats.filter(s => selectedIds.has(s.id)).map(s => s.number);
    setSeatMarks(prev => {
      const next = { ...prev };
      selectedNumbers.forEach(num => delete next[num]);
      return next;
    });
  }, [selectedIds, seats]);

  const handleContinue = useCallback(() => {
    navigate(ROUTES.OPERATOR_BUS_REVIEW);
  }, [navigate]);

  const isSleeper = busType.includes('SLEEPER') && !busType.includes('SEMI');
  const markedCount = Object.keys(seatMarks).length;

  // For the mark panel: show mixed state per flag across selection
  const selectionFlags = selectedIds.size
    ? Object.fromEntries(MARK_FLAGS.map(({ key }) => [
        key,
        seats.filter(s => selectedIds.has(s.id)).every(s => seatMarks[s.number]?.[key])
      ]))
    : {};

  return (
    <OperatorLayout activeItem="add-bus" title="Seat Layout">
      <div className="max-w-2xl mx-auto">
        <header className="mb-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className="hover:text-primary transition-colors">Add Bus</button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-200 dark:text-slate-100 font-medium">Seat Layout</span>
          </div>
          <h2 className="text-2xl font-extrabold">Configure Seat Layout</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">Bus Type: {busType.replace(/_/g, ' ')}</p>
        </header>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
            <div className="absolute top-1/2 left-0 w-2/3 h-0.5 bg-primary -translate-y-1/2 z-0"></div>
            {[{ label: 'Bus Info', done: true }, { label: 'Layout', active: true }, { label: 'Review' }].map(({ label, done, active }, i) => (
              <div key={label} className="relative z-10 flex flex-col items-center">
                <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-white dark:ring-op-bg ${done || active ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-op-card border-2 border-slate-300 dark:border-slate-700 text-slate-500'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${done || active ? 'text-primary' : 'text-slate-500'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-op-card rounded-xl shadow border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-lg">airline_seat_recline_normal</span>
              <h3 className="text-sm font-bold">Seat Configuration</h3>
              <span className="ml-auto text-xs text-slate-500">Total: {seats.length} seats</span>
              {markedCount > 0 && <span className="text-xs text-primary font-semibold">{markedCount} marked</span>}
            </div>

            {/* Selection toolbar */}
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs text-slate-400 flex-1">
                {selectedIds.size > 0 ? <span className="text-primary font-semibold">{selectedIds.size} seat{selectedIds.size > 1 ? 's' : ''} selected</span> : 'Click seats to select, then apply marks below.'}
              </p>
              <button onClick={selectAll} className="text-xs text-slate-500 hover:text-primary transition-colors">Select All</button>
              {selectedIds.size > 0 && <button onClick={clearSelection} className="text-xs text-slate-500 hover:text-red-500 transition-colors">Deselect All</button>}
            </div>

            {isSleeper ? (
              <div className="bg-slate-50 dark:bg-black/40 rounded-xl p-3 flex justify-center">
                <div className="inline-flex gap-6">
                  {['lower', 'upper'].map(deck => (
                    <div key={deck}>
                      {deck === 'upper' ? (
                        <div className="flex justify-center mb-2">
                          <svg viewBox="0 0 24 24" className="w-6 h-6 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                            <line x1="12" y1="2" x2="12" y2="9"/><line x1="4.2" y1="16.5" x2="10.2" y2="13.5"/><line x1="19.8" y1="16.5" x2="13.8" y2="13.5"/>
                          </svg>
                        </div>
                      ) : <div className="mb-2" style={{ height: 24 }} />}
                      <h4 className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">{deck} Deck</h4>
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800">
                        <SleeperDeck deck={deck} seats={seats} seatMarks={seatMarks} onSelect={handleSelectSeat} selectedIds={selectedIds} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-black/40 rounded-xl p-3 flex justify-center">
                <div className="inline-block">
                  <div className="flex justify-end mb-2 pr-6">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                      <line x1="12" y1="2" x2="12" y2="9"/><line x1="4.2" y1="16.5" x2="10.2" y2="13.5"/><line x1="19.8" y1="16.5" x2="13.8" y2="13.5"/>
                    </svg>
                  </div>
                  <SeaterLayout seats={seats} seatMarks={seatMarks} onSelect={handleSelectSeat} selectedIds={selectedIds} />
                </div>
              </div>
            )}

            {/* Mark Panel */}
            <div className={`mt-4 rounded-xl border transition-all ${selectedIds.size ? 'border-primary/30 bg-primary/5 dark:bg-primary/10 p-4' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 p-3'}`}>
              {selectedIds.size ? (
                <>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Apply marks to <span className="text-primary">{selectedIds.size} seat{selectedIds.size > 1 ? 's' : ''}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {MARK_FLAGS.map(({ key, label, icon, color }) => (
                      <button key={key} onClick={() => toggleFlag(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${selectionFlags[key] ? color : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'}`}>
                        <span className="material-symbols-outlined text-sm">{icon}</span>
                        {label}
                        {selectionFlags[key] && <span className="material-symbols-outlined text-xs">check</span>}
                      </button>
                    ))}
                    <button onClick={clearMarksForSelected}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-400 hover:text-red-500 hover:border-red-300 transition-all">
                      <span className="material-symbols-outlined text-sm">close</span>
                      Clear Marks
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 text-center">Select one or more seats above to mark them</p>
              )}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {FLAG_DOTS.map(({ key, dot }) => {
                const label = MARK_FLAGS.find(f => f.key === key).label;
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                    <span className="text-slate-500">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-black/30 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className="px-6 py-2.5 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-colors">
              Back
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedIds(new Set())}
                className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">save</span>
                Save
              </button>
              <button onClick={handleContinue} className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
                Save & Continue
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default BusSeatLayout;
