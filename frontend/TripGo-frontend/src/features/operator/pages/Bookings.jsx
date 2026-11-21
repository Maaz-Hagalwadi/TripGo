import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { cancelOperatorBooking, getOperatorBookings } from '../../../api/operatorBookingService';
import {
  ActionButton, Card, ConfirmDialog, EmptyState, FilterTabs, PageHeader, Pagination, SearchInput, SkeletonRows, StatCard, StatusPill,
} from '../../../shared/components/console/ConsoleUI';
import { headerButton } from '../../../shared/components/console/consoleStyles';
import { toIstYmd } from '../../../shared/utils/scheduleSearchUtils';
import { bookingDeparture, bookingTravellers, istDate, istDateTime, istTime, passengerName, rupees } from '../utils/operatorFormat';

const PAGE_SIZE = 15;
const CANCEL_REASONS = ['Bus breakdown', 'Trip cancelled', 'Schedule change', 'Overbooked', 'Traveller asked to cancel'];
const REFUND_LABEL = { PROCESSED: 'Refunded', PENDING: 'Refund in progress', NA: 'No refund' };

const statusOf = (b, now) => {
  const s = String(b.status || '').toUpperCase();
  if (s === 'CANCELLED') return 'CANCELLED';
  const dep = bookingDeparture(b);
  return dep && dep.getTime() < now ? 'PAST' : 'UPCOMING';
};

const BookingDetails = ({ b, people, st }) => (
  <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Travellers</p>
      <ul className="space-y-1.5">
        {people.map((p, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
            <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-black text-white">{p.seatNumber || '—'}</span>
            <span className="font-semibold text-slate-800">{passengerName(p) || 'Traveller'}</span>
            <span className="text-slate-500">{[p.gender && String(p.gender)[0], p.age].filter(Boolean).join(', ')}</span>
            {p.phone && <a href={`tel:${p.phone}`} className="text-slate-500 hover:text-primary">{p.phone}</a>}
            {p.fromStop && <span className="text-xs text-slate-400">{p.fromStop} → {p.toStop}</span>}
          </li>
        ))}
      </ul>
    </div>
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <div><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Booked</dt><dd className="text-slate-700">{istDateTime(b.bookedAt)}</dd></div>
      <div><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Paid</dt><dd className="text-slate-700">{rupees(b.payableAmount)}</dd></div>
      {st === 'CANCELLED' && (
        <>
          <div><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cancelled by</dt><dd className="text-slate-700">{String(b.cancelledBy || '—').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</dd></div>
          <div><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Refund</dt><dd className="text-slate-700">{rupees(b.refundAmount)} · {REFUND_LABEL[String(b.refundStatus || 'NA').toUpperCase()] || b.refundStatus}</dd></div>
          {b.cancelReason && <div className="col-span-2"><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reason</dt><dd className="text-slate-700">{b.cancelReason}</dd></div>}
        </>
      )}
    </dl>
  </div>
);

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const Bookings = () => {
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('UPCOMING');
  const [search, setSearch] = useState(searchParams.get('bookingCode') || '');
  const [date, setDate] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [toCancel, setToCancel] = useState(null);
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [cancelling, setCancelling] = useState(false);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const data = await getOperatorBookings();
      setBookings(Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : []);
    } catch (e) {
      toast.error(e.message || 'Couldn’t load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const routes = useMemo(() => [...new Set(bookings.map((b) => `${b.from} → ${b.to}`))].sort(), [bookings]);
  const counts = useMemo(() => bookings.reduce((acc, b) => { const s = statusOf(b, now); acc[s] = (acc[s] || 0) + 1; return acc; }, {}), [bookings, now]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => bookings
    .filter((b) => tab === 'ALL' || statusOf(b, now) === tab)
    .filter((b) => !date || toIstYmd(bookingDeparture(b)) === date)
    .filter((b) => !routeFilter || `${b.from} → ${b.to}` === routeFilter)
    .filter((b) => !q || [b.bookingCode, b.busName, ...(b.seatNumbers || []), ...bookingTravellers(b).flatMap((p) => [passengerName(p), p.phone])]
      .some((v) => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => (tab === 'UPCOMING'
      ? (bookingDeparture(a) - bookingDeparture(b))
      : (new Date(b.bookedAt) - new Date(a.bookedAt)))), [bookings, tab, date, routeFilter, q, now]);

  const safePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));
  const rows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const travellersInView = filtered.filter((b) => statusOf(b, now) !== 'CANCELLED').reduce((n, b) => n + (bookingTravellers(b).length || 1), 0);
  const upcomingRevenue = bookings.filter((b) => statusOf(b, now) === 'UPCOMING').reduce((n, b) => n + Number(b.payableAmount || 0), 0);

  const exportCsv = () => {
    const header = ['Booking', 'Status', 'Route', 'Travel date', 'Departure', 'Bus', 'Seat', 'Passenger', 'Age', 'Gender', 'Phone', 'Boarding', 'Dropping', 'Amount'];
    const lines = filtered.flatMap((b) => {
      const dep = bookingDeparture(b);
      return (bookingTravellers(b).length ? bookingTravellers(b) : [{}]).map((p) => [
        b.bookingCode, statusOf(b, now), `${b.from} - ${b.to}`, istDate(dep), istTime(dep), b.busName, p.seatNumber, passengerName(p), p.age, p.gender, p.phone,
        p.fromStop, p.toStop, b.payableAmount,
      ].map(csvCell).join(','));
    });
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tripgo-passengers${date ? `-${date}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      const res = await cancelOperatorBooking(toCancel.bookingId, reason.trim());
      const refund = Number(res?.refundAmount ?? 0);
      toast.success(refund > 0 ? `Cancelled — ${rupees(refund)} will be refunded to the traveller` : 'Booking cancelled');
      setToCancel(null);
      load();
    } catch (e) {
      toast.error(e.message || 'Couldn’t cancel the booking');
    } finally {
      setCancelling(false);
    }
  };

  const resetPage = () => setPage(0);

  return (
    <OperatorLayout activeItem="bookings" title="Bookings">
      <div className="space-y-5">
        <PageHeader
          title="Bookings"
          subtitle="Who’s travelling on your buses, and when"
          actions={<button onClick={exportCsv} disabled={!filtered.length} className={headerButton}><span className="material-symbols-outlined text-[18px]">download</span>Passenger list (CSV)</button>}
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="event_upcoming" tone="blue" label="Upcoming bookings" value={counts.UPCOMING || 0} loading={loading} onClick={() => { setTab('UPCOMING'); resetPage(); }} />
          <StatCard icon="payments" tone="green" label="Upcoming revenue" value={rupees(upcomingRevenue)} loading={loading} />
          <StatCard icon="history" tone="navy" label="Completed trips" value={counts.PAST || 0} sub="Bookings that travelled" loading={loading} onClick={() => { setTab('PAST'); resetPage(); }} />
          <StatCard icon="event_busy" tone="red" label="Cancelled" value={counts.CANCELLED || 0} loading={loading} onClick={() => { setTab('CANCELLED'); resetPage(); }} />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <FilterTabs
              options={[{ value: 'UPCOMING', label: 'Upcoming', count: counts.UPCOMING || 0 }, { value: 'PAST', label: 'Travelled', count: counts.PAST || 0 }, { value: 'CANCELLED', label: 'Cancelled', count: counts.CANCELLED || 0 }, { value: 'ALL', label: 'All', count: bookings.length }]}
              value={tab}
              onChange={(v) => { setTab(v); resetPage(); }}
              label="Booking status"
            />
            <SearchInput value={search} onChange={(v) => { setSearch(v); resetPage(); }} placeholder="Booking code, name, phone or seat" className="lg:ml-auto lg:w-80" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <span className="material-symbols-outlined text-[18px] text-slate-400">calendar_month</span>
              <span className="text-slate-500">Trip date</span>
              <input type="date" value={date} onChange={(e) => { setDate(e.target.value); resetPage(); }} className="border-0 bg-transparent p-0 font-semibold text-slate-800 outline-none focus:ring-0" aria-label="Trip date" />
            </label>
            {routes.length > 1 && (
              <select value={routeFilter} onChange={(e) => { setRouteFilter(e.target.value); resetPage(); }} aria-label="Route"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-primary">
                <option value="">All routes</option>
                {routes.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            {(date || routeFilter) && <button onClick={() => { setDate(''); setRouteFilter(''); resetPage(); }} className="px-2 text-sm font-bold text-primary hover:text-[#FF8A65]">Clear</button>}
            {!loading && <span className="ml-auto text-sm text-slate-500">{filtered.length} booking{filtered.length !== 1 ? 's' : ''} · {travellersInView} traveller{travellersInView !== 1 ? 's' : ''}</span>}
          </div>
        </div>

        <Card>
          {loading ? <SkeletonRows /> : rows.length === 0 ? (
            <EmptyState icon="confirmation_number" title="No bookings found" subtitle={q || date || routeFilter ? 'Try a different search or date.' : tab === 'UPCOMING' ? 'No upcoming trips are booked yet.' : 'Nothing here yet.'} />
          ) : (
            <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Traveller</th>
                    <th className="px-5 py-3">Trip</th>
                    <th className="px-5 py-3 hidden md:table-cell">Seats</th>
                    <th className="px-5 py-3 hidden lg:table-cell text-right">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((b) => {
                    const people = bookingTravellers(b);
                    const lead = people[0] || {};
                    const st = statusOf(b, now);
                    const dep = bookingDeparture(b);
                    const open = expanded === b.bookingId;
                    return (
                      <Fragment key={b.bookingId}>
                        <tr className={st === 'CANCELLED' ? 'bg-slate-50/60' : 'hover:bg-slate-50/60'}>
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-slate-900">{passengerName(lead) || 'Traveller'}{people.length > 1 && <span className="font-normal text-slate-400"> +{people.length - 1}</span>}</p>
                            <p className="text-xs text-slate-500">
                              {lead.phone ? <a href={`tel:${lead.phone}`} className="hover:text-primary">{lead.phone}</a> : '—'}
                              <span className="font-mono"> · {b.bookingCode}</span>
                            </p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-slate-800">{b.from} → {b.to}</p>
                            <p className="text-xs text-slate-500">{istDate(dep, { weekday: 'short', year: undefined })} · {istTime(dep)}{b.busName ? ` · ${b.busName}` : ''}</p>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell font-mono text-slate-700">{(b.seatNumbers || []).join(', ')}</td>
                          <td className={`px-5 py-3.5 hidden lg:table-cell text-right font-bold tabular-nums ${st === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{rupees(b.payableAmount)}</td>
                          <td className="px-5 py-3.5">
                            {st === 'CANCELLED' ? <StatusPill tone="red">Cancelled</StatusPill> : st === 'PAST' ? <StatusPill tone="slate">Travelled</StatusPill> : <StatusPill tone="green">Confirmed</StatusPill>}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1.5">
                              <ActionButton icon={open ? 'expand_less' : 'expand_more'} onClick={() => setExpanded(open ? null : b.bookingId)} aria-expanded={open} aria-label="Details" />
                              {st === 'UPCOMING' && <ActionButton icon="cancel" tone="danger" onClick={() => { setToCancel(b); setReason(CANCEL_REASONS[0]); }}>Cancel</ActionButton>}
                            </div>
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={6} className="px-5 py-4">
                              <BookingDetails b={b} people={people} st={st} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="md:hidden divide-y divide-slate-100">
              {rows.map((b) => {
                const people = bookingTravellers(b);
                const lead = people[0] || {};
                const st = statusOf(b, now);
                const dep = bookingDeparture(b);
                const open = expanded === b.bookingId;
                return (
                  <li key={b.bookingId} className="space-y-2.5 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{passengerName(lead) || 'Traveller'}{people.length > 1 && <span className="font-normal text-slate-400"> +{people.length - 1}</span>}</p>
                        <p className="text-xs text-slate-500">{b.from} → {b.to} · {istDate(dep, { weekday: 'short', year: undefined })} · {istTime(dep)}</p>
                        <p className="text-xs text-slate-500">Seats {(b.seatNumbers || []).join(', ')} · <span className="font-mono">{b.bookingCode}</span></p>
                      </div>
                      <div className="text-right">
                        <p className={`font-black tabular-nums ${st === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{rupees(b.payableAmount)}</p>
                        {st === 'CANCELLED' ? <StatusPill tone="red">Cancelled</StatusPill> : st === 'PAST' ? <StatusPill tone="slate">Travelled</StatusPill> : <StatusPill tone="green">Confirmed</StatusPill>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.phone && <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600"><span className="material-symbols-outlined text-[16px]">call</span>Call</a>}
                      <ActionButton icon={open ? 'expand_less' : 'expand_more'} onClick={() => setExpanded(open ? null : b.bookingId)} aria-expanded={open}>Details</ActionButton>
                      {st === 'UPCOMING' && <ActionButton icon="cancel" tone="danger" onClick={() => { setToCancel(b); setReason(CANCEL_REASONS[0]); }}>Cancel</ActionButton>}
                    </div>
                    {open && <div className="rounded-xl bg-slate-50 p-3"><BookingDetails b={b} people={people} st={st} /></div>}
                  </li>
                );
              })}
            </ul>
            </>
          )}
          <Pagination page={safePage} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </Card>
      </div>

      {toCancel && (
        <ConfirmDialog
          title={`Cancel booking ${toCancel.bookingCode}?`}
          message={`${passengerName(bookingTravellers(toCancel)[0]) || 'The traveller'} gets a full refund of ${rupees(toCancel.payableAmount)} and an email with your reason.`}
          confirmLabel="Cancel booking"
          tone="danger"
          busy={cancelling}
          disabled={!reason.trim()}
          onConfirm={cancel}
          onCancel={() => setToCancel(null)}
        >
          <p className="mb-2 text-xs font-bold text-slate-600">Reason (shown to the traveller)</p>
          <div className="flex flex-wrap gap-2">
            {CANCEL_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${reason === r ? 'bg-primary border-primary text-white' : 'border-slate-200 text-slate-600 hover:border-[#FF8A65]'}`}>{r}</button>
            ))}
          </div>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} aria-label="Cancellation reason" placeholder="Or write a reason"
            className="mt-3 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
        </ConfirmDialog>
      )}
    </OperatorLayout>
  );
};

export default Bookings;
