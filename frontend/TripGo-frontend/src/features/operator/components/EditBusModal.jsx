const BUS_TYPES = [
  { group: 'Seater Buses', options: [['SEATER', 'Seater'], ['SEMI_SLEEPER', 'Semi Sleeper'], ['PUSH_BACK', 'Push Back']] },
  { group: 'Sleeper Buses', options: [['SLEEPER', 'Sleeper'], ['AC_SLEEPER', 'AC Sleeper']] },
  { group: 'Premium Buses', options: [['VOLVO_AC', 'Volvo AC'], ['VOLVO_MULTI_AXLE', 'Volvo Multi Axle'], ['SCANIA_MULTI_AXLE', 'Scania Multi Axle']] },
];

const EditBusModal = ({ formData, errors, amenities, updating, onChange, onAmenityToggle, onSave, onCancel }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
    <div className="bg-white dark:bg-op-card rounded-xl p-6 max-w-2xl w-full my-8">
      <h3 className="text-xl font-bold mb-6">Edit Bus</h3>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {[
          { field: 'name', label: 'Bus Name', type: 'text' },
          { field: 'busCode', label: 'Bus Code', type: 'text' },
          { field: 'vehicleNumber', label: 'Vehicle Number', type: 'text' },
          { field: 'model', label: 'Model', type: 'text' },
          { field: 'totalSeats', label: 'Total Seats', type: 'number' },
        ].map(({ field, label, type }) => (
          <div key={field}>
            <label className="block text-sm font-medium mb-2">{label}</label>
            <input
              type={type}
              value={formData[field] || ''}
              onChange={(e) => onChange(field, type === 'number' ? parseInt(e.target.value) : e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 ${errors[field] ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
            />
            {errors[field] && <p className="text-red-500 text-xs mt-1">{errors[field]}</p>}
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium mb-2">Bus Type</label>
          <select
            value={formData.busType || ''}
            onChange={(e) => onChange('busType', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 ${errors.busType ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
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
          {errors.busType && <p className="text-red-500 text-xs mt-1">{errors.busType}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Amenities</label>
          <div className="grid grid-cols-2 gap-2">
            {amenities.map((amenity) => (
              <label key={amenity.id} className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={formData.amenityIds?.includes(amenity.id)}
                  onChange={() => onAmenityToggle(amenity.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{amenity.code}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onCancel} disabled={updating} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          Cancel
        </button>
        <button onClick={onSave} disabled={updating} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
          {updating ? 'Updating...' : 'Update Bus'}
        </button>
      </div>
    </div>
  </div>
);

export default EditBusModal;
