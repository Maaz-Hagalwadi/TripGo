import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { VISIT_TRACKING_ENABLED } from '../../../shared/constants/features';
import { getVisitSummary, getVisits } from '../../../api/visitAnalyticsService';
import { Avatar, Card, EmptyState, FilterTabs, Pagination, SearchInput, SkeletonRows, StatCard, StatusPill } from './AdminUI';

const VISITS_COLOR = '#3B6FB6';
const PAGE_SIZE = 25;
const RANGES = [{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }];

const dayLabel = (ymd) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const when = (v) => new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const num = (v) => Number(v || 0).toLocaleString('en-IN');
const sourceLabel = (v) => (v?.utmSource ? `${v.utmSource}${v.utmCampaign ? ` · ${v.utmCampaign}` : ''}` : v?.referrer || 'Direct');
const device = (w) => (!w ? '—' : w < 768 ? 'Phone' : w < 1024 ? 'Tablet' : 'Desktop');

const PAGE_NAMES = {
  '/': 'Home', '/search-results': 'Search results', '/booking': 'Seat selection', '/payment': 'Payment',
  '/booking/success': 'Booking confirmed', '/login': 'Sign in', '/register': 'Create account', '/dashboard': 'Traveller dashboard',
  '/bookings': 'My bookings', '/operator-register': 'Operator sign-up',
};
const pageName = (path) => PAGE_NAMES[path] || path;

const VisitsTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200">
      <p className="font-semibold text-slate-500">{dayLabel(label)}</p>
      <p className="mt-0.5 flex items-center gap-1.5 font-black text-slate-900"><span className="w-2 h-2 rounded-full" style={{ background: VISITS_COLOR }} />{num(d.visits)} visits</p>
      <p className="text-slate-500">{num(d.uniqueVisitors)} unique visitors</p>
    </div>
  );
};

const Ranked = ({ rows, label }) => {
  if (!rows?.length) return <EmptyState icon="leaderboard" title="No data yet" />;
  const max = Math.max(...rows.map((r) => r.visits), 1);
  return (
    <ol className="space-y-3 px-5 py-4">
      {rows.slice(0, 8).map((r) => (
        <li key={r[label]}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-semibold text-slate-800" title={r[label]}>{label === 'path' ? pageName(r.path) : r.source || 'Direct'}</span>
            <span className="text-sm font-black text-slate-900 tabular-nums">{num(r.visits)}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-r-full bg-slate-100">
            <div className="h-2 rounded-r-full" style={{ width: `${Math.max(2, (r.visits / max) * 100)}%`, background: VISITS_COLOR }} />
          </div>
        </li>
      ))}
    </ol>
  );
};

/** Builds a link with ?utm_source=… so visits from it are counted under that name */
const LinkBuilder = () => {
  const [name, setName] = useState('');
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const link = `${window.location.origin}/?utm_source=${slug || 'your-link-name'}`;
  return (
    <Card title="Track a link you share" subtitle="Visits from this link show up under its name in Top sources" icon="link">
      <div className="space-y-3 p-5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name it, e.g. LinkedIn post or WhatsApp group" aria-label="Link name"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <code className="flex-1 truncate text-xs text-slate-700">{link}</code>
          <button disabled={!slug} onClick={() => navigator.clipboard?.writeText(link).then(() => toast.success('Link copied')).catch(() => {})}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">
            <span className="material-symbols-outlined text-[14px]">content_copy</span>Copy
          </button>
        </div>
      </div>
    </Card>
  );
};

const VisitorsPanel = () => {
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState(null);
  const [visits, setVisits] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [who, setWho] = useState('ALL');
  const [emailInput, setEmailInput] = useState('');
  const [email, setEmail] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => { setEmail(emailInput.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [emailInput]);

  const loadSummary = useCallback(async () => {
    if (!VISIT_TRACKING_ENABLED) return;
    setLoadingSummary(true);
    try { setSummary(await getVisitSummary(days)); } catch (e) { toast.error(e.message || 'Couldn’t load visitor stats'); } finally { setLoadingSummary(false); }
  }, [days]);

  const loadList = useCallback(async () => {
    if (!VISIT_TRACKING_ENABLED) return;
    setLoadingList(true);
    try {
      const res = await getVisits({ page, size: PAGE_SIZE, days, email: email || undefined, signedIn: who === 'SIGNED_IN' ? true : undefined });
      setVisits(res?.content || []);
      setTotal(Number(res?.totalElements || 0));
    } catch (e) {
      toast.error(e.message || 'Couldn’t load visits');
    } finally {
      setLoadingList(false);
    }
  }, [page, days, email, who]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadList(); }, [loadList]);

  if (!VISIT_TRACKING_ENABLED) {
    return (
      <div className="space-y-5">
        <Card>
          <EmptyState
            icon="visibility"
            title="Visitor tracking is switched off"
            subtitle="Once the visit endpoints are added to the backend (spec §11), set VITE_FEATURE_VISIT_TRACKING=true. You’ll then see how many people visit, which pages they open, where they came from, and the email of every signed-in visitor."
          />
        </Card>
        <LinkBuilder />
      </div>
    );
  }

  const topSource = summary?.topSources?.[0];
  const signedInShare = summary?.uniqueVisitors ? Math.round((Number(summary.signedInVisitors || 0) / summary.uniqueVisitors) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Admin pages and browsers with “Do Not Track” aren’t counted.</p>
        <FilterTabs options={RANGES} value={days} onChange={(v) => { setDays(v); setPage(0); }} label="Date range" />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="visibility" tone="blue" label="Visits" value={num(summary?.totalVisits)} sub={`Page views, last ${days} days`} loading={loadingSummary} />
        <StatCard icon="person_search" tone="navy" label="Unique visitors" value={num(summary?.uniqueVisitors)} sub="Different browsers" loading={loadingSummary} />
        <StatCard icon="how_to_reg" tone="green" label="Signed-in visitors" value={num(summary?.signedInVisitors)} sub={`${signedInShare}% of visitors`} loading={loadingSummary} onClick={() => { setWho('SIGNED_IN'); setPage(0); }} />
        <StatCard icon="campaign" tone="peach" label="Top source" value={topSource ? (topSource.source || 'Direct') : '—'} sub={topSource ? `${num(topSource.visits)} visits` : undefined} loading={loadingSummary} />
      </div>

      <Card title="Visits per day" subtitle="IST" icon="bar_chart">
        <div className="h-60 px-2 pb-3 pt-4">
          {loadingSummary ? <div className="h-full rounded-xl bg-slate-50 animate-pulse" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.daily || []} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid stroke="#EEF1F5" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dayLabel} interval={days > 14 ? Math.ceil(days / 10) : 0} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<VisitsTooltip />} cursor={{ fill: '#F1F5F9' }} />
                <Bar dataKey="visits" fill={VISITS_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card title="Top pages" icon="web">{loadingSummary ? <SkeletonRows rows={3} /> : <Ranked rows={summary?.topPages} label="path" />}</Card>
        <Card title="Top sources" icon="campaign">{loadingSummary ? <SkeletonRows rows={3} /> : <Ranked rows={summary?.topSources} label="source" />}</Card>
        <LinkBuilder />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <h2 className="text-lg font-black text-slate-900">Who visited</h2>
        <FilterTabs options={[{ value: 'ALL', label: 'Everyone' }, { value: 'SIGNED_IN', label: 'Signed in' }]} value={who} onChange={(v) => { setWho(v); setPage(0); }} label="Visitor type" />
        <SearchInput value={emailInput} onChange={setEmailInput} placeholder="Search by email" className="lg:ml-auto lg:w-72" />
      </div>

      <Card>
        {loadingList ? <SkeletonRows rows={6} /> : visits.length === 0 ? (
          <EmptyState icon="person_search" title="No visits found" subtitle={email || who !== 'ALL' ? 'Try a different filter.' : 'Visits appear here as people browse TripGo.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3 whitespace-nowrap">When</th>
                  <th className="px-5 py-3">Visitor</th>
                  <th className="px-5 py-3">Page</th>
                  <th className="px-5 py-3 hidden md:table-cell">Came from</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 whitespace-nowrap text-slate-500">{when(v.createdAt)}</td>
                    <td className="px-5 py-3">
                      {v.email ? (
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={v.userName || v.email} size="w-8 h-8" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate max-w-[220px]">{v.userName || v.email}</p>
                            {v.userName && <p className="text-xs text-slate-500 truncate max-w-[220px]">{v.email}</p>}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <StatusPill tone="slate">Guest</StatusPill>
                          <span className="font-mono text-xs text-slate-400" title="Anonymous visitor ID">#{String(v.visitorId || '').slice(0, 6)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3"><span className="font-semibold text-slate-700" title={v.path}>{pageName(v.path)}</span></td>
                    <td className="px-5 py-3 hidden md:table-cell text-slate-600">{sourceLabel(v)}</td>
                    <td className="px-5 py-3 hidden lg:table-cell text-slate-500">{device(v.screenWidth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </Card>
    </div>
  );
};

export default VisitorsPanel;
