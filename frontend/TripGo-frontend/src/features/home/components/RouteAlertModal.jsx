import { useState } from 'react';
import { toast } from 'sonner';
import { createRouteAlert, updateRouteAlert, deleteRouteAlert } from '../../../api/travellerFeaturesService';
import { localDateString } from '../../../shared/utils/date';

const inputCls = 'w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-[#FF8A65] focus:ring-4 focus:ring-[#FDBA74]/25';

/**
 * Create / edit / remove a seat & price alert for a saved route (spec §5).
 * `alert` is the existing alert for this route, if any.
 */
const RouteAlertModal = ({ route, alert, onClose, onSaved, onDeleted }) => {
  const [maxFare, setMaxFare] = useState(alert?.maxFare ?? '');
  const [travelDate, setTravelDate] = useState(alert?.travelDate ?? '');
  const [notifySeats, setNotifySeats] = useState(alert ? Boolean(alert.notifyOnSeats) : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!maxFare && !notifySeats) return setError('Choose at least one thing to be alerted about.');
    if (notifySeats && !travelDate) return setError('Pick the travel date to watch for seats.');
    setSaving(true);
    setError('');
    const payload = {
      savedRouteId: route.id,
      fromCity: route.fromCity,
      toCity: route.toCity,
      travelDate: travelDate || null,
      maxFare: maxFare ? Number(maxFare) : null,
      notifyOnSeats: notifySeats,
    };
    try {
      const saved = alert ? await updateRouteAlert(alert.id, payload) : await createRouteAlert(payload);
      toast.success('Alert saved — we’ll notify you by email and in the app.');
      onSaved(saved);
    } catch (e) {
      setError(e.message || 'Couldn’t save the alert.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await deleteRouteAlert(alert.id);
      toast.success('Alert removed');
      onDeleted(alert.id);
    } catch (e) {
      setError(e.message || 'Couldn’t remove the alert.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Route alert</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{route.fromCity} <span className="text-[#FF8A65]">→</span> {route.toCity}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div>
            <label htmlFor="alert-fare" className="block text-sm font-semibold text-slate-900 mb-1.5">Alert me when the fare drops below</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
              <input id="alert-fare" type="number" min="1" inputMode="numeric" value={maxFare} onChange={(e) => setMaxFare(e.target.value)} placeholder="Any price" className={`${inputCls} pl-8`} />
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={notifySeats} onChange={(e) => setNotifySeats(e.target.checked)} className="mt-0.5 w-5 h-5 rounded border-slate-300 text-primary focus:ring-[#FDBA74]" />
            <span className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Seats become available</span><br />
              <span className="text-xs text-slate-500">Useful when buses are sold out for your date.</span>
            </span>
          </label>
          <div>
            <label htmlFor="alert-date" className="block text-sm font-semibold text-slate-900 mb-1.5">Travel date {notifySeats ? '' : <span className="font-normal text-slate-400">(optional)</span>}</label>
            <input id="alert-date" type="date" min={localDateString()} value={travelDate} onChange={(e) => setTravelDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {alert ? (
            <button onClick={remove} disabled={saving} className="flex-1 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60">Remove alert</button>
          ) : (
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
          )}
          <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-60">
            {saving ? 'Saving...' : alert ? 'Update alert' : 'Create alert'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteAlertModal;
