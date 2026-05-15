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

const STEPS = [
  { label: 'Bus Info' },
  { label: 'Seat Layout' },
  { label: 'Review' },
];

const CHECKLIST = [
  { icon: 'badge',        text: 'Bus name & unique code' },
  { icon: 'pin',          text: 'Vehicle registration number' },
  { icon: 'build',        text: 'Model & manufacturer' },
  { icon: 'event_seat',   text: 'Total seat capacity' },
  { icon: 'category',     text: 'Bus type (AC / Sleeper etc.)' },
  { icon: 'wifi',         text: 'Available amenities list' },
];

const WIZARD_STEPS = [
  { step: 1, label: 'Bus Info',     desc: 'Name, code, type & amenities',  icon: 'directions_bus', active: true  },
  { step: 2, label: 'Seat Layout',  desc: 'Configure rows and seat grid',   icon: 'grid_view',      active: false },
  { step: 3, label: 'Review',       desc: 'Confirm and submit your bus',    icon: 'fact_check',     active: false },
];

const TIPS = [
  { text: 'Bus code must be unique across your fleet — use a short identifier like "MH01-BUS".' },
  { text: 'Seat layout is configured in the next step. You can customise upper and lower berths.' },
  { text: 'Amenities are shown to passengers during booking — select all that apply.' },
];

const inputCls = (hasError) =>
  `w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-sm text-slate-900 outline-none border transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046]/50 ${hasError ? 'border-red-400' : 'border-slate-200'}`;

const Field = ({ label, icon, error, children, required }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">{icon}</span>
      {children}
    </div>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

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

  const toggleAmenity = (id) =>
    setSelectedAmenities(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

  const onSubmit = (data) => {
    setSubmitting(true);
    updateWizard({ ...data, amenityIds: selectedAmenities });
    navigate(ROUTES.OPERATOR_BUS_LAYOUT);
  };

  return (
    <OperatorLayout activeItem="add-bus" title="Add Bus">
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.OPERATOR_MY_BUSES)}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900">Add New Bus</h1>
            <p className="text-xs text-slate-500">Register your bus to start creating schedules</p>
          </div>
        </div>

        {/* Stepper — full width */}
        <div className="rounded-xl bg-white border border-slate-200 px-5 py-3.5">
          <div className="flex items-center">
            {STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                    i === 0 ? 'bg-[#002046] text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {i + 1}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:block ${i === 0 ? 'text-[#002046]' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-px mx-3 bg-slate-200" />}
              </div>
            ))}
          </div>
        </div>

        {/* Two-column: form + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,560px)_1fr] gap-5 items-start">

          {/* ── LEFT: Form ── */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">

              {/* Bus Identity */}
              <div className="px-6 py-5 border-b border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Bus Identity</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Field label="Bus Name" icon="directions_bus" error={errors.busName?.message} required>
                      <input {...register('busName')} placeholder="Enter bus name" className={inputCls(!!errors.busName)} />
                    </Field>
                  </div>
                  <Field label="Bus Code" icon="tag" error={errors.busCode?.message} required>
                    <input {...register('busCode')} placeholder="Enter bus code" className={inputCls(!!errors.busCode)} />
                  </Field>
                  <Field label="Vehicle Number" icon="pin" error={errors.vehicleNumber?.message} required>
                    <input {...register('vehicleNumber')} placeholder="Enter vehicle number" className={inputCls(!!errors.vehicleNumber)} />
                  </Field>
                </div>
              </div>

              {/* Specifications */}
              <div className="px-6 py-5 border-b border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Specifications</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Model" icon="build" error={errors.model?.message} required>
                    <input {...register('model')} placeholder="Enter bus model" className={inputCls(!!errors.model)} />
                  </Field>
                  <Field label="Total Seats" icon="event_seat" error={errors.totalSeats?.message} required>
                    <input {...register('totalSeats')} type="number" min={1} placeholder="Enter total seats" className={inputCls(!!errors.totalSeats)} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Bus Type" icon="category" error={errors.busType?.message} required>
                      <select {...register('busType')} className={`${inputCls(!!errors.busType)} appearance-none`}>
                        <option value="">Select bus type</option>
                        {BUS_TYPE_GROUPS.map(({ label, options }) => (
                          <optgroup key={label} label={label}>
                            {options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">expand_more</span>
                    </Field>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Amenities</p>
                  {selectedAmenities.length > 0 && (
                    <span className="text-[10px] font-bold text-[#002046] bg-[#002046]/8 px-2 py-0.5 rounded-full">
                      {selectedAmenities.length} selected
                    </span>
                  )}
                </div>
                {loadingAmenities ? (
                  <div className="flex items-center gap-2 py-4 text-slate-400 text-sm">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-[#002046] animate-spin" />
                    Loading amenities...
                  </div>
                ) : amenities.length === 0 ? (
                  <p className="text-slate-400 text-sm py-2">No amenities available</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {amenities.map(amenity => {
                      const selected = selectedAmenities.includes(amenity.id);
                      return (
                        <button key={amenity.id} type="button" onClick={() => toggleAmenity(amenity.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            selected
                              ? 'bg-[#002046] text-white border-[#002046]'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#002046]/40'
                          }`}>
                          <span className="material-symbols-outlined text-sm">{AMENITY_ICONS[amenity.code] || 'check_circle'}</span>
                          {amenity.description || amenity.code}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.OPERATOR_MY_BUSES)}
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-lg bg-[#002046] text-white font-bold text-sm flex items-center gap-2 hover:bg-[#003a80] transition-colors shadow-sm disabled:opacity-60"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving...</>
                  ) : (
                    <>Next: Seat Layout<span className="material-symbols-outlined text-base">arrow_forward</span></>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* ── RIGHT: Sidebar ── */}
          <div className="hidden lg:block">
          <div className="flex flex-col gap-4 sticky top-6">

            {/* Top row: Registration Steps + Quick Tips side by side */}
            <div className="grid grid-cols-2 gap-4 items-start">

              {/* Steps overview */}
              <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registration Steps</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {[
                    { step: 1, label: 'Bus Info',    desc: 'Name, code, type & amenities', icon: 'directions_bus', active: true  },
                    { step: 2, label: 'Seat Layout', desc: 'Configure rows & seat grid',   icon: 'grid_view',      active: false },
                    { step: 3, label: 'Review',      desc: 'Confirm and submit your bus',  icon: 'fact_check',     active: false },
                  ].map(({ step, label, desc, icon, active }) => (
                    <div key={step} className={`flex items-start gap-3 px-4 py-3 ${active ? 'bg-[#002046]/[0.02]' : 'opacity-50'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black ${active ? 'bg-[#002046] text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {step}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-bold ${active ? 'text-[#002046]' : 'text-slate-500'}`}>{label}</p>
                          {active && <span className="text-[9px] font-bold text-[#002046] bg-[#002046]/10 px-1.5 py-0.5 rounded-full">Now</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 text-base flex-shrink-0">{icon}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Tips */}
              <div className="rounded-xl bg-amber-50 border border-amber-100 overflow-hidden">
                <div className="px-4 py-3.5 border-b border-amber-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-base">lightbulb</span>
                  <p className="text-xs font-black text-amber-800">Quick Tips</p>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {TIPS.map(({ text }) => (
                    <div key={text} className="flex items-start gap-2">
                      <span className="text-amber-400 text-xs mt-0.5 flex-shrink-0">•</span>
                      <p className="text-[11px] text-amber-700 leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* What you'll need — full width below */}
            <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-4 text-white shadow-sm relative overflow-hidden">
              <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
              <p className="text-[9px] font-semibold opacity-60 uppercase tracking-wider mb-3">What you'll need</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {CHECKLIST.map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-white/60 text-sm flex-shrink-0">{icon}</span>
                    <span className="text-[11px] font-medium text-white/80">{text}</span>
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

export default AddBus;
