import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getRoutes, getRouteSegments, getRouteSchedules, deleteSchedule, deleteRoute, getPoints, addPoint, deletePoint, getFares, addFare, deleteFare, updateFare } from '../../../api/routeService';
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
  const [points, setPoints] = useState({});
  const [expandedSchedule, setExpandedSchedule] = useState(null);
  const [pointForm, setPointForm] = useState({});
  const [fares, setFares] = useState({});           // { [routeId]: [...] }
  const [expandedFares, setExpandedFares] = useState(null);
  const [fareForm, setFareForm] = useState({});     // { [routeId]: { segmentId, seatType, baseFare, gstPercent } }
  const [editingFare, setEditingFare] = useState({}); // { [routeId]: { fareId, baseFare } }

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

  const fetchPoints = async (scheduleId) => {
    if (points[scheduleId]) return;
    try {
      const data = await getPoints(scheduleId);
      setPoints(prev => ({ ...prev, [scheduleId]: data }));
    } catch { setPoints(prev => ({ ...prev, [scheduleId]: [] })); }
  };

  const toggleSchedulePoints = (scheduleId) => {
    if (expandedSchedule === scheduleId) { setExpandedSchedule(null); return; }
    setExpandedSchedule(scheduleId);
    fetchPoints(scheduleId);
  };

  const handleAddPoint = async (scheduleId) => {
    const form = pointForm[scheduleId] || {};
    if (!form.name || !form.type) return toast.error('Name and type are required');
    try {
      const newPoint = await addPoint(scheduleId, form);
      setPoints(prev => ({ ...prev, [scheduleId]: [...(prev[scheduleId] || []), newPoint] }));
      setPointForm(prev => ({ ...prev, [scheduleId]: {} }));
      toast.success('Point added');
    } catch (e) { toast.error(e.message); }
  };

  const handleDeletePoint = async (scheduleId, pointId) => {
    try {
      await deletePoint(scheduleId, pointId);
      setPoints(prev => ({ ...prev, [scheduleId]: prev[scheduleId].filter(p => p.id !== pointId) }));
      toast.success('Point deleted');
    } catch (e) { toast.error(e.message); }
  };

  const fetchFares = async (routeId) => {
    try {
      const data = await getFares(routeId);
      const list = Array.isArray(data) ? data : [];
      setFares(prev => ({ ...prev, [routeId]: list }));
    } catch (e) {
      toast.error('Failed to load fares: ' + e.message);
    }
  };

  const toggleFares = (routeId) => {
    if (expandedFares === routeId) { setExpandedFares(null); return; }
    setExpandedFares(routeId);
    fetchFares(routeId);
  };

  const getFareSegmentId = (fare) => String(fare?.segmentId || fare?.segment?.id || '');
  const fareExistsForRoute = (routeId, segmentId, seatType) => {
    return (fares[routeId] || []).some(f =>
      getFareSegmentId(f) === String(segmentId) &&
      String(f.seatType || '').toUpperCase() === String(seatType || '').toUpperCase()
    );
  };

  const handleAddFare = async (routeId) => {
    const form = fareForm[routeId] || {};
    if (!form.segmentId || !form.seatType || !form.baseFare) return toast.error('Segment, seat type and fare are required');
    if (fareExistsForRoute(routeId, form.segmentId, form.seatType)) {
      return toast.error('Fare for this segment and seat type already exists');
    }
    try {
      await addFare(routeId, {
        segmentId: form.segmentId,
        seatType: form.seatType,
        baseFare: parseFloat(form.baseFare),
        gstPercent: 5,
      });
      setFareForm(prev => ({ ...prev, [routeId]: {} }));
      await fetchFares(routeId); // re-fetch so segment names resolve correctly
      toast.success('Fare added');
    } catch (e) { toast.error(e.message); }
  };

  const handleDeleteFare = async (routeId, fareId) => {
    try {
      await deleteFare(routeId, fareId);
      setFares(prev => ({ ...prev, [routeId]: prev[routeId].filter(f => f.id !== fareId) }));
      toast.success('Fare deleted');
    } catch (e) { toast.error(e.message); }
  };

  const startEditFare = (routeId, fare) => {
    setEditingFare(prev => ({
      ...prev,
      [routeId]: { fareId: fare.id, baseFare: String(fare.baseFare ?? '') }
    }));
  };

  const cancelEditFare = (routeId) => {
    setEditingFare(prev => ({ ...prev, [routeId]: null }));
  };

  const saveEditFare = async (routeId, fare) => {
    const edit = editingFare[routeId];
    const nextBaseFare = parseFloat(edit?.baseFare);
    if (!edit || !Number.isFinite(nextBaseFare) || nextBaseFare < 0) {
      return toast.error('Please enter a valid fare amount');
    }

    try {
      await updateFare(routeId, fare.id, {
        segmentId: getFareSegmentId(fare),
        seatType: fare.seatType,
        baseFare: nextBaseFare,
        gstPercent: fare.gstPercent ?? 5
      });
      setEditingFare(prev => ({ ...prev, [routeId]: null }));
      await fetchFares(routeId);
      toast.success('Fare updated');
    } catch (e) {
      toast.error(e.message || 'Failed to update fare');
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
      >
        <div className="flex justify-end mb-4">
          <button
            onClick={() => navigate(ROUTES.OPERATOR_CREATE_ROUTE)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-sm font-bold"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create Route
          </button>
        </div>
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

                    {/* Manage Fares */}
                    <div className="mb-6">
                      <button
                        onClick={() => toggleFares(route.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline mb-2"
                      >
                        <span className="material-symbols-outlined text-sm">payments</span>
                        {expandedFares === route.id ? 'Hide' : 'Manage'} Fares
                      </button>

                      {expandedFares === route.id && (
                        <div className="bg-white dark:bg-op-card rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                          {(fares[route.id] || []).length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-2">No fares set yet</p>
                          ) : (
                            // Group fares by segment for readability
                            Object.entries(
                              (fares[route.id] || []).reduce((acc, f) => {
                                const key = f.segmentId || f.segment?.id || 'unknown';
                                const label = f.segmentFromStop && f.segmentToStop
                                  ? `${f.segmentFromStop} → ${f.segmentToStop}`
                                  : f.segment?.fromStop && f.segment?.toStop
                                  ? `${f.segment.fromStop} → ${f.segment.toStop}`
                                  : (segments[route.id] || []).find(s => String(s.id) === String(key))
                                  ? `${segments[route.id].find(s => String(s.id) === String(key)).fromStop} → ${segments[route.id].find(s => String(s.id) === String(key)).toStop}`
                                  : 'Unknown segment';
                                if (!acc[label]) acc[label] = [];
                                acc[label].push(f);
                                return acc;
                              }, {})
                            ).map(([segLabel, segFares]) => (
                              <div key={segLabel} className="mb-2">
                                <p className="text-xs font-semibold text-slate-500 mb-1">{segLabel}</p>
                                {segFares.map(f => {
                                  const isEditing = editingFare[route.id]?.fareId === f.id;
                                  return (
                                    <div key={f.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg text-xs mb-1 gap-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-1.5 py-0.5 rounded font-bold bg-primary/10 text-primary">{f.seatType?.replace(/_/g, ' ')}</span>
                                        {isEditing ? (
                                          <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                            <input
                                              type="number"
                                              min="0"
                                              value={editingFare[route.id]?.baseFare || ''}
                                              onChange={e => setEditingFare(prev => ({
                                                ...prev,
                                                [route.id]: { ...prev[route.id], baseFare: e.target.value }
                                              }))}
                                              className="w-24 pl-5 pr-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                                            />
                                          </div>
                                        ) : (
                                          <span className="font-bold">₹{f.baseFare}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {isEditing ? (
                                          <>
                                            <button
                                              onClick={() => saveEditFare(route.id, f)}
                                              className="text-green-600 hover:text-green-700 font-semibold"
                                            >
                                              Save
                                            </button>
                                            <button
                                              onClick={() => cancelEditFare(route.id)}
                                              className="text-slate-500 hover:text-slate-700 font-semibold"
                                            >
                                              Cancel
                                            </button>
                                          </>
                                        ) : (
                                          <button
                                            onClick={() => startEditFare(route.id, f)}
                                            className="text-primary hover:text-primary/80 font-semibold"
                                          >
                                            Edit
                                          </button>
                                        )}
                                        <button onClick={() => handleDeleteFare(route.id, f.id)} className="text-red-400 hover:text-red-600">
                                          <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))
                          )}

                          {/* Add fare form — segment + fare only, GST defaults to 5 */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <select
                              value={fareForm[route.id]?.segmentId || ''}
                              onChange={e => setFareForm(prev => ({ ...prev, [route.id]: { ...prev[route.id], segmentId: e.target.value, seatType: '' } }))}
                              className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">Select segment *</option>
                              {(segments[route.id] || []).map(s => (
                                <option key={s.id} value={s.id}>{s.fromStop} → {s.toStop}</option>
                              ))}
                            </select>
                            {(() => {
                              const busType = schedules[route.id]?.[0]?.bus?.busType || '';
                              const t = busType.toUpperCase();
                              const selectedSegmentId = fareForm[route.id]?.segmentId || '';
                              const usedSeatTypes = new Set(
                                (fares[route.id] || [])
                                  .filter(f => getFareSegmentId(f) === String(selectedSegmentId))
                                  .map(f => String(f.seatType || '').toUpperCase())
                              );
                              const seatOptions = (() => {
                                if (t.includes('AC') && t.includes('SLEEPER')) return [['AC_SLEEPER','AC Sleeper']];
                                if (t.includes('SLEEPER')) return [['SLEEPER','Sleeper']];
                                if (t.includes('AC')) return [['AC_SEATER','AC Seater']];
                                if (t) return [['SEATER','Seater']];
                                return [['SEATER','Seater'],['SLEEPER','Sleeper'],['AC_SEATER','AC Seater'],['AC_SLEEPER','AC Sleeper']];
                              })();
                              return (
                            <select
                              value={fareForm[route.id]?.seatType || ''}
                              onChange={e => setFareForm(prev => ({ ...prev, [route.id]: { ...prev[route.id], seatType: e.target.value } }))}
                              disabled={!selectedSegmentId}
                              className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">Seat type *</option>
                              {/* Show only seat type(s) matching the bus on this route */}
                              {seatOptions.map(([val, label]) => (
                                <option key={val} value={val} disabled={!fareForm[route.id]?.segmentId || usedSeatTypes.has(val)}>
                                  {label}
                                  {fareForm[route.id]?.segmentId && usedSeatTypes.has(val) ? ' (Already added)' : ''}
                                </option>
                              ))}
                            </select>
                              );
                            })()}
                            <div className="relative col-span-2">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                              <input
                                type="number" min="0" placeholder="Base fare *"
                                value={fareForm[route.id]?.baseFare || ''}
                                onChange={e => setFareForm(prev => ({ ...prev, [route.id]: { ...prev[route.id], baseFare: e.target.value } }))}
                                className="w-full pl-6 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            <button
                              onClick={() => handleAddFare(route.id)}
                              className="col-span-2 px-3 py-1.5 bg-primary text-black text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">add</span>
                              Add Fare
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

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

                              {/* Boarding & Dropping Points */}
                              <div className="mt-3 border-t border-slate-100 dark:border-slate-700 pt-3">
                                <button
                                  onClick={() => toggleSchedulePoints(schedule.id)}
                                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                >
                                  <span className="material-symbols-outlined text-sm">location_on</span>
                                  {expandedSchedule === schedule.id ? 'Hide' : 'Manage'} Boarding/Dropping Points
                                </button>

                                {expandedSchedule === schedule.id && (
                                  <div className="mt-3 space-y-2">
                                    {(points[schedule.id] || []).length === 0 && (
                                      <p className="text-xs text-slate-400 text-center py-2">No points added yet</p>
                                    )}
                                    {(points[schedule.id] || []).map(p => (
                                      <div key={p.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg text-xs">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`px-1.5 py-0.5 rounded font-bold ${p.type === 'BOARDING' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                            {p.type}
                                          </span>
                                          <span className="font-medium">{p.name}</span>
                                          {p.arrivalTime && <span className="text-slate-400">{p.arrivalTime}</span>}
                                          {p.landmark && <span className="text-slate-400">· {p.landmark}</span>}
                                          {p.address && <span className="text-slate-400 truncate max-w-[120px]">{p.address}</span>}
                                        </div>
                                        <button onClick={() => handleDeletePoint(schedule.id, p.id)} className="text-red-400 hover:text-red-600 ml-2 shrink-0">
                                          <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                      </div>
                                    ))}

                                    {/* Add point form */}
                                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                      <input
                                        placeholder="Point name *"
                                        value={pointForm[schedule.id]?.name || ''}
                                        onChange={e => setPointForm(prev => ({ ...prev, [schedule.id]: { ...prev[schedule.id], name: e.target.value } }))}
                                        className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                                      />
                                      <select
                                        value={pointForm[schedule.id]?.type || ''}
                                        onChange={e => setPointForm(prev => ({ ...prev, [schedule.id]: { ...prev[schedule.id], type: e.target.value } }))}
                                        className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                                      >
                                        <option value="">Type *</option>
                                        <option value="BOARDING">Boarding</option>
                                        <option value="DROPPING">Dropping</option>
                                      </select>
                                      <input
                                        placeholder="Address"
                                        value={pointForm[schedule.id]?.address || ''}
                                        onChange={e => setPointForm(prev => ({ ...prev, [schedule.id]: { ...prev[schedule.id], address: e.target.value } }))}
                                        className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                                      />
                                      <input
                                        placeholder="Landmark"
                                        value={pointForm[schedule.id]?.landmark || ''}
                                        onChange={e => setPointForm(prev => ({ ...prev, [schedule.id]: { ...prev[schedule.id], landmark: e.target.value } }))}
                                        className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                                      />
                                      <input
                                        type="time"
                                        value={pointForm[schedule.id]?.arrivalTime || ''}
                                        onChange={e => setPointForm(prev => ({ ...prev, [schedule.id]: { ...prev[schedule.id], arrivalTime: e.target.value } }))}
                                        className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                                      />
                                      <button
                                        onClick={() => handleAddPoint(schedule.id)}
                                        className="px-3 py-1.5 bg-primary text-black text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                                      >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Add Point
                                      </button>
                                    </div>
                                  </div>
                                )}
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
