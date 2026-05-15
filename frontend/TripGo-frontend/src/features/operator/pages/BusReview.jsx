import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { createBus, generateLayout, getBusSeats, markSeat } from '../../../api/busService';
import { getAmenities } from '../../../api/amenityService';
import { useBusWizard } from '../context/BusWizardContext';
import { toast } from 'sonner';
import { ROUTES } from '../../../shared/constants/routes';
import CenterScreenLoader from '../../../shared/components/ui/CenterScreenLoader';

const MARK_LABELS = { isBlocked: 'Blocked', isLadiesOnly: 'Ladies Only', isWindow: 'Window', isAisle: 'Aisle' };
const MARK_COLORS = {
  isBlocked:    'bg-slate-100 text-slate-600 border-slate-300',
  isLadiesOnly: 'bg-pink-50 text-pink-600 border-pink-300',
  isWindow:     'bg-blue-50 text-blue-600 border-blue-300',
  isAisle:      'bg-teal-50 text-teal-600 border-teal-300',
};

const STEPS = ['Bus Info', 'Seat Layout', 'Review'];

const BusReview = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { wizardData, resetWizard } = useBusWizard();
  const { busName, busCode, vehicleNumber, model, totalSeats, busType, amenityIds, seatMarks } = wizardData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amenitiesList, setAmenitiesList] = useState([]);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  useEffect(() => {
    getAmenities().then(setAmenitiesList).catch(() => {});
  }, []);

  const getLayoutTemplate = (type) => {
    if (type?.includes('SLEEPER') && !type?.includes('SEMI')) return 'SLEEPER_2X1';
    return 'SEATER_2X2';
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const seats_count = parseInt(totalSeats);
      const bus = await createBus({ name: busName, busCode, vehicleNumber, model, totalSeats: seats_count, busType, amenityIds: amenityIds || [] });

      const template = getLayoutTemplate(busType);
      const rows = template === 'SLEEPER_2X1' ? Math.ceil(seats_count / 6) : Math.ceil(seats_count / 4);
      await generateLayout(bus.id, template, rows);

      if (seatMarks && Object.keys(seatMarks).length > 0) {
        const seatsData = await getBusSeats(bus.id);
        const combined = [
          ...(seatsData.seats ?? []),
          ...(seatsData.lowerDeck ?? []),
          ...(seatsData.upperDeck ?? []),
        ];
        const toMark = combined.filter(s => seatMarks[s.seatNumber]);
        await Promise.allSettled(toMark.map(s => markSeat(bus.id, s.id, seatMarks[s.seatNumber])));
      }

      resetWizard();
      toast.success('Bus added and sent for admin approval.');
      navigate(ROUTES.OPERATOR_MY_BUSES);
    } catch (error) {
      const message = error.message || 'Failed to add bus. Please try again.';
      toast.error(
        message.includes('duplicate key') || message.includes('duplicate') || message.includes('already exists') || message.includes('unique constraint')
          ? 'Bus code already exists. Please go back and use a different bus code.'
          : message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OperatorLayout activeItem="add-bus" title="Review & Submit">
      {isSubmitting && (
        <CenterScreenLoader
          label="Processing your bus submission..."
          description="Please wait while we create the bus and prepare the seat layout."
        />
      )}
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(ROUTES.OPERATOR_BUS_LAYOUT)}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900">Review & Submit</h1>
            <p className="text-xs text-slate-500 mt-0.5">Confirm your bus details before submitting</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="rounded-xl bg-white border border-slate-200 px-5 py-3.5">
          <div className="flex items-center">
            {STEPS.map((label, i) => {
              const done = i < 2, active = i === 2;
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${done ? 'bg-emerald-500 text-white' : active ? 'bg-[#002046] text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {done ? <span className="material-symbols-outlined text-xs">check</span> : i + 1}
                    </div>
                    <span className={`text-xs font-semibold hidden sm:block ${done ? 'text-emerald-600' : active ? 'text-[#002046]' : 'text-slate-400'}`}>{label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className="flex-1 h-px mx-3 bg-slate-200" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Two-column: review card + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,560px)_1fr] gap-5 items-start">

          {/* LEFT: Review card */}
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">

            {/* Navy hero header */}
            <div className="bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-5 pt-5 pb-6 relative">
              <div className="absolute -bottom-3 -right-3 text-7xl opacity-[0.06] select-none pointer-events-none">★</div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white text-2xl">directions_bus</span>
                </div>
                <div className="min-w-0 flex-1 pr-2">
                  <h2 className="text-lg font-black text-white truncate">{busName}</h2>
                  <p className="text-white/50 text-xs mt-0.5 font-medium">{busCode} · {vehicleNumber}</p>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-400/20 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Ready to Submit
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-white/10 text-white/70">
                  {busType?.replace(/_/g, ' ')}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-white/10 text-white/70">
                  <span className="material-symbols-outlined text-xs">event_seat</span>
                  {totalSeats} seats
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Details</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: 'precision_manufacturing', label: 'Model',       value: model },
                  { icon: 'event_seat',              label: 'Total Seats', value: totalSeats },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 ring-1 ring-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-white ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-slate-500 text-sm">{icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{value || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {amenityIds?.length > 0
                  ? amenityIds.map(id => {
                      const amenity = amenitiesList.find(a => a.id === id);
                      return (
                        <span key={id} className="flex items-center gap-1.5 rounded-xl bg-[#002046]/[0.08] text-[#002046] px-3 py-1.5 text-xs font-semibold">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          {amenity?.code || id}
                        </span>
                      );
                    })
                  : <span className="text-slate-400 text-sm">No amenities selected</span>}
              </div>
            </div>

            {/* Seat Marks */}
            {seatMarks && Object.keys(seatMarks).length > 0 && (
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Seat Marks ({Object.keys(seatMarks).length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(seatMarks).map(([num, marks]) => {
                    const flags = ['isBlocked', 'isLadiesOnly', 'isWindow', 'isAisle'].filter(k => marks[k]);
                    const firstFlag = flags[0];
                    return (
                      <span
                        key={num}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${firstFlag ? MARK_COLORS[firstFlag] : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                      >
                        {num}: {flags.map(f => MARK_LABELS[f]).join(', ')}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-4 bg-slate-50/60 flex items-center justify-between gap-3">
              <button
                onClick={() => navigate(ROUTES.OPERATOR_BUS_LAYOUT)}
                className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-lg bg-[#002046] text-white font-bold text-sm flex items-center gap-2 hover:bg-[#003a80] transition-colors shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                Confirm & Submit
              </button>
            </div>
          </div>

          {/* RIGHT: Sidebar */}
          <div className="hidden lg:block">
            <div className="flex flex-col gap-4 sticky top-6">

              {/* Registration Steps */}
              <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registration Steps</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {[
                    { step: 1, label: 'Bus Info',    desc: 'Name, code, type & amenities', icon: 'directions_bus', state: 'done'   },
                    { step: 2, label: 'Seat Layout', desc: 'Configure rows & seat grid',   icon: 'grid_view',      state: 'done'   },
                    { step: 3, label: 'Review',      desc: 'Confirm and submit your bus',  icon: 'fact_check',     state: 'active' },
                  ].map(({ step, label, desc, icon, state }) => (
                    <div key={step} className={`flex items-start gap-2.5 px-4 py-3 ${state === 'active' ? 'bg-[#002046]/[0.02]' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black ${
                        state === 'done' ? 'bg-emerald-500 text-white' : state === 'active' ? 'bg-[#002046] text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {state === 'done' ? <span className="material-symbols-outlined text-xs">check</span> : step}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-[11px] font-bold ${state === 'active' ? 'text-[#002046]' : state === 'done' ? 'text-emerald-600' : 'text-slate-500'}`}>{label}</p>
                          {state === 'active' && <span className="text-[9px] font-bold text-[#002046] bg-[#002046]/10 px-1.5 py-0.5 rounded-full">Now</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 text-sm flex-shrink-0">{icon}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What happens next */}
              <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-4 text-white shadow-sm relative overflow-hidden">
                <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
                <p className="text-[9px] font-semibold opacity-60 uppercase tracking-wider mb-3">What happens next?</p>
                <div className="space-y-3">
                  {[
                    'Your bus will be submitted for admin approval.',
                    'Once approved, it will appear in route assignments.',
                    "You'll be notified when your bus goes live.",
                  ].map(tip => (
                    <div key={tip} className="flex items-start gap-2">
                      <span className="text-white/40 text-xs mt-0.5 flex-shrink-0">•</span>
                      <p className="text-[11px] text-white/70 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </OperatorLayout>
  );
};

export default BusReview;
