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

const FIELDS = [
  { name: 'busName', label: 'Bus Name', placeholder: 'Enter bus name', type: 'text' },
  { name: 'busCode', label: 'Bus Code', placeholder: 'Enter bus code', type: 'text' },
  { name: 'vehicleNumber', label: 'Vehicle Number', placeholder: 'Enter vehicle number', type: 'text' },
  { name: 'model', label: 'Model', placeholder: 'Enter model', type: 'text' },
  { name: 'totalSeats', label: 'Total Seats', placeholder: 'Enter total seats', type: 'number' },
];

const AddBus = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { wizardData, updateWizard } = useBusWizard();
  const [amenities, setAmenities] = useState([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [selectedAmenities, setSelectedAmenities] = useState(wizardData.amenityIds || []);

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
    updateWizard({ ...data, amenityIds: selectedAmenities });
    navigate(ROUTES.OPERATOR_BUS_LAYOUT);
  };

  const inputClass = (fieldName) =>
    `w-full px-4 py-3 rounded-lg border ${errors[fieldName] ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} bg-white dark:bg-black/40 text-slate-900 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`;

  return (
    <OperatorLayout activeItem="add-bus" title="Add Bus">
      <div className="max-w-4xl mx-auto">

        {/* Breadcrumb */}
        <header className="mb-8">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <button onClick={() => navigate(ROUTES.OPERATOR_DASHBOARD)} className="hover:text-primary transition-colors">Fleet Management</button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-200 dark:text-slate-100 font-medium">Add New Bus</span>
          </div>
          <h2 className="text-3xl font-extrabold">Add Bus Information</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Register a new vehicle by filling out the details below.</p>
        </header>

        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
            <div className="absolute top-1/2 left-0 w-1/3 h-0.5 bg-primary -translate-y-1/2 z-0 shadow-[0_0_10px_rgba(19,127,236,0.5)]"></div>
            {[{ label: 'Bus Info', active: true }, { label: 'Layout', active: false }, { label: 'Review', active: false }].map(({ label, active }, i) => (
              <div key={label} className="relative z-10 flex flex-col items-center">
                <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm ring-4 ring-white dark:ring-op-bg ${active ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-op-card border-2 border-slate-300 dark:border-slate-700 text-slate-500'}`}>{i + 1}</div>
                <span className={`mt-2 text-xs font-bold uppercase tracking-widest ${active ? 'text-primary' : 'text-slate-500'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white dark:bg-op-card rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 lg:p-8">

              {/* Basic Information */}
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-primary">info</span>
                  <h3 className="text-lg font-bold">Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {FIELDS.map(({ name, label, placeholder, type }) => (
                    <div key={name} className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
                      <input
                        {...register(name)}
                        type={type}
                        placeholder={placeholder}
                        min={type === 'number' ? 1 : undefined}
                        className={inputClass(name)}
                      />
                      {errors[name] && <p className="text-red-500 text-xs">{errors[name].message}</p>}
                    </div>
                  ))}

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bus Type</label>
                    <select {...register('busType')} className={inputClass('busType') + ' appearance-none cursor-pointer'}>
                      <option value="">Select Bus Type</option>
                      {BUS_TYPE_GROUPS.map(({ label, options }) => (
                        <optgroup key={label} label={label}>
                          {options.map(([value, text]) => (
                            <option key={value} value={value}>{text}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {errors.busType && <p className="text-red-500 text-xs">{errors.busType.message}</p>}
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-primary">feature_search</span>
                  <h3 className="text-lg font-bold">Amenities & Features</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {loadingAmenities ? (
                    <div className="col-span-full text-center py-8 text-slate-500">Loading amenities...</div>
                  ) : amenities.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-slate-500">No amenities available</div>
                  ) : amenities.map((amenity) => (
                    <div
                      key={amenity.id}
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedAmenities.includes(amenity.id)
                          ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
                          : 'border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-black/40 text-slate-600 dark:text-white hover:border-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className={`material-symbols-outlined mb-2 text-2xl transition-transform ${selectedAmenities.includes(amenity.id) ? 'scale-110' : ''}`}>
                        {AMENITY_ICONS[amenity.code] || 'check_circle'}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest text-center ${selectedAmenities.includes(amenity.id) ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>
                        {amenity.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 dark:bg-black/30 p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <button type="button" onClick={() => navigate(ROUTES.OPERATOR_DASHBOARD)} className="px-6 py-2.5 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
                Next: Generate Layout
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </form>

        {/* Tip */}
        <div className="mt-8 p-4 rounded-lg bg-primary/5 border border-primary/20 flex gap-4">
          <span className="material-symbols-outlined text-primary">lightbulb</span>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-bold text-primary">Tip:</span> Make sure the vehicle number matches your registration certificate. This will be used for automated compliance checks.
          </p>
        </div>

      </div>
    </OperatorLayout>
  );
};

export default AddBus;
