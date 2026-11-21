import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { useBusWizard } from '../context/BusWizardContext';
import { ROUTES } from '../../../shared/constants/routes';
import { Card, EmptyState } from '../../../shared/components/console/ConsoleUI';
import BusWizardHeader from '../components/BusWizardHeader';
import { prettyType } from '../utils/operatorFormat';

const MARKS = [
  { key: 'isLadiesOnly', label: 'Women only', icon: 'woman', on: 'bg-pink-50 border-pink-400 text-pink-700' },
  { key: 'isWindow', label: 'Window', icon: 'window', on: 'bg-sky-50 border-sky-400 text-sky-700' },
  { key: 'isAisle', label: 'Aisle', icon: 'swap_horiz', on: 'bg-teal-50 border-teal-400 text-teal-700' },
  { key: 'isBlocked', label: 'Not for sale', icon: 'block', on: 'bg-slate-100 border-slate-400 text-slate-700' },
];

const seatStyle = (marks, selected) => {
  if (selected) return 'bg-primary border-primary text-white';
  if (marks?.isBlocked) return 'bg-slate-200 border-slate-300 text-slate-400';
  if (marks?.isLadiesOnly) return 'bg-white border-pink-500 text-pink-600';
  if (marks?.isWindow) return 'bg-white border-sky-500 text-sky-700';
  if (marks?.isAisle) return 'bg-white border-teal-500 text-teal-700';
  return 'bg-white border-slate-300 text-slate-600 hover:border-[#FF8A65]';
};

/**
 * Must match the backend BusLayoutService exactly so marks land on the same seat numbers:
 * sleepers — lower deck gets half (rounded down), 3 per row; seaters — 2 + 2 rows "1A…1D".
 */
const generateSeats = (type, total) => {
  const n = parseInt(total, 10);
  const seats = [];
  if (type.includes('SLEEPER') && !type.includes('SEMI')) {
    const lower = Math.floor(n / 2);
    [['L', 'lower', lower], ['U', 'upper', n - lower]].forEach(([prefix, deck, count]) => {
      for (let i = 0; i < count; i++) seats.push({ id: `${prefix}${i + 1}`, number: `${prefix}${i + 1}`, deck, row: Math.floor(i / 3), col: i % 3, berth: true });
    });
  } else {
    const cols = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < n; i++) seats.push({ id: `${Math.floor(i / 4) + 1}${cols[i % 4]}`, number: `${Math.floor(i / 4) + 1}${cols[i % 4]}`, deck: 'lower', row: Math.floor(i / 4), col: i % 4, berth: false });
  }
  return seats;
};

const Seat = ({ seat, marks, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(seat.id)}
    aria-pressed={selected}
    aria-label={`${seat.berth ? 'Berth' : 'Seat'} ${seat.number}${marks ? `, ${MARKS.filter((m) => marks[m.key]).map((m) => m.label).join(', ')}` : ''}`}
    className={`relative flex items-end justify-center rounded-lg border-2 pb-1 text-[10px] font-bold transition-colors ${seatStyle(marks, selected)}`}
    style={{ width: 40, height: seat.berth ? 72 : 40 }}
  >
    {seat.number}
    {marks?.isLadiesOnly && !selected && <span className="absolute top-1 text-[11px]" aria-hidden="true">♀</span>}
    {marks?.isBlocked && !selected && <span className="material-symbols-outlined absolute top-1 text-[13px]" aria-hidden="true">block</span>}
  </button>
);

const Deck = ({ title, seats, marks, selectedIds, onSelect, showWheel }) => {
  const rows = Math.max(...seats.map((s) => s.row)) + 1;
  const cols = Math.max(...seats.map((s) => s.col)) + 1;
  const aisleAfter = cols >= 4 ? 1 : 0;
  const byPos = new Map(seats.map((s) => [`${s.row}:${s.col}`, s]));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-6 border-b border-dashed border-slate-200 pb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
        {showWheel ? <span className="material-symbols-outlined text-slate-400" aria-label="Driver">trip_origin</span> : <span className="w-6" />}
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex">
            {Array.from({ length: cols }, (_, c) => {
              const s = byPos.get(`${r}:${c}`);
              return (
                <div key={c} className="flex">
                  <div className="p-0.5">{s ? <Seat seat={s} marks={marks[s.number]} selected={selectedIds.has(s.id)} onSelect={onSelect} /> : <div style={{ width: 40 }} />}</div>
                  {c === aisleAfter && <div className="w-6" aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const BusSeatLayout = () => {
  const navigate = useNavigate();
  const { wizardData, updateWizard } = useBusWizard();
  const [seatMarks, setSeatMarks] = useState(wizardData.seatMarks || {});
  const [selectedIds, setSelectedIds] = useState(new Set());

  const busType = wizardData.busType || '';
  const totalSeats = parseInt(wizardData.totalSeats, 10) || 0;
  const seats = useMemo(() => (busType && totalSeats ? generateSeats(busType, totalSeats) : []), [busType, totalSeats]);
  const sleeper = seats.some((s) => s.berth);

  useEffect(() => {
    const blockedSeats = Object.entries(seatMarks).filter(([, m]) => m.isBlocked).map(([n]) => n);
    updateWizard({ seatMarks, blockedSeats });
  }, [seatMarks]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = useCallback((id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);

  const selectedNumbers = seats.filter((s) => selectedIds.has(s.id)).map((s) => s.number);
  const allHave = (key) => selectedNumbers.length > 0 && selectedNumbers.every((n) => seatMarks[n]?.[key]);

  const toggleMark = (key) => {
    if (!selectedNumbers.length) return;
    const on = !allHave(key);
    setSeatMarks((prev) => {
      const next = { ...prev };
      selectedNumbers.forEach((n) => {
        const updated = { ...(next[n] || {}), [key]: on };
        if (Object.values(updated).some(Boolean)) next[n] = updated; else delete next[n];
      });
      return next;
    });
  };

  const clearMarks = () => setSeatMarks((prev) => {
    const next = { ...prev };
    selectedNumbers.forEach((n) => delete next[n]);
    return next;
  });

  const counts = Object.fromEntries(MARKS.map((m) => [m.key, Object.values(seatMarks).filter((x) => x[m.key]).length]));
  const forSale = totalSeats - counts.isBlocked;

  if (!seats.length) {
    return (
      <OperatorLayout activeItem="add-bus" title="Seat layout">
        <Card>
          <EmptyState icon="directions_bus" title="Start with the bus details" subtitle="The seat layout depends on the bus type and number of seats."
            action={<button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">Go to bus details</button>} />
        </Card>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout activeItem="add-bus" title="Seat layout">
      <div className="space-y-5">
        <BusWizardHeader step={1} title="Seat layout" subtitle={`${prettyType(busType)} · ${totalSeats} ${sleeper ? 'berths' : 'seats'}. Tap seats, then choose how to mark them.`} onBack={() => navigate(ROUTES.OPERATOR_ADD_BUS)} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <Card>
            {/* Mark toolbar — always visible, including on phones */}
            <div className="sticky top-0 z-10 rounded-t-2xl border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-sm font-bold text-slate-700">
                  {selectedIds.size ? `${selectedIds.size} selected` : 'Tap seats to select'}
                </span>
                {MARKS.map((m) => (
                  <button key={m.key} type="button" onClick={() => toggleMark(m.key)} disabled={!selectedIds.size} aria-pressed={allHave(m.key)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40 ${allHave(m.key) ? m.on : 'border-slate-200 text-slate-600 hover:border-[#FF8A65]'}`}>
                    <span className="material-symbols-outlined text-[15px]">{m.icon}</span>{m.label}
                  </button>
                ))}
                <span className="ml-auto flex items-center gap-3 text-xs font-bold">
                  {selectedIds.size > 0 && <button onClick={clearMarks} className="text-red-600 hover:underline">Clear marks</button>}
                  <button onClick={() => setSelectedIds(selectedIds.size === seats.length ? new Set() : new Set(seats.map((s) => s.id)))} className="text-primary hover:text-[#FF8A65]">
                    {selectedIds.size === seats.length ? 'Select none' : 'Select all'}
                  </button>
                </span>
              </div>
            </div>
            <div className="overflow-x-auto p-5">
              <div className="mx-auto flex w-max flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
                <Deck title={sleeper ? 'Lower deck' : 'Seats'} seats={seats.filter((s) => s.deck === 'lower')} marks={seatMarks} selectedIds={selectedIds} onSelect={toggleSelect} showWheel />
                {sleeper && <Deck title="Upper deck" seats={seats.filter((s) => s.deck === 'upper')} marks={seatMarks} selectedIds={selectedIds} onSelect={toggleSelect} />}
              </div>
            </div>
            <div className="flex justify-between gap-2 border-t border-slate-100 px-5 py-4">
              <button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Back</button>
              <button onClick={() => navigate(ROUTES.OPERATOR_BUS_REVIEW)} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C]">
                Next: review<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </Card>

          <aside className="space-y-4 lg:sticky lg:top-4">
            <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Summary</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{forSale} <span className="text-sm font-semibold text-slate-500">{sleeper ? 'berths' : 'seats'} for sale</span></p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {MARKS.map((m) => (
                  <li key={m.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600"><span className="material-symbols-outlined text-[16px] text-slate-400">{m.icon}</span>{m.label}</span>
                    <span className="font-bold text-slate-900 tabular-nums">{counts[m.key]}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl bg-[#FFF7F2] border border-[#FDBA74]/40 p-5 text-xs text-slate-600">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-900"><span className="material-symbols-outlined text-[18px] text-orange-600">lightbulb</span>Tips</p>
              <ul className="space-y-1.5">
                <li><b>Women only</b> seats can only be booked by female travellers.</li>
                <li><b>Not for sale</b> seats (crew, damaged) are never offered to travellers.</li>
                <li>Window and aisle marks help travellers choose — optional.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default BusSeatLayout;
