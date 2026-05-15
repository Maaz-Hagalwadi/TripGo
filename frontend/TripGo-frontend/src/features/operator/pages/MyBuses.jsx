import { useEffect, useMemo, useState } from 'react';
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

const PAGE_SIZE = 10;
const getBusTypeLabel = (type) => String(type || '').replace(/_/g, ' ');

const DEFAULT_FILTERS = { busTypes: [], minSeats: '', maxSeats: '', amenityIds: [] };

/* ── Filter Modal ── */
const FilterModal = ({ open, onClose, pending, setPending, onApply, onReset, allBusTypes, allAmenities }) => {
  if (!open) return null;
  const toggle = (key, val) =>
    setPending(prev => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter(v => v !== val) : [...prev[key], val],
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm sm:max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/70 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-black text-slate-900">Filter Buses</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-sm text-slate-500">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-5 py-3 space-y-4">
          {/* Bus Type */}
          {allBusTypes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Bus Type</p>
              <div className="flex flex-wrap gap-2">
                {allBusTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggle('busTypes', type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${pending.busTypes.includes(type) ? 'bg-[#002046] text-white border-[#002046]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                  >
                    {getBusTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Seat count */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Seat Count</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Min Seats</label>
                <input
                  type="number"
                  min={1}
                  value={pending.minSeats}
                  onChange={e => setPending(p => ({ ...p, minSeats: e.target.value }))}
                  placeholder="e.g. 20"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Max Seats</label>
                <input
                  type="number"
                  min={1}
                  value={pending.maxSeats}
                  onChange={e => setPending(p => ({ ...p, maxSeats: e.target.value }))}
                  placeholder="e.g. 60"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40"
                />
              </div>
            </div>
          </div>

          {/* Amenities */}
          {allAmenities.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {allAmenities.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggle('amenityIds', a.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${pending.amenityIds.includes(a.id) ? 'bg-[#002046] text-white border-[#002046]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                  >
                    {a.code || a.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-3 border-t border-slate-100 flex-shrink-0">
          <button onClick={onReset} className="flex-1 rounded-2xl border border-slate-200 py-2 sm:py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Reset
          </button>
          <button onClick={onApply} className="flex-1 rounded-2xl bg-[#002046] py-2 sm:py-2.5 text-sm font-bold text-white hover:bg-[#003a80] transition-colors">
            Show Results
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ── */
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
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 640 ? 'list' : 'list');
  const [selectedBusId, setSelectedBusId] = useState(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS);
  const [pendingFilters, setPendingFilters] = useState(DEFAULT_FILTERS);

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
    const onResize = () => { if (window.innerWidth < 640) setViewMode('list'); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
      const allIds = new Set(all.map(b => String(b.id)));
      const merged = [...all, ...pending.filter(b => !allIds.has(String(b.id)))];
      setBuses(merged);
      fetchBusOccupancy(merged);
    } catch {
      setBuses([]);
    } finally {
      setLoadingBuses(false);
    }
  };

  const fetchBusOccupancy = async (list) => {
    if (!list?.length) return;
    const results = await Promise.all(
      list.map(async bus => {
        try { return [String(bus.id), await getBusOccupancy(bus.id)]; }
        catch { return [String(bus.id), null]; }
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
        popularRoutes: data?.popularRoutes || {},
      });
    } catch {
      setInsights({ busInsights: [], popularRoutes: {} });
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleting(true);
      await deleteBus(busToDelete.id);
      setBusToDelete(null);
      toast.success('Bus deleted successfully');
      setTimeout(fetchBuses, 500);
    } catch (err) {
      toast.error(err.message || 'Failed to delete bus');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (bus) => {
    const resolvedId = bus?.id ?? bus?.busId ?? bus?.uuid;
    setBusToEdit({ ...bus, id: resolvedId });
    setEditFormData({
      name: bus.name, busCode: bus.busCode, vehicleNumber: bus.vehicleNumber,
      model: bus.model, totalSeats: bus.totalSeats, busType: bus.busType,
      amenityIds: bus.amenities?.map(a => a.id) || [],
    });
    setEditErrors({});
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
    const busId = busToEdit?.id ?? busToEdit?.busId ?? busToEdit?.uuid;
    if (!busId) { toast.error('Bus ID is missing.'); return; }
    try {
      setUpdating(true);
      await updateBus(busId, editFormData);
      setBusToEdit(null);
      toast.success('Bus updated successfully');
      setTimeout(fetchBuses, 500);
    } catch (err) {
      toast.error(err.message || 'Failed to update bus');
    } finally {
      setUpdating(false);
    }
  };

  /* ── Derived values ── */
  const activeCount = buses.filter(b => b.active).length;
  const pendingCount = buses.filter(b => !b.active).length;

  const allBusTypes = useMemo(() => [...new Set(buses.map(b => b.busType).filter(Boolean))], [buses]);

  const busOccupancyMap = useMemo(() => insights.busInsights.reduce((acc, item) => {
    const key = String(item?.busId || item?.busName || '');
    if (key) acc[key] = item;
    return acc;
  }, {}), [insights]);

  const getOccupancy = (bus) => {
    const occ = busOccupancyMap[String(bus.id)] || busOccupancyMap[String(bus.name || '')] || busOccupancyById[String(bus.id)] || {};
    return occ;
  };

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (activeFilters.busTypes.length) c++;
    if (activeFilters.minSeats || activeFilters.maxSeats) c++;
    if (activeFilters.amenityIds.length) c++;
    return c;
  }, [activeFilters]);

  const filteredBuses = useMemo(() => buses.filter(bus => {
    if (statusFilter === 'active' && !bus.active) return false;
    if (statusFilter === 'pending' && bus.active) return false;
    if (activeFilters.busTypes.length && !activeFilters.busTypes.includes(bus.busType)) return false;
    if (activeFilters.minSeats && bus.totalSeats < Number(activeFilters.minSeats)) return false;
    if (activeFilters.maxSeats && bus.totalSeats > Number(activeFilters.maxSeats)) return false;
    if (activeFilters.amenityIds.length) {
      const busAmenityIds = (bus.amenities || []).map(a => a.id);
      if (!activeFilters.amenityIds.every(id => busAmenityIds.includes(id))) return false;
    }
    return true;
  }), [buses, statusFilter, activeFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredBuses.length / PAGE_SIZE));
  const paginatedBuses = useMemo(
    () => filteredBuses.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredBuses, page]
  );

  const topRoute = Object.entries(insights.popularRoutes || {}).sort((a, b) => b[1] - a[1])[0];

  const actionBus = selectedBusId
    ? paginatedBuses.find(b => String(b.id) === selectedBusId) ?? null
    : null;

  useEffect(() => { setPage(0); setSelectedBusId(null); }, [statusFilter, activeFilters]);
  useEffect(() => { if (page >= totalPages) setPage(Math.max(0, totalPages - 1)); }, [page, totalPages]);

  return (
    <OperatorLayout activeItem="my-buses" title="My Buses">
      <div className="space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">My Buses</h1>
            <p className="hidden sm:block text-sm text-slate-500 mt-0.5">Manage your fleet, view occupancy, and edit bus details</p>
          </div>
          <button
            onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)}
            className="flex-shrink-0 flex items-center gap-2 rounded-2xl bg-[#002046] text-white px-4 sm:px-5 py-2.5 text-sm font-bold hover:bg-[#003a80] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add Bus
          </button>
        </div>

        {/* Stats cards — 2 on mobile, 3 on sm+ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-3 sm:p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[9px] sm:text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-2">Total Buses</p>
            {loadingBuses ? (
              <div className="animate-pulse space-y-2"><div className="h-7 sm:h-9 w-12 sm:w-16 bg-white/20 rounded" /><div className="h-3 w-16 sm:w-28 bg-white/10 rounded" /></div>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-black">{buses.length}</p>
                <p className="text-[10px] sm:text-xs opacity-50 mt-1 sm:mt-1.5">{pendingCount > 0 ? `${pendingCount} pending` : 'all buses'}</p>
              </>
            )}
          </div>
          <div className="hidden sm:block rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-3 sm:p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[9px] sm:text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-3">Fleet</p>
            {loadingBuses ? (
              <div className="space-y-2 animate-pulse">{[1,2].map(i => <div key={i} className="flex justify-between"><div className="h-3 w-12 sm:w-20 bg-white/20 rounded"/><div className="h-3 w-4 sm:w-6 bg-white/10 rounded"/></div>)}</div>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-black">{activeCount}</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 mt-1 sm:mt-2">
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs opacity-60"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />{activeCount} active</span>
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs opacity-60"><span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />{pendingCount} pending</span>
                </div>
              </>
            )}
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-3 sm:p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[9px] sm:text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-2">Top Route</p>
            {loadingInsights ? (
              <div className="animate-pulse space-y-2"><div className="h-4 sm:h-5 w-20 sm:w-32 bg-white/20 rounded" /><div className="h-3 w-12 sm:w-20 bg-white/10 rounded" /></div>
            ) : topRoute ? (
              <>
                <p className="text-xs sm:text-base font-black leading-snug truncate">{topRoute[0]}</p>
                <p className="text-[10px] sm:text-xs opacity-50 mt-1 sm:mt-1.5">{topRoute[1]} bookings</p>
              </>
            ) : (
              <><p className="text-xs sm:text-base font-black opacity-60">No data</p><p className="text-[10px] sm:text-xs opacity-40 mt-1">yet</p></>
            )}
          </div>
        </div>

        {/* Tab filter + filter button + view toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm">
            {[
              { id: 'all',     label: 'All',     count: buses.length },
              { id: 'active',  label: 'Active',  count: activeCount },
              { id: 'pending', label: 'Pending', count: pendingCount },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${statusFilter === tab.id ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${statusFilter === tab.id ? 'opacity-60' : 'opacity-40'}`}>({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Filter button */}
            <button
              type="button"
              onClick={() => { setPendingFilters(activeFilters); setFilterOpen(true); }}
              className={`relative flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ring-1 shadow-sm ${activeFilterCount > 0 ? 'bg-[#002046] text-white ring-[#002046]' : 'bg-white text-slate-600 ring-slate-200 hover:text-slate-900'}`}
            >
              <span className="material-symbols-outlined text-base">tune</span>
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View toggle — desktop only */}
            <div className="hidden sm:flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm">
              {[
                { id: 'list', icon: 'view_list', label: 'List' },
                { id: 'grid', icon: 'grid_view',  label: 'Grid' },
              ].map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => { setViewMode(mode.id); setSelectedBusId(null); }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all flex items-center gap-1.5 ${viewMode === mode.id ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span className="material-symbols-outlined text-base">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {activeFilters.busTypes.map(type => (
              <span key={type} className="flex items-center gap-1 rounded-full bg-[#002046]/10 text-[#002046] px-3 py-1 text-xs font-semibold">
                {getBusTypeLabel(type)}
                <button onClick={() => setActiveFilters(p => ({ ...p, busTypes: p.busTypes.filter(t => t !== type) }))}>
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </span>
            ))}
            {(activeFilters.minSeats || activeFilters.maxSeats) && (
              <span className="flex items-center gap-1 rounded-full bg-[#002046]/10 text-[#002046] px-3 py-1 text-xs font-semibold">
                Seats: {activeFilters.minSeats || '0'}–{activeFilters.maxSeats || '∞'}
                <button onClick={() => setActiveFilters(p => ({ ...p, minSeats: '', maxSeats: '' }))}>
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </span>
            )}
            {activeFilters.amenityIds.map(id => {
              const a = amenities.find(am => am.id === id);
              return a ? (
                <span key={id} className="flex items-center gap-1 rounded-full bg-[#002046]/10 text-[#002046] px-3 py-1 text-xs font-semibold">
                  {a.code || a.name}
                  <button onClick={() => setActiveFilters(p => ({ ...p, amenityIds: p.amenityIds.filter(i => i !== id) }))}>
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </span>
              ) : null;
            })}
            <button
              onClick={() => setActiveFilters(DEFAULT_FILTERS)}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Action bar — shown when a bus is selected */}
        {actionBus && (
          <div className="flex items-center gap-2 bg-white ring-1 ring-slate-200 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm">
            <button
              onClick={() => { setSelectedBusId(null); setBusToView(actionBus); }}
              className="flex items-center gap-1.5 rounded-xl bg-[#002046] text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-[#003a80] transition-colors whitespace-nowrap"
            >
              <span className="hidden sm:inline material-symbols-outlined text-base">visibility</span>
              View Details
            </button>
            <button
              onClick={() => { setSelectedBusId(null); handleEditClick(actionBus); }}
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <span className="hidden sm:inline material-symbols-outlined text-base">edit</span>
              Edit
            </button>
            {actionBus.active && (
              <button
                onClick={() => { setSelectedBusId(null); setBusToDelete(actionBus); }}
                className="flex items-center gap-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <span className="hidden sm:inline material-symbols-outlined text-base">delete</span>
                Delete
              </button>
            )}
            <button
              onClick={() => setSelectedBusId(null)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center flex-shrink-0 transition-colors ml-auto"
            >
              <span className="material-symbols-outlined text-sm text-slate-500">close</span>
            </button>
          </div>
        )}

        {/* Main card */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">

          {loadingBuses ? (
            <div className="p-10 flex items-center justify-center gap-3 text-sm text-slate-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
              Loading buses...
            </div>

          ) : filteredBuses.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300">directions_bus</span>
              <h2 className="mt-4 text-lg font-bold text-slate-900">No buses found</h2>
              <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
                {activeFilterCount > 0 ? 'No buses match the active filters.' : statusFilter !== 'all' ? 'No buses match this status.' : 'Add your first bus to get started.'}
              </p>
              {activeFilterCount > 0 && (
                <button onClick={() => setActiveFilters(DEFAULT_FILTERS)} className="mt-4 text-sm text-[#002046] font-semibold underline">Clear filters</button>
              )}
              {statusFilter === 'all' && activeFilterCount === 0 && (
                <button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className="mt-5 rounded-2xl bg-[#002046] px-6 py-3 text-sm font-bold text-white hover:bg-[#003a80] transition-colors">
                  Add First Bus
                </button>
              )}
            </div>

          ) : viewMode === 'grid' ? (
            <div className="p-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
              {paginatedBuses.map(bus => {
                const occ = getOccupancy(bus);
                const occupancyPct = Number(occ.occupancyPercent || 0).toFixed(0);
                const isSelected = selectedBusId === String(bus.id);

                return (
                  <div
                    key={bus.id}
                    onClick={() => setSelectedBusId(prev => prev === String(bus.id) ? null : String(bus.id))}
                    className={`rounded-xl ring-1 p-3 sm:p-4 hover:shadow-md transition-all cursor-pointer ${isSelected ? 'bg-slate-50 ring-[#002046]/40 shadow-sm' : 'bg-white ring-slate-200'}`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-2 sm:mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{bus.name}</p>
                        <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{bus.busCode}</p>
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0 ${bus.active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {bus.active ? 'Active' : 'Pending'}
                      </span>
                    </div>

                    <div className="space-y-1 mb-2 sm:mb-3 text-[10px] sm:text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-slate-300 text-sm">tag</span>
                        <span className="truncate">{bus.vehicleNumber}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-slate-300 text-sm">category</span>
                        <span className="truncate">{getBusTypeLabel(bus.busType)} · {bus.totalSeats}s</span>
                      </div>
                    </div>

                    <div className="mb-2 sm:mb-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Occupancy</span><span>{occupancyPct}%</span>
                      </div>
                      <div className="h-1 sm:h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-[#002046] transition-all" style={{ width: `${Math.min(100, Number(occupancyPct))}%` }} />
                      </div>
                    </div>

                    {bus.amenities?.length > 0 && (
                      <div className="hidden sm:flex flex-wrap gap-1 mb-3">
                        {bus.amenities.slice(0, 3).map(a => (
                          <span key={a.id} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{a.code}</span>
                        ))}
                        {bus.amenities.length > 3 && <span className="text-[10px] text-slate-400">+{bus.amenities.length - 3}</span>}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 pt-2 sm:pt-3 border-t border-slate-100">
                      <button
                        onClick={e => { e.stopPropagation(); setBusToView(bus); }}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 py-1.5 text-[10px] sm:text-xs font-semibold text-slate-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-xs sm:text-sm">visibility</span>
                        View
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleEditClick(bus); }}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-xs sm:text-sm text-slate-600">edit</span>
                      </button>
                      {bus.active && (
                        <button
                          onClick={e => { e.stopPropagation(); setBusToDelete(bus); }}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 flex items-center justify-center transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs sm:text-sm text-rose-500">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          ) : (
            <div className="overflow-x-auto sm:overflow-x-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="pl-3 sm:pl-5 pr-1 sm:pr-2 py-3 sm:py-3.5 w-8 sm:w-10" />
                    <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Bus</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Seats</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Vehicle No</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Type</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Occupancy</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedBuses.map(bus => {
                    const occ = getOccupancy(bus);
                    const occupancyPct = Number(occ.occupancyPercent || 0).toFixed(0);
                    const isRowSelected = String(bus.id) === selectedBusId;
                    return (
                      <tr key={bus.id} className={`transition-colors ${isRowSelected ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}>
                        {/* Checkbox */}
                        <td className="pl-3 sm:pl-5 pr-1 sm:pr-2 py-3 sm:py-4">
                          <div
                            onClick={() => setSelectedBusId(prev => prev === String(bus.id) ? null : String(bus.id))}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${isRowSelected ? 'bg-[#002046] border-[#002046]' : 'bg-white border-slate-300 hover:border-[#002046]/50'}`}
                          >
                            {isRowSelected && <span className="material-symbols-outlined text-white" style={{ fontSize: '12px' }}>check</span>}
                          </div>
                        </td>

                        {/* Bus — name + vehicle·type subtitle on mobile, name+code on desktop */}
                        <td className="px-3 sm:px-5 py-3 sm:py-4">
                          <p className="text-sm font-bold text-slate-900 truncate">{bus.name}</p>
                          <p className="sm:hidden text-[10px] text-slate-400 mt-0.5 truncate">
                            {bus.vehicleNumber} · {getBusTypeLabel(bus.busType)}
                          </p>
                          <p className="hidden sm:block text-xs text-slate-400 mt-0.5">{bus.busCode}</p>
                        </td>

                        {/* Seats — always visible */}
                        <td className="px-3 sm:px-5 py-3 sm:py-4">
                          <span className="text-sm font-semibold text-slate-900">{bus.totalSeats}</span>
                        </td>

                        {/* Status — always visible */}
                        <td className="px-3 sm:px-5 py-3 sm:py-4">
                          <span className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold ${bus.active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${bus.active ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                            {bus.active ? 'Active' : 'Pending'}
                          </span>
                        </td>

                        {/* Vehicle No — md+ only */}
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="text-sm text-slate-600 font-mono">{bus.vehicleNumber}</span>
                        </td>
                        {/* Type — lg+ only */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="text-sm text-slate-500">{getBusTypeLabel(bus.busType)}</span>
                        </td>
                        <td className="px-5 py-4 hidden xl:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-[#002046]" style={{ width: `${Math.min(100, Number(occupancyPct))}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{occupancyPct}%</span>
                          </div>
                        </td>

                        {/* Actions — desktop only */}
                        <td className="hidden sm:table-cell px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setBusToView(bus)} title="View" className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors">
                              <span className="material-symbols-outlined text-sm">visibility</span>
                            </button>
                            <button onClick={() => handleEditClick(bus)} title="Edit" className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors">
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                            {bus.active && (
                              <button onClick={() => setBusToDelete(bus)} title="Delete" className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors">
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loadingBuses && filteredBuses.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-4">
              <p className="text-sm text-slate-400">
                Showing {page * PAGE_SIZE + 1}–{Math.min(filteredBuses.length, (page + 1) * PAGE_SIZE)} of {filteredBuses.length}{activeFilterCount > 0 ? ' (filtered)' : ''}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${page === pageNum ? 'bg-[#002046] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                      {pageNum + 1}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Filter Modal */}
      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        pending={pendingFilters}
        setPending={setPendingFilters}
        allBusTypes={allBusTypes}
        allAmenities={amenities}
        onApply={() => { setActiveFilters(pendingFilters); setFilterOpen(false); }}
        onReset={() => { setPendingFilters(DEFAULT_FILTERS); setActiveFilters(DEFAULT_FILTERS); setFilterOpen(false); }}
      />

      {busToView && <BusDetailsModal bus={busToView} onClose={() => setBusToView(null)} onEdit={handleEditClick} />}
      {busToDelete && <DeleteBusModal bus={busToDelete} deleting={deleting} onConfirm={handleDeleteConfirm} onCancel={() => setBusToDelete(null)} />}
      {busToEdit && (
        <EditBusModal
          busId={busToEdit.id}
          formData={editFormData}
          errors={editErrors}
          amenities={amenities}
          updating={updating}
          onChange={(field, value) => { setEditFormData(p => ({ ...p, [field]: value })); if (editErrors[field]) setEditErrors(p => ({ ...p, [field]: '' })); }}
          onAmenityToggle={id => setEditFormData(p => ({ ...p, amenityIds: p.amenityIds.includes(id) ? p.amenityIds.filter(i => i !== id) : [...p.amenityIds, id] }))}
          onSave={handleUpdateBus}
          onCancel={() => setBusToEdit(null)}
        />
      )}
    </OperatorLayout>
  );
};

export default MyBuses;
