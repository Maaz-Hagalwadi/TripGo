const BUS_TYPES = [
  { group: 'Seater Buses', options: [['SEATER', 'Seater'], ['SEMI_SLEEPER', 'Semi Sleeper'], ['PUSH_BACK', 'Push Back']] },
  { group: 'Sleeper Buses', options: [['SLEEPER', 'Sleeper'], ['AC_SLEEPER', 'AC Sleeper']] },
  { group: 'Premium Buses', options: [['VOLVO_AC', 'Volvo AC'], ['VOLVO_MULTI_AXLE', 'Volvo Multi Axle'], ['SCANIA_MULTI_AXLE', 'Scania Multi Axle']] },
];

const Field = ({ icon, label, field, type = 'text', value, error, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
    <div className="relative">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">{icon}</span>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(field, type === 'number' ? parseInt(e.target.value) : e.target.value)}
        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all ${
          error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
        }`}
      />
    </div>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const EditBusModal = ({ formData, errors, amenities, updating, onChange, onAmenityToggle, onSave, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-op-card rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-lg">directions_bus</span>
          </div>
          <div>
            <h3 className="font-extrabold text-base">Edit Bus</h3>
            <p className="text-xs text-slate-400">{formData.name}</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined text-slate-400">close</span>
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-4 space-y-5 max-h-[65vh] overflow-y-auto">

        {/* Basic Info */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Basic Info</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field icon="directions_bus" label="Bus Name"       field="name"          value={formData.name}          error={errors.name}          onChange={onChange} />
            </div>
            <Field icon="tag"             label="Bus Code"        field="busCode"       value={formData.busCode}       error={errors.busCode}       onChange={onChange} />
            <Field icon="pin"             label="Vehicle Number"  field="vehicleNumber" value={formData.vehicleNumber} error={errors.vehicleNumber} onChange={onChange} />
            <Field icon="build"           label="Model"           field="model"         value={formData.model}         error={errors.model}         onChange={onChange} />
            <Field icon="event_seat"      label="Total Seats"     field="totalSeats"    value={formData.totalSeats}    error={errors.totalSeats}    onChange={onChange} type="number" />
          </div>
        </div>

        {/* Bus Type */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Bus Type</p>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">category</span>
            <select
              value={formData.busType || ''}
              onChange={e => onChange('busType', e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all appearance-none ${
                errors.busType ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <option value="">Select Bus Type</option>
              {BUS_TYPES.map(({ group, options }) => (
                <optgroup key={group} label={group}>
                  {options.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {errors.busType && <p className="text-red-500 text-xs mt-1">{errors.busType}</p>}
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Amenities</p>
            <div className="flex flex-wrap gap-2">
              {amenities.map(amenity => {
                const selected = formData.amenityIds?.includes(amenity.id);
                return (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => onAmenityToggle(amenity.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                      selected
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/30'
                    }`}
                  >
                    {selected && <span className="material-symbols-outlined text-sm">check</span>}
                    {amenity.code}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
        <button onClick={onCancel} disabled={updating}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
          Cancel
        </button>
        <button onClick={onSave} disabled={updating}
          className="flex-1 py-2.5 rounded-xl bg-primary text-black text-sm font-extrabold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {updating
            ? <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> Updating...</>
            : <><span className="material-symbols-outlined text-sm">check_circle</span> Save Changes</>}
        </button>
      </div>
    </div>
  </div>
);

export default EditBusModal;
