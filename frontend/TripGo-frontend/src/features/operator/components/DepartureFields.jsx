import { Link } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import { istToIso, minutesLabel, prettyType, todayIst } from '../utils/operatorFormat';
import { addMinutesIst, departureMinutes, FREQUENCIES, INPUT, LABEL } from '../utils/routeForms';

const whenLabel = (ymd, hm) => {
  const d = ymd && hm ? new Date(istToIso(ymd, hm)) : null;
  return d ? d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '';
};

/**
 * Bus, departure, arrival and frequency for one departure. Times are IST wall clock. When the trip
 * length is known from the route's stops, the arrival follows the departure until edited by hand.
 */
const DepartureFields = ({ value, onChange, buses, tripMinutes = 0, lockBus = false }) => {
  const setDeparture = (patch) => {
    const next = { ...value, ...patch };
    if (tripMinutes > 0 && !value.arrivalEdited && next.depDate && next.depTime) {
      const arr = addMinutesIst(next.depDate, next.depTime, tripMinutes);
      next.arrDate = arr.date;
      next.arrTime = arr.time;
    }
    onChange(next);
  };
  const setArrival = (patch) => onChange({ ...value, ...patch, arrivalEdited: true });
  const mins = departureMinutes(value);
  const bus = buses.find((b) => String(b.id) === String(value.busId));

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL} htmlFor="dep-bus">Bus</label>
        {buses.length === 0 ? (
          <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            You have no approved buses yet. <Link to={ROUTES.OPERATOR_ADD_BUS} className="font-bold underline">Add a bus</Link> and wait for admin approval.
          </p>
        ) : (
          <select id="dep-bus" value={value.busId} disabled={lockBus} onChange={(e) => onChange({ ...value, busId: e.target.value })} className={INPUT}>
            <option value="">Choose a bus</option>
            {buses.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.vehicleNumber || b.busCode} · {prettyType(b.busType)} · {b.totalSeats} seats</option>)}
          </select>
        )}
        {bus && !lockBus && <p className="mt-1 text-xs text-slate-500">Only admin-approved buses can run departures.</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="rounded-xl border border-slate-200 p-3.5">
          <legend className="px-1 text-xs font-black text-slate-700">Leaves {value.depDate && value.depTime ? <span className="font-semibold text-slate-500">· {whenLabel(value.depDate, value.depTime)}</span> : null}</legend>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" aria-label="Departure date" min={todayIst()} value={value.depDate} onChange={(e) => setDeparture({ depDate: e.target.value })} className={INPUT} />
            <input type="time" aria-label="Departure time" value={value.depTime} onChange={(e) => setDeparture({ depTime: e.target.value })} className={INPUT} />
          </div>
        </fieldset>
        <fieldset className="rounded-xl border border-slate-200 p-3.5">
          <legend className="px-1 text-xs font-black text-slate-700">Arrives {value.arrDate && value.arrTime ? <span className="font-semibold text-slate-500">· {whenLabel(value.arrDate, value.arrTime)}</span> : null}</legend>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" aria-label="Arrival date" min={value.depDate || todayIst()} value={value.arrDate} onChange={(e) => setArrival({ arrDate: e.target.value })} className={INPUT} />
            <input type="time" aria-label="Arrival time" value={value.arrTime} onChange={(e) => setArrival({ arrTime: e.target.value })} className={INPUT} />
          </div>
        </fieldset>
      </div>
      <p className="-mt-2 text-xs text-slate-500">
        All times are India time (IST).
        {mins > 0 && <> Journey: <span className="font-bold text-slate-700">{minutesLabel(mins)}</span>.</>}
        {tripMinutes > 0 && !value.arrivalEdited && <> Arrival is worked out from your stops.</>}
      </p>

      <div>
        <p className={LABEL}>Runs</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How often this bus runs">
          {FREQUENCIES.map(([key, label]) => (
            <button key={key} type="button" role="radio" aria-checked={value.frequency === key} onClick={() => onChange({ ...value, frequency: key })}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold border transition-colors ${value.frequency === key ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-primary'}`}>
              {label}
            </button>
          ))}
        </div>
        {value.frequency !== 'ONCE' && <p className="mt-1.5 text-xs text-slate-500">The next departure is created automatically after each trip, with the same boarding points and policies.</p>}
      </div>
    </div>
  );
};

export default DepartureFields;
