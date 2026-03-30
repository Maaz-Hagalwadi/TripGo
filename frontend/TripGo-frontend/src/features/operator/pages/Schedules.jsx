import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getRoutes, getRouteSegments, getRouteSchedules, deleteSchedule, deleteRoute } from '../../../api/routeService';
import { toast } from 'sonner';
import { ROUTES } from '../../../shared/constants/routes';
import './OperatorDashboard.css';

const Schedules = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [segments, setSegments] = useState({});
  const [schedules, setSchedules] = useState({});
  const [deleteModal, setDeleteModal] = useState({ show: false, scheduleId: null, routeId: null, type: null });

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

  const fetchSegments = async (routeId) => {
    if (segments[routeId]) return;
    try {
      const data = await getRouteSegments(routeId);
      setSegments(prev => ({ ...prev, [routeId]: data }));
    } catch { /* silent */ }
  };

  const fetchSchedules = async (routeId) => {
    if (schedules[routeId]) return;
    try {
      const data = await getRouteSchedules(routeId);
      setSchedules(prev => ({ ...prev, [routeId]: data || [] }));
    } catch {
      setSchedules(prev => ({ ...prev, [routeId]: [] }));
    }
  };

  const toggleRoute = (routeId) => {
    if (expandedRoute === routeId) { setExpandedRoute(null); return; }
    setExpandedRoute(routeId);
    fetchSegments(routeId);
    fetchSchedules(routeId);
  };

  const confirmDelete = async () => {
    const { scheduleId, routeId, type } = deleteModal;
    try {
      if (type === 'schedule') {
        await deleteSchedule(scheduleId);
        setSchedules(prev => ({ ...prev, [routeId]: prev[routeId].filter(s => s.id !== scheduleId) }));
        toast.success('Schedule deleted.');
      } else {
        await deleteRoute(routeId);
        setRoutes(prev => prev.filter(r => r.id !== routeId));
        setExpandedRoute(null);
        toast.success('Route deleted.');
      }
      setDeleteModal({ show: false, scheduleId: null, routeId: null, type: null });
    } catch (err) {
      toast.error(err.message || `Failed to delete ${type}.`);
    }
  };

  return (
    <>
      <OperatorLayout
        activeItem="schedules"
        title="Routes & Schedules"
        headerChildren={
          <button
            onClick={() => navigate(ROUTES.OPERATOR_CREATE_ROUTE)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-sm font-bold"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create Route
          </button>
        }
      >
        {loadingRoutes ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-slate-500">Loading routes...</p>
            </div>
          </div>
        ) : routes.length === 0 ? (
          <div className="bg-white dark:bg-op-card rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4 block">route</span>
            <h3 className="text-xl font-bold mb-2">No Routes Created Yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Create your first route to start scheduling trips</p>
            <button
              onClick={() => navigate(ROUTES.OPERATOR_CREATE_ROUTE)}
              className="bg-primary text-black px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-bold"
            >
              Create Your First Route
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {routes.map((route) => (
              <div key={route.id} className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div onClick={() => toggleRoute(route.id)} className="p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2">{route.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">location_on</span>{route.origin}
                        </span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">location_on</span>{route.destination}
                        </span>
                        {route.totalDistanceKm && (
                          <span className="flex items-center gap-1 ml-4">
                            <span className="material-symbols-outlined text-sm">straighten</span>{route.totalDistanceKm} km
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteModal({ show: true, routeId: route.id, type: 'route' }); }}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                      <span className={`material-symbols-outlined transition-transform ${expandedRoute === route.id ? 'rotate-180' : ''}`}>expand_more</span>
                    </div>
                  </div>
                </div>

                {expandedRoute === route.id && (
                  <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-900/30">
                    {segments[route.id]?.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">route</span>Route Segments
                        </h4>
                        <div className="space-y-2">
                          {segments[route.id].map((segment, idx) => (
                            <div key={segment.id} className="bg-white dark:bg-op-card p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                  <span className="font-medium">{segment.fromStop}</span>
                                  <span className="material-symbols-outlined text-sm text-slate-400">arrow_forward</span>
                                  <span className="font-medium">{segment.toStop}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                  <span>{segment.distanceKm} km</span>
                                  <span>{segment.durationMinutes} min</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {schedules[route.id]?.length > 0 ? (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          Schedules ({schedules[route.id].length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {schedules[route.id].map((schedule) => (
                            <div key={schedule.id} className="bg-white dark:bg-op-card p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-medium">{schedule.bus?.name || 'Bus'}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{schedule.bus?.busCode}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${schedule.active ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                    {schedule.active ? 'Active' : 'Inactive'}
                                  </span>
                                  <button
                                    onClick={() => setDeleteModal({ show: true, scheduleId: schedule.id, routeId: route.id, type: 'schedule' })}
                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm">schedule</span>
                                  Departure: {new Date(schedule.departureTime).toLocaleString()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm">schedule</span>
                                  Arrival: {new Date(schedule.arrivalTime).toLocaleString()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm">repeat</span>
                                  {schedule.frequency}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <span className="material-symbols-outlined text-4xl mb-2 block">schedule</span>
                        <p>No schedules created for this route yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </OperatorLayout>

      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-op-card rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500">delete</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">{deleteModal.type === 'route' ? 'Delete Route' : 'Delete Schedule'}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {deleteModal.type === 'route'
                ? 'Are you sure you want to delete this route? All associated schedules will also be deleted.'
                : 'Are you sure you want to delete this schedule?'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ show: false, scheduleId: null, routeId: null, type: null })}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Schedules;
