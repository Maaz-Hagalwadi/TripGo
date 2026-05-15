const getBusTypeLabel = (type) => String(type || '').replace(/_/g, ' ');

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 py-2 sm:py-3 border-b border-slate-100 last:border-0">
    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
      <span className="material-symbols-outlined text-slate-500 text-sm sm:text-base">{icon}</span>
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">{value || '—'}</p>
    </div>
  </div>
);

const BusDetailsModal = ({ bus, onClose, onEdit }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="w-full max-w-sm sm:max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/70 max-h-[85vh] flex flex-col overflow-hidden">

      {/* Navy hero header */}
      <div className="relative bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-5 pt-4 pb-5 sm:px-6 sm:pt-6 sm:pb-8 flex-shrink-0">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 sm:top-4 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-white text-sm">close</span>
        </button>

        {/* Bus icon + name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-white text-2xl sm:text-3xl">directions_bus</span>
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <h2 className="text-base sm:text-xl font-black text-white truncate">{bus.name}</h2>
            <p className="text-white/50 text-xs mt-0.5 font-medium">{bus.busCode}</p>
          </div>
        </div>

        {/* Status + seats quick stats */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-bold ${bus.active ? 'bg-emerald-400/20 text-emerald-300' : 'bg-amber-400/20 text-amber-300'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${bus.active ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {bus.active ? 'Active' : 'Pending'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-bold bg-white/10 text-white/70">
            <span className="material-symbols-outlined text-xs">event_seat</span>
            {bus.totalSeats} seats
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-bold bg-white/10 text-white/70 capitalize">
            {getBusTypeLabel(bus.busType)}
          </span>
        </div>

        <div className="absolute -bottom-3 -right-3 text-7xl opacity-[0.06] select-none pointer-events-none">★</div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 min-h-0 px-5 sm:px-6 py-3 sm:py-4">

        {/* Details */}
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Details</p>
        <div className="divide-y divide-slate-100">
          <InfoRow icon="tag"            label="Vehicle Number" value={bus.vehicleNumber} />
          <InfoRow icon="build"          label="Model"          value={bus.model} />
          <InfoRow icon="category"       label="Bus Type"       value={getBusTypeLabel(bus.busType)} />
          <InfoRow icon="event_seat"     label="Total Seats"    value={bus.totalSeats} />
        </div>

        {/* Amenities */}
        {bus.amenities?.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Amenities</p>
            <div className="flex flex-wrap gap-2">
              {bus.amenities.map(a => (
                <span key={a.id} className="flex items-center gap-1.5 rounded-xl bg-[#002046]/8 text-[#002046] px-3 py-1.5 text-xs font-semibold">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  {a.code || a.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-5 sm:px-6 py-3 sm:py-4 border-t border-slate-100 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Close
        </button>
        <button
          onClick={() => { onClose(); onEdit(bus); }}
          className="flex-1 rounded-2xl bg-[#002046] py-2.5 text-sm font-bold text-white hover:bg-[#003a80] transition-colors"
        >
          Edit Bus
        </button>
      </div>
    </div>
  </div>
);

export default BusDetailsModal;
