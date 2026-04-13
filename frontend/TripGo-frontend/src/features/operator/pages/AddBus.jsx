import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getAmenities } from '../../../api/amenityService';
import { useBusWizard } from '../context/BusWizardContext';
import { addBusSchema } from '../../../shared/schemas';
import { ROUTES } from '../../../shared/constants/routes';
import CenterScreenLoader from '../../../shared/components/ui/CenterScreenLoader';
import './OperatorDashboard.css';

const AMENITY_ICONS = {
  WIFI: 'wifi', AC: 'ac_unit', CHARGER: 'power', WATER: 'water_full', BLANKET: 'bed',
};

const BUS_TYPE_GROUPS = [
  { label: 'Seater Types', options: [['SEATER','Seater'],['SEMI_SLEEPER','Semi Sleeper'],['EXECUTIVE_SEATER','Executive Seater'],['LUXURY_SEATER','Luxury Seater']] },
  { label: 'Sleeper Types', options: [['SLEEPER','Sleeper'],['AC_SLEEPER','AC Sleeper'],['NON_AC_SLEEPER','Non-AC Sleeper'],['SEMI_SLEEPER_AC','Semi Sleeper AC'],['SEMI_SLEEPER_NON_AC','Semi Sleeper Non-AC']] },
  { label: 'Multi-Axle', options: [['MULTI_AXLE_SEMI_SLEEPER','Multi-Axle Semi Sleeper'],['MULTI_AXLE_SLEEPER','Multi-Axle Sleeper'],['MULTI_AXLE_AC_SLEEPER','Multi-Axle AC Sleeper']] },
  { label: 'Volvo Premium', options: [['VOLVO_AC','Volvo AC'],['VOLVO_MULTI_AXLE','Volvo Multi-Axle'],['VOLVO_SLEEPER','Volvo Sleeper'],['VOLVO_MULTI_AXLE_SLEEPER','Volvo Multi-Axle Sleeper']] },
  { label: 'Mercedes-Benz Premium', options: [['MERCEDES_BENZ_AC','Mercedes-Benz AC'],['MERCEDES_BENZ_SLEEPER','Mercedes-Benz Sleeper']] },
  { label: 'Special', options: [['ELECTRIC','Electric'],['MINI_BUS','Mini Bus'],['DELUXE','Deluxe'],['SUPER_DELUXE','Super Deluxe']] },
];

const AddBus = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { wizardData, updateWizard } = useBusWizard();
  const [amenities, setAmenities] = useState([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [selectedAmenities, setSelectedAmenities] = useState(wizardData.amenityIds || []);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(addBusSchema),
    defaultValues: {
      busName: wizardData.busName || '',
      busCode: wizardData.busCode || '',
      vehicleNumber: wizardData.vehicleNumber || '',
      model: wizardData.model || '',
      busType: wizardData.busType || '',
      totalSeats: wizardData.totalSeats || '',
    },
  });

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  useEffect(() => {
    getAmenities()
      .then(data => setAmenities(data || []))
      .catch(() => setAmenities([]))
      .finally(() => setLoadingAmenities(false));
  }, []);

  const toggleAmenity = (id) => {
    setSelectedAmenities(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const onSubmit = (data) => {
    setSubmitting(true);
    updateWizard({ ...data, amenityIds: selectedAmenities });
    navigate(ROUTES.OPERATOR_BUS_LAYOUT);
  };

  return (
    <OperatorLayout activeItem="add-bus" title="Add Bus">
      {submitting ? (
        <CenterScreenLoader
          label="Preparing your bus layout..."
          description="Please wait while we save your bus details."
        />
      ) : null}
      <div className="max-w-2xl mx-auto">

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
            <div className="absolute top-1/2 left-0 w-1/3 h-0.5 bg-primary -translate-y-1/2 z-0"></div>
            {[{ label: 'Bus Info', active: true }, { label: 'Layout' }, { label: 'Review' }].map(({ label, active }, i) => (
              <div key={label} className="relative z-10 flex flex-col items-center">
                <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-white dark:ring-op-bg ${
                  active ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-op-card border-2 border-slate-300 dark:border-slate-700 text-slate-500'
                }`}>{i + 1}</div>
                <span className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${active ? 'text-primary' : 'text-slate-500'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">

          {/* Basic Info Card */}
          <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-base">directions_bus</span>
              </div>
              <h3 className="font-bold text-sm">Bus Details</h3>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {/* Bus Name full width */}
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bus Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">directions_bus</span>
                  <input {...register('busName')} placeholder="Enter bus name" className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary bg-slate-50 dark:bg-slate-800 transition-all ${errors.busName ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`} />
                </div>
                {errors.busName && <p className="text-red-500 text-xs mt-1">{errors.busName.message}</p>}
              </div>

              {[{ name: 'busCode', label: 'Bus Code', icon: 'tag', placeholder: 'Enter bus code' },
                { name: 'vehicleNumber', label: 'Vehicle Number', icon: 'pin', placeholder: 'Enter vehicle number' },
                { name: 'model', label: 'Model', icon: 'build', placeholder: 'Enter model' },
                { name: 'totalSeats', label: 'Total Seats', icon: 'event_seat', placeholder: 'Enter total seats', type: 'number' },
              ].map(({ name, label, icon, placeholder, type }) => (
                <div key={name}>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">{icon}</span>
                    <input {...register(name)} type={type || 'text'} placeholder={placeholder} min={type === 'number' ? 1 : undefined}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary bg-slate-50 dark:bg-slate-800 transition-all ${errors[name] ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`} />
                  </div>
                  {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
                </div>
              ))}

              {/* Bus Type full width */}
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bus Type</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">category</span>
                  <select {...register('busType')} className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary bg-slate-50 dark:bg-slate-800 appearance-none transition-all ${errors.busType ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}>
                    <option value="">Select Bus Type</option>
                    {BUS_TYPE_GROUPS.map(({ label, options }) => (
                      <optgroup key={label} label={label}>
                        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                {errors.busType && <p className="text-red-500 text-xs mt-1">{errors.busType.message}</p>}
              </div>
            </div>
          </div>

          {/* Amenities Card */}
          <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-base">feature_search</span>
              </div>
              <h3 className="font-bold text-sm">Amenities</h3>
            </div>
            <div className="p-5">
              {loadingAmenities ? (
                <div className="flex justify-center py-6">
                  <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                </div>
              ) : amenities.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No amenities available</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {amenities.map(amenity => {
                    const selected = selectedAmenities.includes(amenity.id);
                    return (
                      <button key={amenity.id} type="button" onClick={() => toggleAmenity(amenity.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                          selected
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/30'
                        }`}>
                        <span className="material-symbols-outlined text-sm">{AMENITY_ICONS[amenity.code] || 'check_circle'}</span>
                        {amenity.description || amenity.code}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => navigate(ROUTES.OPERATOR_DASHBOARD)} disabled={submitting}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20">
              Next: Seat Layout
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

        </form>
      </div>
    </OperatorLayout>
  );
};

export default AddBus;
