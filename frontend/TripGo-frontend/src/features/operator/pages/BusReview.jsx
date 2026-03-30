import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { createBus } from '../../../api/busService';
import { getAmenities } from '../../../api/amenityService';
import { useBusWizard } from '../context/BusWizardContext';
import { toast } from 'sonner';
import { ROUTES } from '../../../shared/constants/routes';
import './OperatorDashboard.css';

const BusReview = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { wizardData, resetWizard } = useBusWizard();
  const { busName, busCode, vehicleNumber, model, totalSeats, busType, amenityIds, blockedSeats } = wizardData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amenitiesList, setAmenitiesList] = useState([]);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  useEffect(() => {
    getAmenities().then(setAmenitiesList).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createBus({ name: busName, busCode, vehicleNumber, model, totalSeats: parseInt(totalSeats), busType, amenityIds: amenityIds || [] });
      resetWizard();
      toast.success('Bus added successfully!');
      navigate(ROUTES.OPERATOR_MY_BUSES);
    } catch (error) {
      const message = error.message || 'Failed to add bus. Please try again.';
      toast.error(message.includes('duplicate') || message.includes('already exists') ? 'Bus code already exists. Please use a different code.' : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OperatorLayout activeItem="add-bus" title="Review & Submit">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className="hover:text-primary transition-colors">Add Bus</button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <button onClick={() => navigate(ROUTES.OPERATOR_BUS_LAYOUT)} className="hover:text-primary transition-colors">Seat Layout</button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-200 dark:text-slate-100 font-medium">Review</span>
          </div>
          <h2 className="text-3xl font-extrabold">Review Bus Details</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Please review all information before submitting</p>
        </header>

        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary -translate-y-1/2 z-0"></div>
            {['Bus Info', 'Layout', 'Review'].map((label, i) => (
              <div key={label} className="relative z-10 flex flex-col items-center">
                <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm ring-4 ring-white dark:ring-op-bg">
                  {i < 2 ? '✓' : i + 1}
                </div>
                <span className="mt-2 text-xs font-bold text-primary uppercase tracking-widest">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-op-card rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 lg:p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">directions_bus</span>
                  Bus Information
                </h3>
                <div className="space-y-3">
                  {[
                    ['Bus Name', busName],
                    ['Bus Code', busCode],
                    ['Vehicle Number', vehicleNumber],
                    ['Model', model],
                    ['Bus Type', busType?.replace(/_/g, ' ')],
                    ['Total Seats', totalSeats],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">star</span>
                  Amenities & Seats
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-2">Selected Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {amenityIds?.length > 0 ? amenityIds.map(id => {
                        const amenity = amenitiesList.find(a => a.id === id);
                        return <span key={id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">{amenity?.code || `Amenity ${id}`}</span>;
                      }) : <span className="text-slate-500">No amenities selected</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-2">Blocked Seats</p>
                    <div className="flex flex-wrap gap-2">
                      {blockedSeats?.length > 0 ? blockedSeats.map(seat => (
                        <span key={seat} className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-sm font-medium">{seat}</span>
                      )) : <span className="text-slate-500">No seats blocked</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-black/30 p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button onClick={() => navigate(ROUTES.OPERATOR_BUS_LAYOUT)} className="px-6 py-2.5 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-colors">
              Back
            </button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? 'Submitting...' : 'Submit Bus'}
              <span className="material-symbols-outlined text-sm">check_circle</span>
            </button>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default BusReview;
