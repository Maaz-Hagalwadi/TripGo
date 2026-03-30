const BusDetailsModal = ({ bus, onClose, onEdit }) => {
  const getBusTypeLabel = (type) => type.replace(/_/g, ' ');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-op-card rounded-xl p-6 max-w-2xl w-full my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Bus Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-4xl">directions_bus</span>
            </div>
            <div>
              <h4 className="text-2xl font-bold">{bus.name}</h4>
              <p className="text-slate-500">{bus.busCode}</p>
            </div>
            <span className={`ml-auto text-sm px-3 py-1 rounded-full font-medium ${bus.active ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'}`}>
              {bus.active ? 'Active' : 'Pending'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Vehicle Number', value: bus.vehicleNumber },
              { label: 'Bus Type', value: getBusTypeLabel(bus.busType) },
              { label: 'Total Seats', value: bus.totalSeats },
              { label: 'Model', value: bus.model },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="font-semibold">{value}</p>
              </div>
            ))}
          </div>
          {bus.amenities?.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-3">Amenities & Features</p>
              <div className="grid grid-cols-3 gap-2">
                {bus.amenities.map((amenity) => (
                  <div key={amenity.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                    <span className="text-sm">{amenity.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Close
          </button>
          <button onClick={() => { onClose(); onEdit(bus); }} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            Edit Bus
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusDetailsModal;
