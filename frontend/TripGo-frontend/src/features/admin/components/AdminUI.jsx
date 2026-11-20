// Building blocks shared by the admin pages, in the TripGo navy / peach style.

export const PageHeader = ({ eyebrow, title, subtitle, actions }) => (
  <section className="relative rounded-2xl bg-primary px-5 sm:px-6 py-6 text-white shadow-sm">
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" aria-hidden="true">
      <div className="absolute -top-24 -right-10 w-72 h-72 rounded-full bg-[#FF8A65]/15 blur-3xl" />
    </div>
    <div className="relative flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-semibold text-[#FDBA74] mb-1">{eyebrow}</p>}
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </section>
);

const TONES = {
  navy: { tile: 'bg-primary/5 text-primary', pill: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  peach: { tile: 'bg-[#FDBA74]/20 text-orange-600', pill: 'bg-[#FDBA74]/25 text-orange-700', dot: 'bg-[#FF8A65]' },
  green: { tile: 'bg-green-50 text-green-600', pill: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  amber: { tile: 'bg-amber-50 text-amber-600', pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  red: { tile: 'bg-red-50 text-red-600', pill: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  blue: { tile: 'bg-sky-50 text-sky-600', pill: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  slate: { tile: 'bg-slate-100 text-slate-500', pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};

export const StatCard = ({ icon, label, value, sub, tone = 'navy', onClick, loading }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`text-left rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5 flex items-start gap-4 ${onClick ? 'hover:border-[#FDBA74] hover:shadow-md transition-all' : ''}`}
    >
      <span className={`w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center ${TONES[tone].tile}`}>
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-slate-500">{label}</span>
        {loading
          ? <span className="mt-1.5 block h-7 w-16 rounded-lg bg-slate-100 animate-pulse" />
          : <span className="mt-0.5 block text-2xl font-black text-slate-900 tabular-nums">{value}</span>}
        {sub && <span className="mt-0.5 block text-xs text-slate-400">{sub}</span>}
      </span>
    </Tag>
  );
};

export const Card = ({ title, subtitle, icon, action, children, className = '', bodyClassName = '' }) => (
  <section className={`rounded-2xl bg-white border border-slate-200/80 shadow-sm ${className}`}>
    {title && (
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span className="w-9 h-9 flex-shrink-0 rounded-xl bg-[#FDBA74]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-orange-600">{icon}</span>
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-black text-slate-900 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

/** Filter tabs with optional counts. options: [{ value, label, count }] */
export const FilterTabs = ({ options, value, onChange, label = 'Filter' }) => (
  <div className="flex rounded-xl border border-slate-200 bg-white p-1 overflow-x-auto" role="tablist" aria-label={label}>
    {options.map((o) => {
      const active = o.value === value;
      return (
        <button
          key={o.value}
          role="tab"
          aria-selected={active}
          onClick={() => onChange(o.value)}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold whitespace-nowrap transition-colors ${active ? 'bg-primary text-white' : 'text-slate-500 hover:text-primary'}`}
        >
          {o.label}
          {o.count != null && <span className={`text-[11px] font-bold ${active ? 'text-[#FDBA74]' : 'text-slate-400'}`}>{o.count}</span>}
        </button>
      );
    })}
  </div>
);

export const SearchInput = ({ value, onChange, placeholder, className = '' }) => (
  <label className={`relative flex items-center ${className}`}>
    <span className="material-symbols-outlined pointer-events-none absolute left-3 text-[20px] text-slate-400">search</span>
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
    />
  </label>
);

export const StatusPill = ({ tone = 'slate', children }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${TONES[tone].pill}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${TONES[tone].dot}`} />
    {children}
  </span>
);

const ACTION_STYLES = {
  approve: 'border-green-200 text-green-700 hover:bg-green-50',
  danger: 'border-red-200 text-red-600 hover:bg-red-50',
  warn: 'border-amber-200 text-amber-700 hover:bg-amber-50',
  neutral: 'border-slate-200 text-slate-600 hover:border-[#FF8A65] hover:text-primary',
};

export const ActionButton = ({ icon, children, tone = 'neutral', ...props }) => (
  <button
    type="button"
    {...props}
    className={`inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${ACTION_STYLES[tone]}`}
  >
    {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
    {children}
  </button>
);

export const Pagination = ({ page, total, pageSize, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const start = totalPages <= 5 ? 0 : Math.max(0, Math.min(totalPages - 5, page - 2));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
      <p className="text-xs text-slate-500">
        {(page * pageSize + 1).toLocaleString('en-IN')}–{Math.min(total, (page + 1) * pageSize).toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 0} aria-label="Previous page" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i).map((n) => (
          <button key={n} onClick={() => onChange(n)} aria-current={page === n ? 'page' : undefined} className={`min-w-8 h-8 rounded-lg px-2 text-sm font-bold transition-colors ${page === n ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            {n + 1}
          </button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1} aria-label="Next page" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

export const EmptyState = ({ icon, title, subtitle, action }) => (
  <div className="px-6 py-14 text-center">
    <span className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-[#FDBA74]/20 flex items-center justify-center">
      <span className="material-symbols-outlined text-3xl text-orange-600">{icon}</span>
    </span>
    <p className="font-black text-slate-900">{title}</p>
    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const SkeletonRows = ({ rows = 5 }) => (
  <div className="divide-y divide-slate-100" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center gap-4 px-5 py-4">
        <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/3 rounded bg-slate-100 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="h-6 w-20 rounded-full bg-slate-100 animate-pulse" />
      </div>
    ))}
  </div>
);

const CONFIRM_TONES = {
  approve: 'bg-green-600 hover:bg-green-700',
  danger: 'bg-red-600 hover:bg-red-700',
  primary: 'bg-primary hover:bg-[#102A4C]',
};

/** Confirmation dialog. `children` adds extra content (e.g. a reason field). */
export const ConfirmDialog = ({ title, message, confirmLabel = 'Confirm', tone = 'primary', busy, disabled, onConfirm, onCancel, children }) => (
  <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-title"
    onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <h2 id="confirm-title" className="text-lg font-black text-slate-900">{title}</h2>
      {message && <p className="mt-1.5 text-sm text-slate-600">{message}</p>}
      {children && <div className="mt-4">{children}</div>}
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">Cancel</button>
        <button onClick={onConfirm} disabled={busy || disabled} className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 ${CONFIRM_TONES[tone]}`}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export const Avatar = ({ name, src, size = 'w-9 h-9' }) => {
  const initials = String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  return src
    ? <img src={src} alt="" className={`${size} flex-shrink-0 rounded-full object-cover`} />
    : <span className={`${size} flex-shrink-0 rounded-full bg-gradient-to-br from-[#FDBA74] to-[#FF8A65] text-primary text-xs font-black flex items-center justify-center`}>{initials}</span>;
};
