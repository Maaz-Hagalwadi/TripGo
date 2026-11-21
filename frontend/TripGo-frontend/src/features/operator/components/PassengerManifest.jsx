import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getScheduleBookings } from '../../../api/operatorBookingService';
import { EmptyState, SkeletonRows, StatusPill } from '../../../shared/components/console/ConsoleUI';
import { bookingTravellers, clockLabel, isoToIst, passengerName } from '../utils/operatorFormat';
import { INPUT, LABEL, sortPoints, toList } from '../utils/routeForms';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const NOT_CHOSEN = 'Boarding point not recorded';

/** One row per seat of every confirmed booking, grouped by where the traveller boards, in route order. */
const buildGroups = (bookings, departureHm) => {
  const rows = bookings.flatMap((b) => bookingTravellers(b).map((p) => ({
    seat: p.seatNumber, name: passengerName(p) || 'Traveller', gender: p.gender, age: p.age,
    phone: p.phone || b.contactPhone, drop: b.droppingPoint || p.toStop, dropTime: b.droppingTime,
    from: p.fromStop, code: b.bookingCode, board: b.boardingPoint, boardTime: b.boardingTime,
  })));
  const byPoint = {};
  rows.forEach((r) => { const k = r.board || NOT_CHOSEN; (byPoint[k] = byPoint[k] || { name: k, arrivalTime: r.boardTime || '', rows: [] }).rows.push(r); });
  const groups = sortPoints(Object.values(byPoint).filter((g) => g.name !== NOT_CHOSEN), departureHm);
  if (byPoint[NOT_CHOSEN]) groups.push(byPoint[NOT_CHOSEN]);
  groups.forEach((g) => g.rows.sort((a, b) => String(a.seat).localeCompare(String(b.seat), undefined, { numeric: true })));
  return { groups, total: rows.length };
};

const PassengerManifest = ({ schedule, route, onClose }) => {
  const runDate = isoToIst(schedule.departureTime).date;
  const depHm = isoToIst(schedule.departureTime).time;
  const recurring = schedule.frequency && schedule.frequency !== 'ONCE';
  const [date, setDate] = useState(runDate);
  const [state, setState] = useState({ loading: true, bookings: [] });

  useEffect(() => {
    let alive = true;
    getScheduleBookings(schedule.id, recurring ? date : undefined)
      .then((d) => { if (alive) setState({ loading: false, bookings: toList(d) }); })
      .catch((e) => { if (alive) { setState({ loading: false, bookings: [] }); toast.error(e.message || 'Couldn’t load passengers'); } });
    return () => { alive = false; };
  }, [schedule.id, date, recurring]);

  const confirmed = state.bookings.filter((b) => String(b.status).toUpperCase() === 'CONFIRMED');
  const cancelled = state.bookings.filter((b) => String(b.status).toUpperCase() === 'CANCELLED').length;
  const { groups, total } = buildGroups(confirmed, depHm);
  const dateLabel = new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const title = `${route.origin} → ${route.destination} · ${dateLabel} · ${clockLabel(depHm)}`;
  const busLine = [schedule.bus?.name, schedule.bus?.vehicleNumber, schedule.driverName && `Driver: ${schedule.driverName.trim()}`].filter(Boolean).join(' · ');

  const download = () => {
    const header = ['Boarding point', 'Boarding time', 'Seat', 'Passenger', 'Gender', 'Age', 'Phone', 'Dropping point', 'Booking'];
    const lines = groups.flatMap((g) => g.rows.map((r) => [g.name, clockLabel(String(g.arrivalTime).slice(0, 5)), r.seat, r.name, r.gender, r.age, r.phone, r.drop, r.code].map(csvCell).join(',')));
    const url = URL.createObjectURL(new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `passengers-${route.origin}-${route.destination}-${date}.csv`.replace(/\s+/g, '-');
    a.click();
    URL.revokeObjectURL(url);
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) { toast.error('Allow pop-ups to print the passenger list'); return; }
    const body = groups.map((g) => `
      <h2>${esc(g.name)}${g.arrivalTime ? ` · ${esc(clockLabel(String(g.arrivalTime).slice(0, 5)))}` : ''} <small>(${g.rows.length})</small></h2>
      <table><thead><tr><th>✓</th><th>Seat</th><th>Passenger</th><th>Gender / age</th><th>Phone</th><th>Gets off</th><th>Booking</th></tr></thead><tbody>
      ${g.rows.map((r) => `<tr><td class="box"></td><td><b>${esc(r.seat)}</b></td><td>${esc(r.name)}</td><td>${esc([r.gender, r.age].filter(Boolean).join(' · '))}</td><td>${esc(r.phone)}</td><td>${esc(r.drop)}</td><td>${esc(r.code)}</td></tr>`).join('')}
      </tbody></table>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Passenger list</title><style>
      body{font:13px system-ui,sans-serif;color:#0B1F3A;margin:24px} h1{font-size:18px;margin:0} p{margin:4px 0 16px;color:#475569}
      h2{font-size:14px;margin:18px 0 6px} small{color:#64748b;font-weight:normal} table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left} th{background:#f1f5f9;font-size:11px} td.box{width:18px}
    </style></head><body><h1>${esc(title)}</h1><p>${esc(busLine)} · ${total} passenger${total !== 1 ? 's' : ''}</p>${body || '<p>No passengers booked.</p>'}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Passenger list"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-900">Passenger list</h2>
            <p className="text-sm text-slate-500 truncate">{busLine}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex-shrink-0 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">close</span></button>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-6 py-3">
          {recurring ? (
            <div>
              <label className={LABEL} htmlFor="manifest-date">Travel date</label>
              <input id="manifest-date" type="date" min={runDate} value={date} onChange={(e) => { if (e.target.value) { setState((s) => ({ ...s, loading: true })); setDate(e.target.value); } }} className={`${INPUT.replace('w-full', '')} w-44 py-2`} />
            </div>
          ) : <p className="text-sm font-bold text-slate-700">{dateLabel}</p>}
          <p className="text-sm text-slate-600">
            <span className="font-black text-slate-900">{state.loading ? '…' : total}</span> passenger{total !== 1 ? 's' : ''} · {confirmed.length} booking{confirmed.length !== 1 ? 's' : ''}
            {cancelled > 0 && <span className="text-slate-400"> · {cancelled} cancelled</span>}
          </p>
          <span className="ml-auto flex gap-2">
            <button onClick={download} disabled={!total} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><span className="material-symbols-outlined text-[16px]">download</span>CSV</button>
            <button onClick={print} disabled={!total} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><span className="material-symbols-outlined text-[16px]">print</span>Print for driver</button>
          </span>
        </div>

        <div className="overflow-y-auto">
          {state.loading ? <SkeletonRows rows={4} /> : total === 0 ? (
            <EmptyState icon="group" title="No passengers yet" subtitle={`Nobody has booked the ${dateLabel} departure.`} />
          ) : groups.map((g) => (
            <section key={g.name}>
              <h3 className="sticky top-0 flex items-center gap-2 bg-slate-50 px-6 py-2 text-xs font-black text-slate-700">
                <span className="material-symbols-outlined text-[16px] text-green-600">login</span>
                {g.name}{g.arrivalTime && <span className="text-slate-500">· {clockLabel(String(g.arrivalTime).slice(0, 5))}</span>}
                <span className="ml-auto text-slate-400">{g.rows.length}</span>
              </h3>
              <ul className="divide-y divide-slate-100">
                {g.rows.map((r, i) => (
                  <li key={`${r.code}-${r.seat}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 text-sm">
                    <span className="w-12 rounded-lg bg-primary/5 py-1 text-center font-black text-primary">{r.seat}</span>
                    <span className="min-w-[140px] flex-1">
                      <span className="block font-bold text-slate-900">{r.name}</span>
                      <span className="block text-xs text-slate-500">{[r.gender && String(r.gender).charAt(0) + String(r.gender).slice(1).toLowerCase(), r.age && `${r.age} yrs`].filter(Boolean).join(' · ')}</span>
                    </span>
                    {r.phone ? <a href={`tel:${r.phone}`} className="font-semibold text-primary hover:underline">{r.phone}</a> : <span className="text-slate-400">No phone</span>}
                    <span className="text-slate-600">Off at <span className="font-semibold">{r.drop || '—'}</span></span>
                    <StatusPill tone="slate">{r.code}</StatusPill>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PassengerManifest;
