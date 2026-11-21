import { useState } from 'react';
import { clockLabel } from '../utils/operatorFormat';
import { emptyPoint, INPUT, pointError, sortPoints } from '../utils/routeForms';

const TYPES = {
  BOARDING: { title: 'Boarding points', icon: 'login', hint: 'Where travellers get on', tone: 'text-green-700 bg-green-50', empty: 'Add at least one place travellers can board.' },
  DROPPING: { title: 'Dropping points', icon: 'logout', hint: 'Where travellers get off', tone: 'text-orange-700 bg-[#FDBA74]/20', empty: 'Add at least one place travellers can get off.' },
};

const PointFields = ({ value, onChange, autoFocus }) => (
  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
    <input autoFocus={autoFocus} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Name, e.g. Majestic bus stand" aria-label="Point name" className={INPUT} />
    <input type="time" value={String(value.arrivalTime || '').slice(0, 5)} onChange={(e) => onChange({ ...value, arrivalTime: e.target.value })} aria-label="Time" className={INPUT} />
    <input value={value.landmark || ''} onChange={(e) => onChange({ ...value, landmark: e.target.value })} placeholder="Landmark (optional)" aria-label="Landmark" className={INPUT} />
    <input value={value.address || ''} onChange={(e) => onChange({ ...value, address: e.target.value })} placeholder="Address (optional)" aria-label="Address" className={`${INPUT} sm:col-span-1`} />
  </div>
);

/**
 * Boarding and dropping lists side by side. Works on a plain array of points; `onAdd`, `onSave` and
 * `onDelete` may return promises (server-backed) — a rejected promise keeps the form open.
 */
const PointsEditor = ({ points, departureTime, onAdd, onSave, onDelete, busy, suggestions = {} }) => {
  const [draft, setDraft] = useState(null); // { mode: 'add'|'edit', point, error }

  const submit = async () => {
    const error = pointError(draft.point);
    const dup = points.some((p) => p !== draft.original && p.type === draft.point.type && p.name.trim().toLowerCase() === draft.point.name.trim().toLowerCase());
    if (error || dup) { setDraft({ ...draft, error: error || 'You already have a point with this name' }); return; }
    try {
      await (draft.mode === 'add' ? onAdd(draft.point) : onSave(draft.original, draft.point));
      setDraft(null);
    } catch (e) {
      setDraft((d) => d && { ...d, error: e?.message || 'Couldn’t save this point' });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Object.entries(TYPES).map(([type, meta]) => {
        const list = sortPoints(points.filter((p) => p.type === type), departureTime);
        const editingHere = draft && draft.point.type === type;
        return (
          <section key={type} className="rounded-2xl border border-slate-200 bg-white">
            <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.tone}`}><span className="material-symbols-outlined text-[18px]">{meta.icon}</span></span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900">{meta.title} <span className="text-slate-400 font-bold">{list.length}</span></h3>
                  <p className="text-xs text-slate-500">{meta.hint}</p>
                </div>
              </div>
              {!editingHere && (
                <button type="button" onClick={() => setDraft({ mode: 'add', point: emptyPoint(type, list.length ? {} : suggestions[type] || {}) })}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-slate-100">
                  <span className="material-symbols-outlined text-[16px]">add</span>Add
                </button>
              )}
            </header>

            {list.length === 0 && !editingHere && (
              <p className="flex items-center gap-2 px-4 py-5 text-sm text-red-700"><span className="material-symbols-outlined text-[18px]">error</span>{meta.empty}</p>
            )}

            <ol className="divide-y divide-slate-100">
              {list.map((p) => (draft?.mode === 'edit' && draft.original === p ? null : (
                <li key={p.id || `${p.name}-${p.arrivalTime}`} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 w-16 flex-shrink-0 text-sm font-black text-slate-900 tabular-nums">{clockLabel(String(p.arrivalTime).slice(0, 5))}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-800">{p.name}</span>
                    {(p.landmark || p.address) && <span className="block text-xs text-slate-500 truncate">{[p.landmark, p.address].filter(Boolean).join(' · ')}</span>}
                  </span>
                  <button type="button" onClick={() => setDraft({ mode: 'edit', original: p, point: { ...p, arrivalTime: String(p.arrivalTime || '').slice(0, 5) } })} aria-label={`Edit ${p.name}`} className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button type="button" disabled={busy} onClick={() => onDelete(p)} aria-label={`Remove ${p.name}`} className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center disabled:opacity-40">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </li>
              )))}
            </ol>

            {editingHere && (
              <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3.5 space-y-2.5">
                <p className="text-xs font-black text-slate-700">{draft.mode === 'add' ? `New ${type === 'BOARDING' ? 'boarding' : 'dropping'} point` : 'Edit point'}</p>
                <PointFields value={draft.point} onChange={(point) => setDraft({ ...draft, point, error: '' })} autoFocus />
                {draft.error && <p className="text-xs font-semibold text-red-600">{draft.error}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">Cancel</button>
                  <button type="button" disabled={busy} onClick={submit} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{draft.mode === 'add' ? 'Add point' : 'Save'}</button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default PointsEditor;
