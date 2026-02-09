import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OperatorSidebar from '../components/operator/OperatorSidebar';
import { getRoutes, getRouteSegments, getRouteSchedules, deleteSchedule } from '../api/routeService';
import './OperatorDashboard.css';

const Schedules = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [segments, setSegments] = useState({});
  const [schedules, setSchedules] = useState({});

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') {
      navigate('/');
    }
    fetchRoutes();
  }, [user, loading, navigate]);

  const fetchRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const data = await getRoutes();
      console.log('Routes data:', data);
      setRoutes(data || []);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const fetchSegments = async (routeId) => {
    if (segments[routeId]) return;
    try {
      const data = await getRouteSegments(routeId);
      setSegments(prev => ({ ...prev, [routeId]: data }));
    } catch (error) {
      console.error('Failed to fetch segments:', error);
    }
  };

  const fetchSchedules = async (routeId) => {
    if (schedules[routeId]) return;
    try {
      const data = await getRouteSchedules(routeId);
      setSchedules(prev => ({ ...prev, [routeId]: data || [] }));
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      setSchedules(prev => ({ ...prev, [routeId]: [] }));
    }
  };

  const handleDeleteSchedule = async (scheduleId, routeId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await deleteSchedule(scheduleId);
      setSchedules(prev => ({
        ...prev,
        [routeId]: prev[routeId].filter(s => s.id !== scheduleId)
      }));
    } catch (error) {
      alert('Failed to delete schedule');
    }
  };

  const toggleRoute = (routeId) => {
    if (expandedRoute === routeId) {
      setExpandedRoute(null);
    } else {
      setExpandedRoute(routeId);
      fetchSegments(routeId);
      fetchSchedules(routeId);
    }
  };

  return (
    <div className="bg-background-light dark:bg-[#101e22] text-slate-900 dark:text-slate-100 min-h-screen flex">
      <div className="operator-sidebar">
        <OperatorSidebar activeItem="schedules" collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      <main className={`operator-main flex-1 flex flex-col min-w-0 overflow-hidden transition-all ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101e22] flex items-center justify-between px-4 lg:px-8">
          <h2 className="text-lg font-semibold">Routes & Schedules</h2>
          <button
            onClick={() => navigate('/operator/create-route')}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create Route
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {loadingRoutes ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-500">Loading routes...</p>
            </div>
          ) : routes.length === 0 ? (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">route</span>
              <h3 className="text-xl font-bold mb-2">No Routes Created Yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Create your first route to start scheduling trips</p>
              <button
                onClick={() => navigate('/operator/create-route')}
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors"
              >
                Create Your First Route
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {routes.map((route) => (
                <div key={route.id} className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div
                    onClick={() => toggleRoute(route.id)}
                    className="p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-2">{route.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            {route.origin}
                          </span>
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            {route.destination}
                          </span>
                          {route.totalDistanceKm && (
                            <span className="flex items-center gap-1 ml-4">
                              <span className="material-symbols-outlined text-sm">straighten</span>
                              {route.totalDistanceKm} km
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`material-symbols-outlined transition-transform ${expandedRoute === route.id ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </div>
                  </div>

                  {expandedRoute === route.id && (
                    <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-900/30">
                      {/* Segments */}
                      {segments[route.id] && segments[route.id].length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">route</span>
                            Route Segments
                          </h4>
                          <div className="space-y-2">
                            {segments[route.id].map((segment, idx) => (
                              <div key={segment.id} className="bg-white dark:bg-[#1a1a1a] p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                                      {idx + 1}
                                    </span>
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

                      {/* Schedules */}
                      {schedules[route.id] && schedules[route.id].length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            Schedules ({schedules[route.id].length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {schedules[route.id].map((schedule) => (
                              <div key={schedule.id} className="bg-white dark:bg-[#1a1a1a] p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <p className="font-medium">{schedule.bus?.name || 'Bus'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{schedule.bus?.busCode}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      schedule.active 
                                        ? 'bg-green-500/10 text-green-500' 
                                        : 'bg-slate-500/10 text-slate-500'
                                    }`}>
                                      {schedule.active ? 'Active' : 'Inactive'}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteSchedule(schedule.id, route.id)}
                                      className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500"
                                      title="Delete schedule"
                                    >
                                      <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    <span>Departure: {new Date(schedule.departureTime).toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    <span>Arrival: {new Date(schedule.arrivalTime).toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                    <span className="material-symbols-outlined text-sm">repeat</span>
                                    <span>{schedule.frequency}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(!schedules[route.id] || schedules[route.id].length === 0) && (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                          <span className="material-symbols-outlined text-4xl mb-2">schedule</span>
                          <p>No schedules created for this route yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Schedules;
