import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import DeleteBusModal from '../components/DeleteBusModal';
import BusDetailsModal from '../components/BusDetailsModal';
import EditBusModal from '../components/EditBusModal';
import { getBuses, deleteBus, updateBus, getOperatorInsights, getBusOccupancy, getPendingBuses } from '../../../api/busService';
import { getAmenities } from '../../../api/amenityService';
import { ROUTES } from '../../../shared/constants/routes';
import PaginationControls from '../../../shared/components/ui/PaginationControls';
import './OperatorDashboard.css';

const PAGE_SIZE = 10;

const MyBuses = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [buses, setBuses] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(true);
  const [amenities, setAmenities] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [insights, setInsights] = useState({ busInsights: [], popularRoutes: {} });
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [busOccupancyById, setBusOccupancyById] = useState({});
  const [page, setPage] = useState(0);

  const [busToDelete, setBusToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [busToEdit, setBusToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [updating, setUpdating] = useState(false);

  const [busToView, setBusToView] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchBuses();
    fetchInsights();
    getAmenities().then(data => setAmenities(data || [])).catch(() => {});
  }, []);

  const fetchBuses = async () => {
    try {
      setLoadingBuses(true);
      const [allData, pendingData] = await Promise.allSettled([getBuses(), getPendingBuses()]);
      const all = allData.status === 'fulfilled' ? (allData.value || []) : [];
      const pending = pendingData.status === 'fulfilled' ? (pendingData.value || []) : [];
      // Merge: pending buses not already in all list
      const allIds = new Set(all.map(b => String(b.id)));
      const merged = [...all, ...pending.filter(b => !allIds.has(String(b.id)))];
      setBuses(merged);
      fetchBusOccupancy(merged);
    } catch {
      setBuses([]);
      setBusOccupancyById({});
    } finally {
      setLoadingBuses(false);
    }
  };

  const fetchBusOccupancy = async (busesList) => {
    if (!Array.isArray(busesList) || busesList.length === 0) {
      setBusOccupancyById({});
      return;
    }
    const results = await Promise.all(
      busesList.map(async (bus) => {
        try {
          const data = await getBusOccupancy(bus.id);
          return [String(bus.id), data];
        } catch {
          return [String(bus.id), null];
        }
      })
    );
    setBusOccupancyById(Object.fromEntries(results));
  };

  const fetchInsights = async () => {
    try {
      setLoadingInsights(true);
      const data = await getOperatorInsights();
      setInsights({
        busInsights: Array.isArray(data?.busInsights) ? data.busInsights : [],
        popularRoutes: data?.popularRoutes || {}
      });
    } catch {
      setInsights({ busInsights: [], popularRoutes: {} });
    } finally {
      setLoadingInsights(false);
    }
  };

  const showSuccess = (msg) => {
    toast.success(msg);
    setTimeout(fetchBuses, 500);
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleting(true);
      await deleteBus(busToDelete.id);
      setBusToDelete(null);
      showSuccess('Bus Deleted Successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to delete bus');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (bus) => {
    // Store the full bus object but also resolve the ID upfront
    const resolvedId = bus?.id ?? bus?.busId ?? bus?.uuid;
    setBusToEdit({ ...bus, id: resolvedId });
    setEditFormData({
      name: bus.name, busCode: bus.busCode, vehicleNumber: bus.vehicleNumber,
      model: bus.model, totalSeats: bus.totalSeats, busType: bus.busType,
      amenityIds: bus.amenities?.map(a => a.id) || [],
    });
    setEditErrors({});
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    if (editErrors[field]) setEditErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleAmenityToggle = (id) => {
    setEditFormData(prev => ({
      ...prev,
      amenityIds: prev.amenityIds.includes(id) ? prev.amenityIds.filter(i => i !== id) : [...prev.amenityIds, id],
    }));
  };

  const handleUpdateBus = async () => {
    const errors = {};
    if (!editFormData.name?.trim()) errors.name = 'Bus name is required';
    if (!editFormData.busCode?.trim()) errors.busCode = 'Bus code is required';
    if (!editFormData.vehicleNumber?.trim()) errors.vehicleNumber = 'Vehicle number is required';
    if (!editFormData.model?.trim()) errors.model = 'Model is required';
    if (!editFormData.totalSeats || editFormData.totalSeats < 1) errors.totalSeats = 'Valid total seats required';
    if (!editFormData.busType) errors.busType = 'Bus type is required';
    if (Object.keys(errors).length) { setEditErrors(errors); return; }

    // Resolve ID — backend may return id, busId, or uuid
    const busId = busToEdit?.id ?? busToEdit?.busId ?? busToEdit?.uuid;
    if (!busId) {
      toast.error('Bus ID is missing. Please close and try again.');
      return;
    }

    try {
      setUpdating(true);
      await updateBus(busId, editFormData);
      setBusToEdit(null);
      showSuccess('Bus Updated Successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update bus');
    } finally {
      setUpdating(false);
    }
  };

  const filteredBuses = buses.filter(bus => {
    if (statusFilter === 'active') return bus.active;
    if (statusFilter === 'inactive') return !bus.active;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredBuses.length / PAGE_SIZE));
  const paginatedBuses = filteredBuses.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const getBusTypeLabel = (type) => type.replace(/_/g, ' ');
  const busOccupancyMap = insights.busInsights.reduce((acc, item) => {
    const key = String(item?.busId || item?.busName || '');
    if (key) acc[key] = item;
    return acc;
  }, {});

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(totalPages - 1, 0));
    }
  }, [page, totalPages]);

  return (
    <OperatorLayout
      activeItem="my-buses"
      title="My Buses"
      searchPlaceholder="Search buses..."
    >
      {/* Filter Tabs */}
      <div className="flex items-center gap-3 mb-6">
        {[
          { key: 'all', label: `All (${buses.length})`, active: 'bg-primary text-white' },
          { key: 'active', label: `Active (${buses.filter(b => b.active).length})`, active: 'bg-green-600 text-white' },
          { key: 'inactive', label: `Pending (${buses.filter(b => !b.active).length})`, active: 'bg-yellow-600 text-white' },
        ].map(({ key, label, active }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === key ? active : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-6">
        <h3 className="font-semibold mb-3">Route Demand Insights</h3>
        {loadingInsights ? (
          <p className="text-sm text-slate-400">Loading insights...</p>
        ) : Object.keys(insights.popularRoutes || {}).length === 0 ? (
          <p className="text-sm text-slate-400">No route demand data yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {Object.entries(insights.popularRoutes).slice(0, 6).map(([routeName, bookings]) => (
              <div key={routeName} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                <span className="truncate">{routeName}</span>
                <span className="font-semibold">{bookings}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bus Grid */}
      {loadingBuses ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-slate-500">Loading buses...</p>
          </div>
        </div>
      ) : filteredBuses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">directions_bus</span>
          <p className="text-slate-500 text-lg mb-4">No buses found</p>
          <button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Add Your First Bus
          </button>
        </div>
      ) : (
        <div className="bus-grid grid gap-6">
          {paginatedBuses.map((bus) => (
            <div key={bus.id} className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-4 md:p-6">
                {(() => {
                  const byId = busOccupancyMap[String(bus.id)];
                  const byName = busOccupancyMap[String(bus.name || '')];
                  const fallback = busOccupancyById[String(bus.id)];
                  const occ = byId || byName || fallback || {};
                  return (
                    <div className="mb-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
                      <span>Seat Occupancy: {Number(occ.occupancyPercent || 0).toFixed(1)}%</span>
                      <span>Booked: {Number(occ.totalBooked || 0)}</span>
                    </div>
                  );
                })()}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base md:text-lg">{bus.name}</h3>
                    <p className="text-xs text-slate-500">{bus.busCode}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="material-symbols-outlined text-primary text-2xl md:text-3xl">directions_bus</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${bus.active ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'}`}>
                      {bus.active ? 'Active' : 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {[
                    { icon: 'tag', value: bus.vehicleNumber },
                    { icon: 'category', value: getBusTypeLabel(bus.busType) },
                    { icon: 'event_seat', value: `${bus.totalSeats} Seats` },
                    { icon: 'precision_manufacturing', value: bus.model },
                  ].map(({ icon, value }) => (
                    <div key={icon} className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">{icon}</span>
                      <span className="text-slate-600 dark:text-slate-400">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <p className="text-xs text-slate-500 mb-2">Amenities & Features</p>
                  {bus.amenities?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {bus.amenities.map((a) => (
                        <span key={a.id} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{a.code}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No amenities selected</p>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className={`px-2 py-1.5 rounded-lg text-[10px] md:text-xs font-semibold shrink-0 ${
                    bus.active
                      ? 'border border-green-300 text-green-700 dark:border-green-700 dark:text-green-300'
                      : 'border border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300'
                  }`}>
                    {bus.active ? 'Approved' : 'Pending'}
                  </div>
                  <button onClick={() => setBusToView(bus)} className="bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors text-xs md:text-sm">
                    View Details
                  </button>
                  <button onClick={() => handleEditClick(bus)} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  {bus.active && (
                    <button onClick={() => setBusToDelete(bus)} className="px-3 py-2 border border-red-200 dark:border-red-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loadingBuses && filteredBuses.length > 0 ? (
        <PaginationControls
          page={page}
          pageSize={PAGE_SIZE}
          totalItems={filteredBuses.length}
          onPageChange={setPage}
          itemLabel="buses"
          className="mt-6"
        />
      ) : null}

      {/* Modals */}
      {busToView && <BusDetailsModal bus={busToView} onClose={() => setBusToView(null)} onEdit={handleEditClick} />}
      {busToDelete && <DeleteBusModal bus={busToDelete} deleting={deleting} onConfirm={handleDeleteConfirm} onCancel={() => setBusToDelete(null)} />}
      {busToEdit && (
        <EditBusModal
          busId={busToEdit.id}
          formData={editFormData}
          errors={editErrors}
          amenities={amenities}
          updating={updating}
          onChange={handleEditChange}
          onAmenityToggle={handleAmenityToggle}
          onSave={handleUpdateBus}
          onCancel={() => setBusToEdit(null)}
        />
      )}
    </OperatorLayout>
  );
};

export default MyBuses;
