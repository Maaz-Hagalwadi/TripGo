import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import { API_BASE_URL } from '../config/env';
import { ROUTES } from '../shared/constants/routes';
import { Card, PageHeader, StatusPill } from '../features/admin/components/AdminUI';

// Traveller and operator support tickets are emailed here (backend SUPPORT_EMAIL); they aren't stored in TripGo
const SUPPORT_EMAIL = 'support@tripgo.com';

const GUIDES = [
  {
    icon: 'domain', title: 'Approve an operator',
    steps: ['Open Operators and filter by Pending.', 'Check the company name, email and phone look genuine.', 'Approve — they’re emailed and can add buses straight away. Reject sends a “not approved” email.'],
    to: `${ROUTES.ADMIN_DASHBOARD}?tab=operators&status=PENDING`, cta: 'Pending operators',
  },
  {
    icon: 'directions_bus', title: 'Approve a bus',
    steps: ['Open Buses and filter by Pending.', 'Check the number plate, type and seat count match the operator.', 'Approve to let it be scheduled and booked.'],
    to: `${ROUTES.ADMIN_DASHBOARD}?tab=buses&status=PENDING`, cta: 'Pending buses',
  },
  {
    icon: 'block', title: 'Stop an abusive account',
    steps: ['Find the person in Users (search by name, email or phone).', 'Suspend — they’re signed out everywhere and can’t book.', 'For an operator company, suspend it from Operators instead.'],
    to: ROUTES.ADMIN_USERS, cta: 'Open users',
  },
  {
    icon: 'visibility_off', title: 'Remove a bad review',
    steps: ['Open Reviews and filter by rating or route.', 'Hide it with a reason (spam, abusive, fake…).', 'Hidden reviews can be restored any time.'],
    to: ROUTES.ADMIN_REVIEWS, cta: 'Open reviews',
  },
  {
    icon: 'history', title: 'Investigate a complaint',
    steps: ['Ask for the booking code and the traveller’s email.', 'Search Audit logs by their email to see what happened and when.', 'Expand a row for the exact request and IP address.'],
    to: ROUTES.ADMIN_AUDIT_LOGS, cta: 'Open audit logs',
  },
  {
    icon: 'sell', title: 'Run a promotion',
    steps: ['Create a code in Promo codes with a start and last day.', 'Set a maximum discount for percentage codes.', 'Switch it off any time without deleting it.'],
    to: ROUTES.ADMIN_PROMOS, cta: 'Open promo codes',
  },
];

// No dedicated health endpoint exists; a tiny public read shows whether the API and database answer
const pingApi = async () => {
  const started = performance.now();
  try {
    const res = await fetch(`${API_BASE_URL}/reviews/recent?limit=1`, { cache: 'no-store' });
    return { state: res.ok ? 'up' : 'down', ms: Math.round(performance.now() - started), at: new Date() };
  } catch {
    return { state: 'down', ms: null, at: new Date() };
  }
};

const AdminSupport = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState({ state: 'checking', ms: null, at: null });

  useEffect(() => {
    let alive = true;
    pingApi().then((result) => { if (alive) setHealth(result); });
    return () => { alive = false; };
  }, []);
  const recheck = () => { setHealth((h) => ({ ...h, state: 'checking' })); pingApi().then(setHealth); };

  const copy = () => navigator.clipboard?.writeText(SUPPORT_EMAIL)
    .then(() => toast.success('Support email copied'))
    .catch(() => toast.error('Couldn’t copy the email'));

  const status = {
    checking: <StatusPill tone="slate">Checking…</StatusPill>,
    up: <StatusPill tone="green">Online</StatusPill>,
    down: <StatusPill tone="red">Not reachable</StatusPill>,
  }[health.state];

  return (
    <AdminLayout activeItemOverride="support" title="Support">
      <div className="space-y-5">
        <PageHeader title="Help & support" subtitle="Where support requests go, system status, and how-tos for common admin tasks" />

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Support inbox" icon="mail">
            <div className="p-5">
              <p className="text-sm text-slate-600">Tickets that travellers and operators send from their Support pages arrive by email at:</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-lg font-black text-slate-900 hover:text-[#FF8A65]">{SUPPORT_EMAIL}</a>
                <button onClick={copy} aria-label="Copy support email" className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-slate-500">content_copy</span>
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-500">Each email includes the sender’s name, email, category and message. Reply directly from your inbox.</p>
            </div>
          </Card>

          <Card title="System status" icon="monitor_heart" action={(
            <button onClick={recheck} disabled={health.state === 'checking'} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-[#FF8A65] disabled:opacity-50">
              <span className={`material-symbols-outlined text-[16px] ${health.state === 'checking' ? 'animate-spin' : ''}`}>refresh</span>Check again
            </button>
          )}>
            <div className="p-5">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">TripGo API</p>
                  <p className="text-xs text-slate-500 break-all">{API_BASE_URL}</p>
                </div>
                {status}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {health.state === 'up' && `Responded in ${health.ms} ms`}
                {health.state === 'down' && 'The API didn’t respond. Travellers can’t search or book until it’s back — check the server logs.'}
                {health.at && ` · checked ${health.at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`}
              </p>
            </div>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-black text-slate-900">How to…</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {GUIDES.map((g) => (
              <section key={g.title} className="flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-[#FDBA74]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px] text-orange-600">{g.icon}</span>
                  </span>
                  <h3 className="font-black text-slate-900">{g.title}</h3>
                </div>
                <ol className="mt-3 flex-1 space-y-1.5 text-sm text-slate-600">
                  {g.steps.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-0.5 w-5 h-5 flex-shrink-0 rounded-full bg-slate-100 text-[11px] font-bold text-slate-500 flex items-center justify-center">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
                <button onClick={() => navigate(g.to)} className="mt-4 inline-flex items-center gap-1 self-start text-sm font-bold text-primary hover:text-[#FF8A65]">
                  {g.cta}<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </section>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSupport;
