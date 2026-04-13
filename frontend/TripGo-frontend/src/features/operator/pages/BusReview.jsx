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
import './OperatorDashboard.css';

const BusReview = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { wizardData, resetWizard } = useBusWizard();
  const { busName, busCode, vehicleNumber, model, totalSeats, busType, amenityIds, blockedSeats, seatMarks } = wizardData;
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

      // Generate seat layout in DB
      const template = getLayoutTemplate(busType);
      const rows = template === 'SLEEPER_2X1' ? Math.ceil(seats_count / 6) : Math.ceil(seats_count / 4);
      await generateLayout(bus.id, template, rows);

      // Apply seat marks if any were configured
      console.log('[BusReview] seatMarks from wizard:', seatMarks);
      if (seatMarks && Object.keys(seatMarks).length > 0) {
        const seatsData = await getBusSeats(bus.id);
        console.log('[BusReview] getBusSeats response:', seatsData);
        const combined = [
          ...(seatsData.seats ?? []),
          ...(seatsData.lowerDeck ?? []),
          ...(seatsData.upperDeck ?? []),
        ];
        console.log('[BusReview] combined seats:', combined.map(s => s.seatNumber));
        console.log('[BusReview] seatMarks keys:', Object.keys(seatMarks));
        const toMark = combined.filter(s => seatMarks[s.seatNumber]);
        console.log('[BusReview] seats to mark:', toMark.map(s => ({ seatNumber: s.seatNumber, id: s.id, marks: seatMarks[s.seatNumber] })));
        const results = await Promise.allSettled(
          toMark.map(s => markSeat(bus.id, s.id, seatMarks[s.seatNumber]))
        );
        console.log('[BusReview] markSeat results:', results);
      }

      resetWizard();
      toast.success('Bus added and sent for admin approval.');
      navigate(ROUTES.OPERATOR_MY_BUSES);
    } catch (error) {
      const message = error.message || 'Failed to add bus. Please try again.';
      toast.error(message.includes('duplicate key') || message.includes('duplicate') || message.includes('already exists') || message.includes('unique constraint')
        ? 'Bus code already exists. Please go back and use a different bus code.'
        : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OperatorLayout activeItem="add-bus" title="Review & Submit">
      {isSubmitting ? (
        <CenterScreenLoader
          label="Processing your bus submission..."
          description="Please wait while we create the bus and prepare the seat layout."
        />
      ) : null}
      <div className="max-w-2xl mx-auto">

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary -translate-y-1/2 z-0"></div>
            {['Bus Info', 'Layout', 'Review'].map((label, i) => (
              <div key={label} className="relative z-10 flex flex-col items-center">
                <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs ring-4 ring-white dark:ring-op-bg">
                  {i < 2 ? '✓' : '3'}
                </div>
                <span className="mt-1 text-[10px] font-bold text-primary uppercase tracking-widest">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bus Header Card */}
        <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-3">
          <div className="bg-primary/5 dark:bg-primary/10 px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">directions_bus</span>
              <div>
                <p className="font-extrabold text-lg leading-tight">{busName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{busCode} · {vehicleNumber}</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold">
              {busType?.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-800">
            {[
              { icon: 'precision_manufacturing', label: 'Model',       value: model },
              { icon: 'event_seat',              label: 'Total Seats', value: totalSeats },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-3">
                <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="font-bold text-sm">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 px-5 py-4 mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Amenities</p>
          <div className="flex flex-wrap gap-2">
            {amenityIds?.length > 0 ? amenityIds.map(id => {
              const amenity = amenitiesList.find(a => a.id === id);
              return (
                <span key={id} className="flex items-center gap-1 px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-semibold">
                  <span className="material-symbols-outlined text-sm">check</span>
                  {amenity?.code || id}
                </span>
              );
            }) : <span className="text-slate-400 text-sm">No amenities selected</span>}
          </div>
        </div>

        {/* Seat Marks */}
        {seatMarks && Object.keys(seatMarks).length > 0 && (
          <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 px-5 py-4 mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Seat Marks ({Object.keys(seatMarks).length})</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(seatMarks).map(([num, marks]) => {
                const flags = ['isBlocked','isLadiesOnly','isWindow','isAisle'].filter(k => marks[k]);
                return (
                  <span key={num} className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-bold">
                    {num}: {flags.map(f => f.replace('is','')).join(', ')}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button onClick={() => navigate(ROUTES.OPERATOR_BUS_LAYOUT)}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Back
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="flex-2 px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 text-black font-extrabold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Confirm & Submit
          </button>
        </div>

      </div>
    </OperatorLayout>
  );
};

export default BusReview;
