import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { createBus, generateLayout, getBusSeats, markSeat } from '../../../api/busService';
import { getAmenities } from '../../../api/amenityService';
import { useBusWizard } from '../context/BusWizardContext';
import { ROUTES } from '../../../shared/constants/routes';
import { Card, EmptyState } from '../../../shared/components/console/ConsoleUI';
import CenterScreenLoader from '../../../shared/components/ui/CenterScreenLoader';
import BusWizardHeader from '../components/BusWizardHeader';
import { prettyType } from '../utils/operatorFormat';

const MARK_LABELS = { isLadiesOnly: 'Women only', isWindow: 'Window', isAisle: 'Aisle', isBlocked: 'Not for sale' };
const isSleeperType = (t) => String(t).includes('SLEEPER') && !String(t).includes('SEMI');

const BusReview = () => {
  const navigate = useNavigate();
  const { wizardData, updateWizard, resetWizard } = useBusWizard();
  const { busName, busCode, vehicleNumber, model, totalSeats, busType, amenityIds = [], seatMarks = {}, createdBusId } = wizardData;
  const [submitting, setSubmitting] = useState(false);
  const [amenities, setAmenities] = useState([]);

  useEffect(() => { getAmenities().then((a) => setAmenities(Array.isArray(a) ? a : [])).catch(() => {}); }, []);

  const sleeper = isSleeperType(busType);
  const seatCount = parseInt(totalSeats, 10) || 0;

  const submit = async () => {
    setSubmitting(true);
    try {
      // If a previous attempt created the bus but a later step failed, continue with that bus
      let busId = createdBusId;
      if (!busId) {
        const bus = await createBus({ name: busName, busCode, vehicleNumber, model, totalSeats: seatCount, busType, amenityIds });
        busId = bus.id;
        updateWizard({ createdBusId: busId });
      }
      const template = sleeper ? 'SLEEPER_2X1' : 'SEATER_2X2';
      await generateLayout(busId, template, sleeper ? Math.ceil(seatCount / 6) : Math.ceil(seatCount / 4));

      const marked = Object.keys(seatMarks);
      if (marked.length) {
        const data = await getBusSeats(busId);
        const all = [...(data.seats ?? []), ...(data.lowerDeck ?? []), ...(data.upperDeck ?? [])];
        const targets = all.filter((s) => seatMarks[s.seatNumber]);
        const results = await Promise.allSettled(targets.map((s) => markSeat(busId, s.id, seatMarks[s.seatNumber])));
        const failed = results.filter((r) => r.status === 'rejected').length + (marked.length - targets.length);
        if (failed) toast.warning(`${failed} seat mark${failed > 1 ? 's' : ''} couldn’t be saved — you can set them later from My buses.`);
      }

      resetWizard();
      toast.success('Bus submitted. TripGo will review it shortly.');
      navigate(ROUTES.OPERATOR_MY_BUSES);
    } catch (error) {
      const message = error.message || 'Couldn’t submit the bus. Please try again.';
      toast.error(/duplicate|already exists|unique/i.test(message) ? 'That bus code or number plate is already registered. Go back and change it.' : message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!busType || !seatCount) {
    return (
      <OperatorLayout activeItem="add-bus" title="Review">
        <Card>
          <EmptyState icon="directions_bus" title="Nothing to review yet" subtitle="Fill in the bus details first."
            action={<button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">Go to bus details</button>} />
        </Card>
      </OperatorLayout>
    );
  }

  const markRows = Object.entries(seatMarks);
  const amenityNames = amenityIds.map((id) => amenities.find((a) => a.id === id)).filter(Boolean).map((a) => a.description || prettyType(a.code));
  const blocked = markRows.filter(([, m]) => m.isBlocked).length;

  return (
    <OperatorLayout activeItem="add-bus" title="Review">
      {submitting && <CenterScreenLoader label="Submitting your bus…" description="Creating the bus and its seat layout." />}
      <div className="space-y-5">
        <BusWizardHeader step={2} title="Review & submit" subtitle="Check everything — the type and seat count can’t be changed later." onBack={() => navigate(ROUTES.OPERATOR_BUS_LAYOUT)} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-5">
            <Card title="Bus details" icon="directions_bus" action={<button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className="text-xs font-bold text-primary hover:text-[#FF8A65]">Edit</button>}>
              <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
                {[['Bus name', busName], ['Bus code', busCode], ['Number plate', vehicleNumber], ['Model', model], ['Type', prettyType(busType)], [sleeper ? 'Berths' : 'Seats', `${seatCount}${blocked ? ` (${seatCount - blocked} for sale)` : ''}`]].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k}</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-900">{v || '—'}</dd>
                  </div>
                ))}
              </dl>
              <div className="border-t border-slate-100 px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Amenities</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {amenityNames.length ? amenityNames.map((n) => (
                    <span key={n} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"><span className="material-symbols-outlined text-[14px] text-green-600">check</span>{n}</span>
                  )) : <span className="text-sm text-slate-500">None selected</span>}
                </div>
              </div>
            </Card>

            <Card title="Seat marks" icon="event_seat" action={<button onClick={() => navigate(ROUTES.OPERATOR_BUS_LAYOUT)} className="text-xs font-bold text-primary hover:text-[#FF8A65]">Edit</button>}>
              <div className="p-5">
                {markRows.length === 0 ? <p className="text-sm text-slate-500">No seats marked — every seat will be on sale.</p> : (
                  <div className="flex flex-wrap gap-1.5">
                    {markRows.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([n, m]) => (
                      <span key={n} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs">
                        <b className="text-slate-900">{n}</b> <span className="text-slate-500">{Object.keys(MARK_LABELS).filter((k) => m[k]).map((k) => MARK_LABELS[k]).join(', ')}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <div className="flex justify-between gap-2">
              <button onClick={() => navigate(ROUTES.OPERATOR_BUS_LAYOUT)} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Back</button>
              <button onClick={submit} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">send</span>Submit for approval
              </button>
            </div>
          </div>

          <aside className="rounded-2xl bg-[#FFF7F2] border border-[#FDBA74]/40 p-5 lg:sticky lg:top-4">
            <p className="flex items-center gap-1.5 text-sm font-black text-slate-900"><span className="material-symbols-outlined text-[18px] text-orange-600">schedule</span>What happens next</p>
            <ol className="mt-3 space-y-3 text-sm text-slate-600">
              {['TripGo checks the bus details — usually within a day.', 'You get an email and a notification when it’s approved.', 'Then add it to a route schedule and it goes on sale.'].map((t, i) => (
                <li key={t} className="flex gap-2.5">
                  <span className="w-5 h-5 flex-shrink-0 rounded-full bg-white text-[11px] font-black text-orange-700 flex items-center justify-center">{i + 1}</span>{t}
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default BusReview;
