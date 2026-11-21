import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getBuses } from '../../../api/busService';
import { getBusRatingSummary } from '../../../api/bookingService';
import { getOperatorBusReviews, getOperatorReviews } from '../../../api/reviewService';
import {
  Avatar, Card, EmptyState, FilterTabs, PageHeader, Pagination, SkeletonRows, StatCard, StatusPill,
} from '../../../shared/components/console/ConsoleUI';
import { istDate } from '../utils/operatorFormat';

const PAGE_SIZE = 10;
const toPage = (d) => ({
  content: Array.isArray(d?.content) ? d.content : Array.isArray(d) ? d : [],
  total: Number(d?.totalElements ?? (Array.isArray(d?.content) ? d.content.length : 0)),
});

const Stars = ({ rating, size = 'text-[16px]' }) => (
  <span className="inline-flex" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={`material-symbols-outlined ${size} ${n <= rating ? 'text-amber-400' : 'text-slate-200'}`} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
    ))}
  </span>
);

const OperatorReviews = () => {
  const [buses, setBuses] = useState([]);
  const [summary, setSummary] = useState(null); // { total, positive, critical, average, perBus }
  const [tab, setTab] = useState('all');
  const [busId, setBusId] = useState('');
  const [page, setPage] = useState(0);
  const [reviews, setReviews] = useState({ content: [], total: 0 });
  const [loading, setLoading] = useState(true);

  // Totals across ALL reviews (the old page averaged only the 10 reviews on screen)
  useEffect(() => {
    (async () => {
      const [busList, all, pos, crit] = await Promise.allSettled([
        getBuses(), getOperatorReviews({ page: 0, size: 1 }), getOperatorReviews({ page: 0, size: 1, rating: 'positive' }), getOperatorReviews({ page: 0, size: 1, rating: 'critical' }),
      ]);
      const list = busList.status === 'fulfilled' && Array.isArray(busList.value) ? busList.value : [];
      setBuses(list);
      const per = await Promise.allSettled(list.map((b) => getBusRatingSummary(b.id)));
      const perBus = list.map((b, i) => ({ bus: b, avg: Number(per[i].value?.averageRating || 0), count: Number(per[i].value?.totalRatings || 0) }))
        .filter((x) => per[list.indexOf(x.bus)].status === 'fulfilled');
      const rated = perBus.reduce((n, x) => n + x.count, 0);
      setSummary({
        total: all.status === 'fulfilled' ? toPage(all.value).total : 0,
        positive: pos.status === 'fulfilled' ? toPage(pos.value).total : 0,
        critical: crit.status === 'fulfilled' ? toPage(crit.value).total : 0,
        average: rated ? perBus.reduce((n, x) => n + x.avg * x.count, 0) / rated : null,
        perBus: perBus.filter((x) => x.count > 0).sort((a, b) => b.avg - a.avg),
      });
    })();
  }, []);

  useEffect(() => {
    let alive = true;
    const req = busId
      ? getOperatorBusReviews(busId, { page, size: PAGE_SIZE })
      : getOperatorReviews({ page, size: PAGE_SIZE, rating: tab === 'all' ? undefined : tab });
    req.then((d) => { if (alive) setReviews(toPage(d)); })
      .catch((e) => { if (alive) { setReviews({ content: [], total: 0 }); toast.error(e.message || 'Couldn’t load reviews'); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab, busId, page]);

  const change = (fn) => { setLoading(true); setPage(0); fn(); };

  return (
    <OperatorLayout activeItem="reviews" title="Reviews">
      <div className="space-y-5">
        <PageHeader title="Reviews" subtitle="What travellers say after riding with you" />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="star" tone="amber" label="Average rating" value={summary?.average != null ? `${summary.average.toFixed(1)} / 5` : '—'} sub={summary ? `From ${summary.total} review${summary.total !== 1 ? 's' : ''}` : undefined} loading={!summary} />
          <StatCard icon="reviews" tone="navy" label="All reviews" value={summary?.total ?? 0} loading={!summary} onClick={() => change(() => { setTab('all'); setBusId(''); })} />
          <StatCard icon="sentiment_satisfied" tone="green" label="Happy (4–5 ★)" value={summary?.positive ?? 0} sub={summary?.total ? `${Math.round((summary.positive / summary.total) * 100)}% of reviews` : undefined} loading={!summary} onClick={() => change(() => { setTab('positive'); setBusId(''); })} />
          <StatCard icon="sentiment_dissatisfied" tone="red" label="Needs attention (1–3 ★)" value={summary?.critical ?? 0} loading={!summary} onClick={() => change(() => { setTab('critical'); setBusId(''); })} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="space-y-4 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <FilterTabs
                options={[{ value: 'all', label: 'All' }, { value: 'positive', label: '4–5 ★' }, { value: 'critical', label: '1–3 ★' }]}
                value={busId ? 'all' : tab}
                onChange={(v) => change(() => { setTab(v); setBusId(''); })}
                label="Rating"
              />
              <select value={busId} onChange={(e) => change(() => setBusId(e.target.value))} aria-label="Bus"
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-primary">
                <option value="">All buses</option>
                {buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {!loading && <span className="ml-auto text-sm text-slate-500">{reviews.total} review{reviews.total !== 1 ? 's' : ''}</span>}
            </div>

            <Card>
              {loading ? <SkeletonRows rows={4} /> : reviews.content.length === 0 ? (
                <EmptyState icon="reviews" title="No reviews yet" subtitle={busId || tab !== 'all' ? 'Nothing matches this filter.' : 'Travellers can rate a trip once it’s completed.'} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {reviews.content.map((r) => (
                    <li key={r.id} className="flex gap-4 px-5 py-5">
                      <Avatar name={r.userName || 'Traveller'} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Stars rating={Number(r.rating || 0)} />
                          {r.title && <p className="font-bold text-slate-900">{r.title}</p>}
                          {Number(r.rating) <= 2 && <StatusPill tone="red">Low rating</StatusPill>}
                        </div>
                        <p className={`mt-1.5 text-sm leading-relaxed ${r.comment ? 'text-slate-700' : 'italic text-slate-400'}`}>{r.comment || 'No written comment'}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">{r.userName || 'Traveller'}</span>
                          {[r.busName, r.from && r.to ? `${r.from} → ${r.to}` : null, istDate(r.createdAt), r.bookingCode].filter(Boolean).map((x) => ` · ${x}`)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Pagination page={page} total={reviews.total} pageSize={PAGE_SIZE} onChange={(p) => { setLoading(true); setPage(p); }} />
            </Card>
          </div>

          <Card title="Ratings by bus" icon="directions_bus">
            {!summary ? <SkeletonRows rows={3} /> : summary.perBus.length === 0 ? (
              <EmptyState icon="star" title="No ratings yet" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {summary.perBus.map(({ bus, avg, count }) => (
                  <li key={bus.id}>
                    <button onClick={() => change(() => setBusId(String(bus.id)))} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900 truncate">{bus.name}</span>
                        <span className="block text-xs text-slate-500">{count} rating{count !== 1 ? 's' : ''}</span>
                      </span>
                      <span className={`rounded-lg px-2 py-1 text-xs font-black text-white ${avg >= 4 ? 'bg-green-600' : avg >= 3 ? 'bg-amber-500' : 'bg-red-600'}`}>★ {avg.toFixed(1)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default OperatorReviews;
