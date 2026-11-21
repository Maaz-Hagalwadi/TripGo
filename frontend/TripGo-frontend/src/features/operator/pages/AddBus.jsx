import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getAmenities } from '../../../api/amenityService';
import { useBusWizard } from '../context/BusWizardContext';
import { addBusSchema } from '../../../shared/schemas';
import { ROUTES } from '../../../shared/constants/routes';
import { Card } from '../../../shared/components/console/ConsoleUI';
import BusWizardHeader from '../components/BusWizardHeader';
import { prettyType } from '../utils/operatorFormat';

const AMENITY_ICONS = { WIFI: 'wifi', AC: 'ac_unit', CHARGER: 'power', CHARGING_POINT: 'power', WATER: 'water_full', WATER_BOTTLE: 'water_full', BLANKET: 'bed', TV: 'tv', SNACKS: 'restaurant', READING_LIGHT: 'light' };

const BUS_TYPE_GROUPS = [
  { label: 'Seater', options: [['SEATER', 'Seater'], ['SEMI_SLEEPER', 'Semi sleeper'], ['EXECUTIVE_SEATER', 'Executive seater'], ['LUXURY_SEATER', 'Luxury seater']] },
  { label: 'Sleeper', options: [['SLEEPER', 'Sleeper'], ['AC_SLEEPER', 'AC sleeper'], ['NON_AC_SLEEPER', 'Non-AC sleeper'], ['SEMI_SLEEPER_AC', 'Semi sleeper AC'], ['SEMI_SLEEPER_NON_AC', 'Semi sleeper non-AC']] },
  { label: 'Multi-axle', options: [['MULTI_AXLE_SEMI_SLEEPER', 'Multi-axle semi sleeper'], ['MULTI_AXLE_SLEEPER', 'Multi-axle sleeper'], ['MULTI_AXLE_AC_SLEEPER', 'Multi-axle AC sleeper']] },
  { label: 'Volvo', options: [['VOLVO_AC', 'Volvo AC'], ['VOLVO_MULTI_AXLE', 'Volvo multi-axle'], ['VOLVO_SLEEPER', 'Volvo sleeper'], ['VOLVO_MULTI_AXLE_SLEEPER', 'Volvo multi-axle sleeper']] },
  { label: 'Mercedes-Benz', options: [['MERCEDES_BENZ_AC', 'Mercedes-Benz AC'], ['MERCEDES_BENZ_SLEEPER', 'Mercedes-Benz sleeper']] },
  { label: 'Other', options: [['ELECTRIC', 'Electric'], ['MINI_BUS', 'Mini bus'], ['DELUXE', 'Deluxe'], ['SUPER_DELUXE', 'Super deluxe']] },
];

const INPUT = (err) => `w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 transition-all ${
  err ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-primary/15'
}`;
const LABEL = 'mb-1.5 block text-xs font-bold text-slate-600';
const Err = ({ msg }) => (msg ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null);
const isSleeperType = (t) => String(t).includes('SLEEPER') && !String(t).includes('SEMI');

const AddBus = () => {
  const navigate = useNavigate();
  const { wizardData, updateWizard } = useBusWizard();
  const [amenities, setAmenities] = useState([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [selected, setSelected] = useState(wizardData.amenityIds || []);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(addBusSchema),
    defaultValues: {
      busName: wizardData.busName || '', busCode: wizardData.busCode || '', vehicleNumber: wizardData.vehicleNumber || '',
      model: wizardData.model || '', busType: wizardData.busType || '', totalSeats: wizardData.totalSeats || '',
    },
  });

  useEffect(() => {
    getAmenities().then((d) => setAmenities(Array.isArray(d) ? d : [])).catch(() => setAmenities([])).finally(() => setLoadingAmenities(false));
  }, []);

  const toggle = (id) => setSelected((p) => (p.includes(id) ? p.filter((a) => a !== id) : [...p, id]));
  const onSubmit = (data) => {
    // Changing type or seat count invalidates marks made on the old layout
    const layoutChanged = data.busType !== wizardData.busType || String(data.totalSeats) !== String(wizardData.totalSeats);
    updateWizard({ ...data, amenityIds: selected, ...(layoutChanged ? { seatMarks: {}, blockedSeats: [] } : {}) });
    navigate(ROUTES.OPERATOR_BUS_LAYOUT);
  };

  const preview = watch();
  const seats = Number(preview.totalSeats) || 0;
  const sleeper = isSleeperType(preview.busType);

  return (
    <OperatorLayout activeItem="add-bus" title="Add a bus">
      <div className="space-y-5">
        <BusWizardHeader step={0} title="Add a bus" subtitle="Tell travellers what they’ll ride in. TripGo approves new buses before they can be scheduled." onBack={() => navigate(ROUTES.OPERATOR_MY_BUSES)} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Card title="Identity" subtitle="How the bus appears to travellers and to TripGo" icon="badge">
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={LABEL} htmlFor="busName">Bus name</label>
                  <input id="busName" {...register('busName')} placeholder="e.g. Royal Express AC Sleeper" className={INPUT(errors.busName)} />
                  <Err msg={errors.busName?.message} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="busCode">Bus code <span className="font-normal text-slate-400">your internal ID</span></label>
                  <input id="busCode" {...register('busCode')} placeholder="e.g. RX-07" className={INPUT(errors.busCode)} />
                  <Err msg={errors.busCode?.message} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="vehicleNumber">Number plate</label>
                  <input id="vehicleNumber" {...register('vehicleNumber')} placeholder="KA 01 AB 1234" className={`${INPUT(errors.vehicleNumber)} uppercase`} />
                  <Err msg={errors.vehicleNumber?.message} />
                </div>
              </div>
            </Card>

            <Card title="Type & capacity" subtitle="Decides the seat layout in the next step" icon="airline_seat_recline_extra">
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={LABEL} htmlFor="busType">Bus type</label>
                  <select id="busType" {...register('busType')} className={INPUT(errors.busType)}>
                    <option value="">Choose a type</option>
                    {BUS_TYPE_GROUPS.map(({ label, options }) => (
                      <optgroup key={label} label={label}>
                        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <Err msg={errors.busType?.message} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="model">Model</label>
                  <input id="model" {...register('model')} placeholder="e.g. Volvo 9600" className={INPUT(errors.model)} />
                  <Err msg={errors.model?.message} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="totalSeats">{sleeper ? 'Berths' : 'Seats'} <span className="font-normal text-slate-400">10–60</span></label>
                  <input id="totalSeats" type="number" inputMode="numeric" min={10} max={60} {...register('totalSeats')} placeholder="40" className={INPUT(errors.totalSeats)} />
                  <Err msg={errors.totalSeats?.message} />
                </div>
                {seats >= 10 && preview.busType && (
                  <p className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
                    <span className="material-symbols-outlined text-[16px] text-[#FF8A65]">info</span>
                    {sleeper
                      ? `Layout: ${Math.floor(seats / 2)} lower and ${seats - Math.floor(seats / 2)} upper berths, 1 + 2 per row.`
                      : `Layout: ${Math.ceil(seats / 4)} rows of 2 + 2 seats.`}
                  </p>
                )}
              </div>
            </Card>

            <Card title="Amenities" subtitle="Shown to travellers on search results and when booking" icon="star" action={selected.length > 0 && <span className="text-xs font-bold text-orange-700">{selected.length} selected</span>}>
              <div className="p-5">
                {loadingAmenities ? <div className="h-10 rounded-xl bg-slate-100 animate-pulse" /> : amenities.length === 0 ? (
                  <p className="text-sm text-slate-500">No amenities are set up yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((a) => {
                      const on = selected.includes(a.id);
                      return (
                        <button key={a.id} type="button" onClick={() => toggle(a.id)} aria-pressed={on}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${on ? 'bg-primary border-primary text-white' : 'border-slate-200 text-slate-600 hover:border-[#FF8A65]'}`}>
                          <span className="material-symbols-outlined text-[16px]">{on ? 'check' : (AMENITY_ICONS[a.code] || 'add')}</span>
                          {a.description || prettyType(a.code)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => navigate(ROUTES.OPERATOR_MY_BUSES)} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C]">
                Next: seat layout<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-4">
            <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Preview</p>
              <p className="mt-2 text-lg font-black text-slate-900 truncate">{preview.busName || 'Your bus name'}</p>
              <p className="text-sm text-slate-500">{[preview.busType && prettyType(preview.busType), seats ? `${seats} ${sleeper ? 'berths' : 'seats'}` : null].filter(Boolean).join(' · ') || 'Type · seats'}</p>
              {selected.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {amenities.filter((a) => selected.includes(a.id)).map((a) => (
                    <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      <span className="material-symbols-outlined text-[13px] text-green-600">check</span>{a.description || prettyType(a.code)}
                    </span>
                  ))}
                </div>
              )}
            </section>
            <section className="rounded-2xl bg-[#FFF7F2] border border-[#FDBA74]/40 p-5">
              <p className="flex items-center gap-1.5 text-sm font-black text-slate-900"><span className="material-symbols-outlined text-[18px] text-orange-600">lightbulb</span>Good to know</p>
              <ul className="mt-2 space-y-2 text-xs text-slate-600">
                <li>Type and seat count can’t be changed after you submit — they define the seat layout.</li>
                <li>Mark ladies-only, window and blocked seats in the next step.</li>
                <li>Approval usually takes under a day; you’ll get an email when it’s done.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default AddBus;
