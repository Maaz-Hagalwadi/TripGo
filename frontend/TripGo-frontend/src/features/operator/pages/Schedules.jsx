import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getRoutes, deleteRoute, updateRoute } from '../../../api/routeService';
import { toast } from 'sonner';
import { ROUTES } from '../../../shared/constants/routes';
import CenterScreenLoader from '../../../shared/components/ui/CenterScreenLoader';

const Schedules = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [blockingLoader, setBlockingLoader] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, routeId: null });
  const [editModal, setEditModal] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') { navigate('/'); return; }
    fetchRoutes();
  }, [user, loading, navigate]);

  const fetchRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const data = await getRoutes();
      setRoutes(data || []);
    } catch {
      toast.error('Failed to load routes.');
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleDelete = async () => {
    setBlockingLoader('Deleting route...');
    try {
      await deleteRoute(deleteModal.routeId);
      setRoutes(prev => prev.filter(r => r.id !== deleteModal.routeId));
      setDeleteModal({ show: false, routeId: null });
      toast.success('Route deleted.');
    } catch (e) {
      toast.error(e.message || 'Failed to delete route.');
    } finally {
      setBlockingLoader(null);
    }
  };

  const handleEditSave = async () => {
    const { id, name, origin, destination } = editModal;
    if (!name?.trim() || !origin?.trim() || !destination?.trim()) {
      toast.error('All fields are required');
      return;
    }
    setBlockingLoader('Updating route...');
    try {
      const updated = await updateRoute(id, { name, origin, destination });
      setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...updated, name, origin, destination } : r));
      setEditModal(null);
      toast.success('Route updated.');
    } catch (e) {
      toast.error(e.message || 'Failed to update route.');
    } finally {
      setBlockingLoader(null);
    }
  };

  const goToDetail = (routeId) => navigate(`/operator/routes/${routeId}`);

  return (
    <>
      {blockingLoader && <CenterScreenLoader label={blockingLoader} description="Please wait..." />}

      <OperatorLayout activeItem="schedules" title="Routes & Schedules">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-black text-slate-900">Routes & Schedules</h1>
            <p className="text-xs text-slate-500 mt-0.5">{routes.length} route{routes.length !== 1 ? 's' : ''} configured</p>
          </div>
          <button
            onClick={() => navigate(ROUTES.OPERATOR_CREATE_ROUTE)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#002046] text-white text-sm font-bold hover:bg-[#003a80] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create Route
          </button>
        </div>

        {/* Loading */}
        {loadingRoutes ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#002046]/20 border-t-[#002046] mx-auto mb-4" />
              <p className="text-sm text-slate-500">Loading routes...</p>
            </div>
          </div>
        ) : routes.length === 0 ? (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-slate-400 text-3xl">route</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Routes Created Yet</h3>
            <p className="text-sm text-slate-500 mb-6">Create your first route to start scheduling trips</p>
            <button
              onClick={() => navigate(ROUTES.OPERATOR_CREATE_ROUTE)}
              className="px-6 py-2.5 rounded-xl bg-[#002046] text-white font-bold text-sm hover:bg-[#003a80] transition-colors"
            >
              Create Your First Route
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map((route) => (
              <div
                key={route.id}
                onClick={() => goToDetail(route.id)}
                className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:ring-[#002046]/20 transition-all group"
              >
                {/* Navy hero */}
                <div className="bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-5 py-4 relative">
                  <div className="absolute -top-1 -right-3 text-6xl opacity-[0.07] select-none pointer-events-none">★</div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-black text-white truncate mb-1.5">{route.name}</h3>
                      <div className="flex items-center gap-1 text-white/65 text-xs">
                        <span className="material-symbols-outlined text-xs">location_on</span>
                        <span className="font-medium truncate">{route.origin}</span>
                        <span className="material-symbols-outlined text-sm flex-shrink-0">arrow_forward</span>
                        <span className="material-symbols-outlined text-xs flex-shrink-0">location_on</span>
                        <span className="font-medium truncate">{route.destination}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditModal({ id: route.id, name: route.name, origin: route.origin, destination: route.destination }); }}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-white text-sm">edit</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteModal({ show: true, routeId: route.id }); }}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-400/30 flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-white text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-4">
                    {route.totalDistanceKm && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <span className="material-symbols-outlined text-slate-400 text-sm">straighten</span>
                        {route.totalDistanceKm} km
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Click to manage schedules, fares & more</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-[#002046] group-hover:gap-2 transition-all">
                      Open
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </OperatorLayout>

      {/* Edit Route Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl ring-1 ring-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-9 h-9 bg-[#002046]/10 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[#002046] text-lg">edit_road</span>
              </div>
              <h3 className="font-extrabold text-base">Edit Route</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              {[
                { label: 'Route Name *', field: 'name' },
                { label: 'Origin *', field: 'origin' },
                { label: 'Destination *', field: 'destination' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
                  <input
                    value={editModal[field]}
                    onChange={e => setEditModal(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleEditSave} disabled={Boolean(blockingLoader)} className="flex-1 py-2.5 rounded-xl bg-[#002046] text-white font-bold text-sm hover:bg-[#003a80] transition-colors disabled:opacity-60">Save Route</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-red-500 text-xl">delete</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">Delete Route</h3>
              <p className="text-sm text-slate-500 mb-3">This action cannot be undone</p>
              <p className="text-sm text-slate-600">All associated schedules, fares, and points will also be deleted.</p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setDeleteModal({ show: false, routeId: null })} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Schedules;
