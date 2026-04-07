import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getRoutes, getRouteSegments, getRouteSchedules, deleteSchedule, deleteRoute, getPoints, addPoint, updatePoint, deletePoint, getFares, addFare, deleteFare, updateFare, startTrip, completeTrip, markDelay, updateSchedule } from '../../../api/routeService';
import { getDrivers, assignDriverToSchedule } from '../../../api/operatorDriverService';
import { getBuses } from '../../../api/busService';
import { toast } from 'sonner';
import { ROUTES } from '../../../shared/constants/routes';
import './OperatorDashboard.css';

const OPERATOR_SCHEDULE_STATE_KEY = 'tripgo_operator_schedule_runtime_state';

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
  const [pointForm, setPointForm] = useState({});
  const [fares, setFares] = useState({});           // { [routeId]: [...] }
  const [fareForm, setFareForm] = useState({});     // { [routeId]: { segmentId, seatType, baseFare, gstPercent } }
  const [editingFare, setEditingFare] = useState({}); // { [routeId]: { fareId, baseFare } }
  const [editingPoint, setEditingPoint] = useState({}); // { [scheduleId]: { pointId, ...fields } }
  const [fareModalRouteId, setFareModalRouteId] = useState(null);
  const [pointModal, setPointModal] = useState({ routeId: null, scheduleId: null });
  const [delayModal, setDelayModal] = useState({ routeId: null, scheduleId: null, delayMinutes: '', delayReason: '' });
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [assigningDriver, setAssigningDriver] = useState({});
  const [driverAssignModal, setDriverAssignModal] = useState({
    routeId: null,
    scheduleId: null,
    selectedDriverId: ''
  });
  const [editScheduleModal, setEditScheduleModal] = useState({
    routeId: null,
    scheduleId: null,
    busId: '',
    departureTime: '',
    arrivalTime: '',
    frequency: 'DAILY'
  });

  const readPersistedScheduleState = () => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(OPERATOR_SCHEDULE_STATE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  const writePersistedScheduleState = (updater) => {
    if (typeof window === 'undefined') return {};
    const current = readPersistedScheduleState();
    const next = typeof updater === 'function' ? updater(current) : updater;
    try {
      window.localStorage.setItem(OPERATOR_SCHEDULE_STATE_KEY, JSON.stringify(next));
    } catch {
      return current;
    }
    return next;
  };

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') { navigate('/'); return; }
    fetchRoutes();
    fetchDrivers();
    fetchBuses();
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

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const fetchDrivers = async () => {
    try {
      const data = await getDrivers();
      setDrivers(normalizeList(data));
    } catch {
      setDrivers([]);
    }
  };

  const fetchBuses = async () => {
    try {
      const data = await getBuses();
      setBuses(Array.isArray(data) ? data : []);
    } catch {
      setBuses([]);
    }
  };

  const normalizeTripStatus = (schedule) => String(
    schedule?.tripStatus ||
    schedule?.status ||
    schedule?.tripState ||
    schedule?.currentStatus ||
    'SCHEDULED'
  ).toUpperCase();

  const getScheduleDelayMinutes = (schedule) => {
    const values = [
      schedule?.delayMinutes,
      schedule?.delayedMinutes,
      schedule?.currentDelayMinutes,
      schedule?.delayInMinutes,
    ];
    const match = values.find((value) => Number.isFinite(Number(value)));
    return match === undefined ? 0 : Number(match);
  };

  const normalizeSchedule = (schedule) => {
    const persisted = readPersistedScheduleState()?.[schedule?.id] || {};
    const bus = schedule?.bus || buses.find((item) => String(item.id) === String(schedule?.busId)) || null;
    const merged = { ...persisted, ...schedule };
    const tripStatus = normalizeTripStatus(merged);
    const delayMinutes = getScheduleDelayMinutes(merged);
    return {
      ...schedule,
      ...persisted,
      bus,
      busId: merged?.busId || bus?.id || schedule?.bus?.id || '',
      tripStatus,
      status: tripStatus,
      driverId: merged?.driverId || merged?.assignedDriverId || merged?.driver?.id || merged?.assignedDriver?.id || '',
      assignedDriverId: merged?.assignedDriverId || merged?.driverId || merged?.driver?.id || merged?.assignedDriver?.id || '',
      driverName: merged?.driverName || merged?.assignedDriverName || merged?.driver?.name || merged?.assignedDriver?.name || '',
      assignedDriverName: merged?.assignedDriverName || merged?.driverName || merged?.driver?.name || merged?.assignedDriver?.name || '',
      actualDepartureTime: merged?.actualDepartureTime || merged?.startedAt || merged?.actualStartTime || null,
      actualArrivalTime: merged?.actualArrivalTime || merged?.completedAt || merged?.actualEndTime || null,
      delayMinutes,
      delayReason: merged?.delayReason || merged?.currentDelayReason || '',
    };
  };

  const persistSchedulePatch = (scheduleId, patch) => {
    writePersistedScheduleState((current) => ({
      ...current,
      [scheduleId]: {
        ...(current?.[scheduleId] || {}),
        ...patch,
      }
    }));
  };

  const fetchSegments = async (routeId) => {
    if (segments[routeId]) return;
    try {
      const data = await getRouteSegments(routeId);
      setSegments(prev => ({ ...prev, [routeId]: data }));
    } catch { /* silent */ }
  };

  const fetchSchedules = async (routeId, forceRefresh = false) => {
    if (!forceRefresh && schedules[routeId]) return schedules[routeId];
    try {
      const data = await getRouteSchedules(routeId);
      const list = (data || []).map(normalizeSchedule);
      setSchedules(prev => ({ ...prev, [routeId]: list }));
      return list;
    } catch {
      setSchedules(prev => ({ ...prev, [routeId]: [] }));
      return [];
    }
  };

  const fetchPoints = async (scheduleId) => {
    if (points[scheduleId]) return;
    try {
      const data = await getPoints(scheduleId);
      setPoints(prev => ({ ...prev, [scheduleId]: data }));
    } catch { setPoints(prev => ({ ...prev, [scheduleId]: [] })); }
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

  const startEditPoint = (scheduleId, point) => {
    setEditingPoint(prev => ({
      ...prev,
      [scheduleId]: {
        pointId: point.id,
        name: point.name || '',
        type: point.type || '',
        address: point.address || '',
        landmark: point.landmark || '',
        arrivalTime: point.arrivalTime || ''
      }
    }));
  };

  const cancelEditPoint = (scheduleId) => {
    setEditingPoint(prev => ({ ...prev, [scheduleId]: null }));
  };

  const saveEditPoint = async (scheduleId, pointId) => {
    const edit = editingPoint[scheduleId] || {};
    if (!edit.name || !edit.type) return toast.error('Name and type are required');
    try {
      const payload = {
        name: edit.name,
        type: edit.type,
        address: edit.address || '',
        landmark: edit.landmark || '',
        arrivalTime: edit.arrivalTime || null
      };
      const updated = await updatePoint(scheduleId, pointId, payload);
      setPoints(prev => ({
        ...prev,
        [scheduleId]: (prev[scheduleId] || []).map(p => (p.id === pointId ? { ...p, ...updated } : p))
      }));
      setEditingPoint(prev => ({ ...prev, [scheduleId]: null }));
      toast.success('Point updated');
    } catch (e) {
      toast.error(e.message || 'Failed to update point');
    }
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

  const normalizeStop = (value) => String(value || '').trim().toLowerCase();
  const normalizeSeatType = (value) => String(value || '').trim().toUpperCase();
  const parseSegmentId = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      if (value.id !== null && value.id !== undefined) return String(value.id);
      return '';
    }
    return String(value);
  };
  const getSegmentLabelFromStops = (fromStop, toStop) => `${normalizeStop(fromStop)}->${normalizeStop(toStop)}`;
  const getSegmentLabelFromText = (segmentName = '') => {
    const [fromStop, toStop] = String(segmentName).split('→').map(v => v?.trim());
    if (!fromStop || !toStop) return '';
    return getSegmentLabelFromStops(fromStop, toStop);
  };
  const getSelectedSegmentKey = (routeId, segmentId) => {
    const seg = (segments[routeId] || []).find(s => String(s.id) === String(segmentId));
    if (!seg) return { idKey: parseSegmentId(segmentId), labelKey: '' };
    return {
      idKey: String(seg.id),
      labelKey: getSegmentLabelFromStops(seg.fromStop, seg.toStop)
    };
  };
  const getFareSegmentKeys = (fare) => {
    const idKey = parseSegmentId(fare?.segmentId || fare?.segment?.id);
    const fromStop = fare?.segmentFromStop || fare?.segment?.fromStop || '';
    const toStop = fare?.segmentToStop || fare?.segment?.toStop || '';
    const labelKey = fromStop && toStop
      ? getSegmentLabelFromStops(fromStop, toStop)
      : getSegmentLabelFromText(fare?.segmentName);
    return { idKey, labelKey };
  };
  const isSameSegment = (selected, fareKeys) => {
    if (selected.idKey && fareKeys.idKey && selected.idKey === fareKeys.idKey) return true;
    if (selected.labelKey && fareKeys.labelKey && selected.labelKey === fareKeys.labelKey) return true;
    return false;
  };
  const fareExistsForRoute = (routeId, segmentId, seatType) => {
    const selectedSegment = getSelectedSegmentKey(routeId, segmentId);
    return (fares[routeId] || []).some(f => {
      const fareSegment = getFareSegmentKeys(f);
      return (
        isSameSegment(selectedSegment, fareSegment) &&
        normalizeSeatType(f.seatType) === normalizeSeatType(seatType)
      );
    });
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
        seatType: normalizeSeatType(form.seatType),
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
      const fareSegment = getFareSegmentKeys(fare);
      await updateFare(routeId, fare.id, {
        segmentId: fareSegment.idKey,
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

  const openManageFares = async (routeId) => {
    await fetchSegments(routeId);
    await fetchSchedules(routeId);
    await fetchFares(routeId);
    setFareModalRouteId(routeId);
  };

  const openManagePoints = async (routeId) => {
    const routeSchedules = await fetchSchedules(routeId);
    const firstSchedule = (routeSchedules || [])[0];
    if (!firstSchedule?.id) {
      toast.error('No schedules found for this route yet');
      return;
    }
    await fetchPoints(firstSchedule.id);
    setPointModal({ routeId, scheduleId: firstSchedule.id });
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

  const getTripStatus = (schedule) => normalizeTripStatus(schedule);

  const updateScheduleState = (routeId, scheduleId, patch) => {
    persistSchedulePatch(scheduleId, patch);
    setSchedules(prev => ({
      ...prev,
      [routeId]: (prev[routeId] || []).map(s =>
        String(s.id) === String(scheduleId) ? normalizeSchedule({ ...s, ...patch }) : s
      )
    }));
  };

  const handleStartTrip = async (routeId, scheduleId) => {
    try {
      const res = await startTrip(scheduleId);
      updateScheduleState(routeId, scheduleId, {
        tripStatus: res?.tripStatus || res?.status || 'STARTED',
        status: res?.status || res?.tripStatus || 'STARTED',
        actualDepartureTime: res?.actualDepartureTime || res?.startedAt || new Date().toISOString()
      });
      await fetchSchedules(routeId, true);
      toast.success('Trip started');
    } catch (e) {
      toast.error(e.message || 'Failed to start trip');
    }
  };

  const handleCompleteTrip = async (routeId, scheduleId) => {
    try {
      const res = await completeTrip(scheduleId);
      updateScheduleState(routeId, scheduleId, {
        tripStatus: res?.tripStatus || res?.status || 'COMPLETED',
        status: res?.status || res?.tripStatus || 'COMPLETED',
        actualArrivalTime: res?.actualArrivalTime || res?.completedAt || new Date().toISOString()
      });
      await fetchSchedules(routeId, true);
      toast.success('Trip completed');
    } catch (e) {
      toast.error(e.message || 'Failed to complete trip');
    }
  };

  const submitDelay = async () => {
    const { routeId, scheduleId, delayMinutes, delayReason } = delayModal;
    const mins = Number(delayMinutes);
    if (!routeId || !scheduleId || !Number.isFinite(mins) || mins <= 0) {
      toast.error('Enter valid delay minutes');
      return;
    }
    try {
      const res = await markDelay(scheduleId, mins, delayReason || '');
      updateScheduleState(routeId, scheduleId, {
        tripStatus: res?.tripStatus || res?.status || 'DELAYED',
        status: res?.status || res?.tripStatus || 'DELAYED',
        delayMinutes: res?.delayMinutes ?? res?.currentDelayMinutes ?? mins,
        delayReason: res?.delayReason ?? res?.currentDelayReason ?? (delayReason || '')
      });
      await fetchSchedules(routeId, true);
      setDelayModal({ routeId: null, scheduleId: null, delayMinutes: '', delayReason: '' });
      toast.success('Delay marked');
    } catch (e) {
      toast.error(e.message || 'Failed to mark delay');
    }
  };

  const getDriverName = (driver) => {
    if (typeof driver === 'string' && driver.trim()) return driver;
    if (!driver) return 'Not assigned';
    const fullName = `${driver.firstName || ''} ${driver.lastName || ''}`.trim();
    return fullName || driver.name || driver.phone || 'Assigned';
  };

  const getScheduleDriverId = (schedule) => (
    String(
      schedule?.driver?.id ||
      schedule?.assignedDriver?.id ||
      schedule?.driverId ||
      schedule?.assignedDriverId ||
      ''
    )
  );

  const hasAssignedDriver = (schedule) => Boolean(
    getScheduleDriverId(schedule) ||
    schedule?.driverName ||
    schedule?.assignedDriverName ||
    schedule?.driver?.name ||
    schedule?.assignedDriver?.name
  );

  const openAssignDriverModal = (routeId, schedule) => {
    if (!drivers.length) {
      toast.error('No drivers added yet. Add one in Drivers page.', {
        action: {
          label: 'Open Drivers',
          onClick: () => navigate(ROUTES.OPERATOR_DRIVERS)
        }
      });
      return;
    }
    setDriverAssignModal({
      routeId,
      scheduleId: schedule.id,
      selectedDriverId: getScheduleDriverId(schedule) || String(drivers[0].id)
    });
  };

  const handleAssignDriver = async (routeId, scheduleId, driverId) => {
    if (!driverId) {
      toast.error(drivers.length ? 'Please select a driver' : 'No drivers available. Add a driver first.');
      return;
    }
    const loadingToastId = toast.loading('Assigning driver...');
    try {
      setAssigningDriver(prev => ({ ...prev, [scheduleId]: true }));
      const assigned = drivers.find(d => String(d.id) === String(driverId));
      const response = await assignDriverToSchedule(scheduleId, driverId);
      updateScheduleState(routeId, scheduleId, {
        driver: response?.driver || assigned || { id: driverId },
        assignedDriver: response?.driver || assigned || { id: driverId },
        driverId: response?.driverId || String(driverId),
        assignedDriverId: response?.driverId || String(driverId),
        driverName: response?.driverName || getDriverName(assigned),
        assignedDriverName: response?.driverName || getDriverName(assigned),
        busId: response?.busId || undefined
      });
      await fetchSchedules(routeId, true);
      setDriverAssignModal({ routeId: null, scheduleId: null, selectedDriverId: '' });
      toast.success('Driver assigned successfully', { id: loadingToastId });
    } catch (e) {
      toast.error(e.message || 'Failed to assign driver', { id: loadingToastId });
    } finally {
      setAssigningDriver(prev => ({ ...prev, [scheduleId]: false }));
    }
  };

  const formatDateTimeLocal = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEditScheduleModal = (routeId, schedule) => {
    setEditScheduleModal({
      routeId,
      scheduleId: schedule.id,
      busId: schedule?.bus?.id ? String(schedule.bus.id) : '',
      departureTime: formatDateTimeLocal(schedule.departureTime),
      arrivalTime: formatDateTimeLocal(schedule.arrivalTime),
      frequency: schedule.frequency || 'DAILY'
    });
  };

  const closeEditScheduleModal = () => {
    setEditScheduleModal({
      routeId: null,
      scheduleId: null,
      busId: '',
      departureTime: '',
      arrivalTime: '',
      frequency: 'DAILY'
    });
  };

  const submitScheduleUpdate = async () => {
    const { routeId, scheduleId, busId, departureTime, arrivalTime, frequency } = editScheduleModal;
    if (!routeId || !scheduleId || !busId || !departureTime || !arrivalTime || !frequency) {
      toast.error('All schedule fields are required');
      return;
    }
    const dep = new Date(departureTime);
    const arr = new Date(arrivalTime);
    if (Number.isNaN(dep.getTime()) || Number.isNaN(arr.getTime())) {
      toast.error('Please enter valid date/time values');
      return;
    }
    if (arr <= dep) {
      toast.error('Arrival time must be after departure time');
      return;
    }

    const loadingToast = toast.loading('Updating schedule...');
    try {
      const updated = await updateSchedule(scheduleId, {
        busId,
        departureTime: dep.toISOString(),
        arrivalTime: arr.toISOString(),
        frequency
      });
      updateScheduleState(routeId, scheduleId, {
        ...updated,
        bus: updated?.bus || buses.find((b) => String(b.id) === String(busId))
      });
      toast.success('Schedule updated successfully', { id: loadingToast });
      closeEditScheduleModal();
    } catch (e) {
      toast.error(e.message || 'Failed to update schedule', { id: loadingToast });
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
                        onClick={(e) => { e.stopPropagation(); openManageFares(route.id); }}
                        className="px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Manage Fares
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openManagePoints(route.id); }}
                        className="px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Manage Points
                      </button>
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
                                    onClick={() => openEditScheduleModal(route.id, schedule)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                                  >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                  </button>
                                  <button
                                    onClick={() => setDeleteModal({ show: true, scheduleId: schedule.id, routeId: route.id, type: 'schedule' })}
                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                </div>
                              </div>
                              <div className="mb-3">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  getTripStatus(schedule) === 'COMPLETED'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : getTripStatus(schedule) === 'STARTED'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : getTripStatus(schedule) === 'DELAYED'
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                  Trip: {getTripStatus(schedule)}
                                </span>
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
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm">badge</span>
                                  Driver: {getDriverName(schedule.driver || schedule.assignedDriver || schedule.driverName || schedule.assignedDriverName)}
                                </div>
                                {schedule.actualDepartureTime && (
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                                    Started: {new Date(schedule.actualDepartureTime).toLocaleString()}
                                  </div>
                                )}
                                {schedule.actualArrivalTime && (
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">task_alt</span>
                                    Completed: {new Date(schedule.actualArrivalTime).toLocaleString()}
                                  </div>
                                )}
                                {getScheduleDelayMinutes(schedule) ? (
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">warning</span>
                                    Delayed by {getScheduleDelayMinutes(schedule)} min{schedule.delayReason ? ` · ${schedule.delayReason}` : ''}
                                  </div>
                                ) : null}
                              </div>
                              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
                                <div className="w-full flex items-center gap-2 mb-1">
                                  <button
                                    onClick={() => openAssignDriverModal(route.id, schedule)}
                                    disabled={!!assigningDriver[schedule.id]}
                                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
                                  >
                                    {hasAssignedDriver(schedule) ? 'Change Driver' : 'Assign Driver'}
                                  </button>
                                </div>
                                {(getTripStatus(schedule) === 'SCHEDULED' || getTripStatus(schedule) === 'DELAYED') && (
                                  <button
                                    onClick={() => handleStartTrip(route.id, schedule.id)}
                                    className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                  >
                                    Start Trip
                                  </button>
                                )}
                                {getTripStatus(schedule) === 'STARTED' && (
                                  <button
                                    onClick={() => handleCompleteTrip(route.id, schedule.id)}
                                    className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                                  >
                                    Complete Trip
                                  </button>
                                )}
                                {getTripStatus(schedule) !== 'COMPLETED' && (
                                  <button
                                    onClick={() => setDelayModal({
                                      routeId: route.id,
                                      scheduleId: schedule.id,
                                      delayMinutes: getScheduleDelayMinutes(schedule) ? String(getScheduleDelayMinutes(schedule)) : '',
                                      delayReason: schedule.delayReason || ''
                                    })}
                                    className="px-3 py-1.5 text-xs rounded-lg border border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                                  >
                                    Mark Delay
                                  </button>
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

      {fareModalRouteId && (() => {
        const routeId = fareModalRouteId;
        const route = routes.find(r => r.id === routeId);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-op-card rounded-xl p-5 w-full max-w-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Manage Fares {route ? `· ${route.name}` : ''}</h3>
                <button
                  onClick={() => setFareModalRouteId(null)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {(fares[routeId] || []).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">No fares set yet</p>
              ) : (
                Object.entries(
                  (fares[routeId] || []).reduce((acc, f) => {
                    const key = f.segmentId || f.segment?.id || 'unknown';
                    const label = f.segmentFromStop && f.segmentToStop
                      ? `${f.segmentFromStop} → ${f.segmentToStop}`
                      : f.segment?.fromStop && f.segment?.toStop
                      ? `${f.segment.fromStop} → ${f.segment.toStop}`
                      : (segments[routeId] || []).find(s => String(s.id) === String(key))
                      ? `${segments[routeId].find(s => String(s.id) === String(key)).fromStop} → ${segments[routeId].find(s => String(s.id) === String(key)).toStop}`
                      : 'Unknown segment';
                    if (!acc[label]) acc[label] = [];
                    acc[label].push(f);
                    return acc;
                  }, {})
                ).map(([segLabel, segFares]) => (
                  <div key={segLabel} className="mb-2">
                    <p className="text-xs font-semibold text-slate-500 mb-1">{segLabel}</p>
                    {segFares.map(f => {
                      const isEditing = editingFare[routeId]?.fareId === f.id;
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
                                  value={editingFare[routeId]?.baseFare || ''}
                                  onChange={e => setEditingFare(prev => ({
                                    ...prev,
                                    [routeId]: { ...prev[routeId], baseFare: e.target.value }
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
                                <button onClick={() => saveEditFare(routeId, f)} className="text-green-600 hover:text-green-700 font-semibold">Save</button>
                                <button onClick={() => cancelEditFare(routeId)} className="text-slate-500 hover:text-slate-700 font-semibold">Cancel</button>
                              </>
                            ) : (
                              <button onClick={() => startEditFare(routeId, f)} className="text-primary hover:text-primary/80 font-semibold">Edit</button>
                            )}
                            <button onClick={() => handleDeleteFare(routeId, f.id)} className="text-red-400 hover:text-red-600">
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-700">
                <select
                  value={fareForm[routeId]?.segmentId || ''}
                  onChange={e => setFareForm(prev => ({ ...prev, [routeId]: { ...prev[routeId], segmentId: e.target.value, seatType: '' } }))}
                  className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select segment *</option>
                  {(segments[routeId] || []).map(s => (
                    <option key={s.id} value={s.id}>{s.fromStop} → {s.toStop}</option>
                  ))}
                </select>
                {(() => {
                  const busType = schedules[routeId]?.[0]?.bus?.busType || '';
                  const t = busType.toUpperCase();
                  const selectedSegmentId = fareForm[routeId]?.segmentId || '';
                  const selectedSegment = getSelectedSegmentKey(routeId, selectedSegmentId);
                  const usedSeatTypes = new Set(
                    (fares[routeId] || [])
                      .filter(f => isSameSegment(selectedSegment, getFareSegmentKeys(f)))
                      .map(f => normalizeSeatType(f.seatType))
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
                      value={fareForm[routeId]?.seatType || ''}
                      onChange={e => setFareForm(prev => ({ ...prev, [routeId]: { ...prev[routeId], seatType: e.target.value } }))}
                      disabled={!selectedSegmentId}
                      className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Seat type *</option>
                      {seatOptions.map(([val, label]) => (
                        <option key={val} value={val} disabled={!fareForm[routeId]?.segmentId || usedSeatTypes.has(val)}>
                          {label}
                          {fareForm[routeId]?.segmentId && usedSeatTypes.has(val) ? ' (Already added)' : ''}
                        </option>
                      ))}
                    </select>
                  );
                })()}
                <div className="relative col-span-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                  <input
                    type="number" min="0" placeholder="Base fare *"
                    value={fareForm[routeId]?.baseFare || ''}
                    onChange={e => setFareForm(prev => ({ ...prev, [routeId]: { ...prev[routeId], baseFare: e.target.value } }))}
                    className="w-full pl-6 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={() => handleAddFare(routeId)}
                  className="col-span-2 px-3 py-1.5 bg-primary text-black text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Fare
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {pointModal.routeId && (() => {
        const routeId = pointModal.routeId;
        const route = routes.find(r => r.id === routeId);
        const routeSchedules = schedules[routeId] || [];
        const selectedScheduleId = pointModal.scheduleId;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-op-card rounded-xl p-5 w-full max-w-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Manage Boarding/Dropping {route ? `· ${route.name}` : ''}</h3>
                <button
                  onClick={() => setPointModal({ routeId: null, scheduleId: null })}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="mb-3">
                <label className="block text-xs text-slate-500 mb-1">Schedule</label>
                <select
                  value={selectedScheduleId || ''}
                  onChange={async (e) => {
                    const nextScheduleId = e.target.value;
                    setPointModal(prev => ({ ...prev, scheduleId: nextScheduleId }));
                    if (nextScheduleId) await fetchPoints(nextScheduleId);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  {routeSchedules.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.bus?.name || 'Bus'} ({new Date(s.departureTime).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {(points[selectedScheduleId] || []).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">No points added yet</p>
              )}
              {(points[selectedScheduleId] || []).map(p => {
                const isEditing = editingPoint[selectedScheduleId]?.pointId === p.id;
                return (
                  <div key={p.id} className="bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg text-xs mb-1">
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="Point name *"
                          value={editingPoint[selectedScheduleId]?.name || ''}
                          onChange={e => setEditingPoint(prev => ({ ...prev, [selectedScheduleId]: { ...prev[selectedScheduleId], name: e.target.value } }))}
                          className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-primary"
                        />
                        <select
                          value={editingPoint[selectedScheduleId]?.type || ''}
                          onChange={e => setEditingPoint(prev => ({ ...prev, [selectedScheduleId]: { ...prev[selectedScheduleId], type: e.target.value } }))}
                          className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="BOARDING">Boarding</option>
                          <option value="DROPPING">Dropping</option>
                        </select>
                        <input
                          placeholder="Address"
                          value={editingPoint[selectedScheduleId]?.address || ''}
                          onChange={e => setEditingPoint(prev => ({ ...prev, [selectedScheduleId]: { ...prev[selectedScheduleId], address: e.target.value } }))}
                          className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          placeholder="Landmark"
                          value={editingPoint[selectedScheduleId]?.landmark || ''}
                          onChange={e => setEditingPoint(prev => ({ ...prev, [selectedScheduleId]: { ...prev[selectedScheduleId], landmark: e.target.value } }))}
                          className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="time"
                          value={editingPoint[selectedScheduleId]?.arrivalTime || ''}
                          onChange={e => setEditingPoint(prev => ({ ...prev, [selectedScheduleId]: { ...prev[selectedScheduleId], arrivalTime: e.target.value } }))}
                          className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="flex items-center gap-3">
                          <button onClick={() => saveEditPoint(selectedScheduleId, p.id)} className="text-green-600 hover:text-green-700 font-semibold">Save</button>
                          <button onClick={() => cancelEditPoint(selectedScheduleId)} className="text-slate-500 hover:text-slate-700 font-semibold">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${p.type === 'BOARDING' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {p.type}
                          </span>
                          <span className="font-medium">{p.name}</span>
                          {p.arrivalTime && <span className="text-slate-400">{p.arrivalTime}</span>}
                          {p.landmark && <span className="text-slate-400">· {p.landmark}</span>}
                          {p.address && <span className="text-slate-400 truncate max-w-[180px]">{p.address}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEditPoint(selectedScheduleId, p)} className="text-primary hover:text-primary/80 font-semibold">Edit</button>
                          <button onClick={() => handleDeletePoint(selectedScheduleId, p.id)} className="text-red-400 hover:text-red-600 ml-2 shrink-0">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <input
                  placeholder="Point name *"
                  value={pointForm[selectedScheduleId]?.name || ''}
                  onChange={e => setPointForm(prev => ({ ...prev, [selectedScheduleId]: { ...prev[selectedScheduleId], name: e.target.value } }))}
                  className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                />
                <select
                  value={pointForm[selectedScheduleId]?.type || ''}
                  onChange={e => setPointForm(prev => ({ ...prev, [selectedScheduleId]: { ...prev[selectedScheduleId], type: e.target.value } }))}
                  className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Type *</option>
                  <option value="BOARDING">Boarding</option>
                  <option value="DROPPING">Dropping</option>
                </select>
                <input
                  placeholder="Address"
                  value={pointForm[selectedScheduleId]?.address || ''}
                  onChange={e => setPointForm(prev => ({ ...prev, [selectedScheduleId]: { ...prev[selectedScheduleId], address: e.target.value } }))}
                  className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  placeholder="Landmark"
                  value={pointForm[selectedScheduleId]?.landmark || ''}
                  onChange={e => setPointForm(prev => ({ ...prev, [selectedScheduleId]: { ...prev[selectedScheduleId], landmark: e.target.value } }))}
                  className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="time"
                  value={pointForm[selectedScheduleId]?.arrivalTime || ''}
                  onChange={e => setPointForm(prev => ({ ...prev, [selectedScheduleId]: { ...prev[selectedScheduleId], arrivalTime: e.target.value } }))}
                  className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => handleAddPoint(selectedScheduleId)}
                  className="px-3 py-1.5 bg-primary text-black text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Point
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {delayModal.scheduleId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-op-card rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4">Mark Delay</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Delay Minutes *</label>
                <input
                  type="number"
                  min="1"
                  value={delayModal.delayMinutes}
                  onChange={e => setDelayModal(prev => ({ ...prev, delayMinutes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Reason</label>
                <input
                  type="text"
                  value={delayModal.delayReason}
                  onChange={e => setDelayModal(prev => ({ ...prev, delayReason: e.target.value }))}
                  placeholder="Traffic, weather, etc."
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setDelayModal({ routeId: null, scheduleId: null, delayMinutes: '', delayReason: '' })}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitDelay}
                className="px-4 py-2 rounded-lg bg-yellow-500 text-black hover:bg-yellow-600 transition-colors font-semibold"
              >
                Save Delay
              </button>
            </div>
          </div>
        </div>
      )}

      {driverAssignModal.scheduleId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-op-card rounded-xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4">Assign Driver</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {drivers.map((driver) => (
                <label
                  key={driver.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    String(driverAssignModal.selectedDriverId) === String(driver.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="assign-driver"
                      checked={String(driverAssignModal.selectedDriverId) === String(driver.id)}
                      onChange={() => setDriverAssignModal(prev => ({ ...prev, selectedDriverId: String(driver.id) }))}
                    />
                    <div>
                      <p className="text-sm font-semibold">{getDriverName(driver)}</p>
                      <p className="text-xs text-slate-500">{driver.phone} · {driver.licenseNumber}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setDriverAssignModal({ routeId: null, scheduleId: null, selectedDriverId: '' })}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssignDriver(driverAssignModal.routeId, driverAssignModal.scheduleId, driverAssignModal.selectedDriverId)}
                disabled={!!assigningDriver[driverAssignModal.scheduleId]}
                className="px-4 py-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors font-semibold disabled:opacity-60"
              >
                {assigningDriver[driverAssignModal.scheduleId] ? 'Assigning...' : 'Confirm Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editScheduleModal.scheduleId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-op-card rounded-xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4">Edit Schedule</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Bus *</label>
                <select
                  value={editScheduleModal.busId}
                  onChange={(e) => setEditScheduleModal(prev => ({ ...prev, busId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="">Select bus</option>
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.name} ({bus.busCode}) · {bus.busType?.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Departure *</label>
                  <input
                    type="datetime-local"
                    value={editScheduleModal.departureTime}
                    onChange={(e) => setEditScheduleModal(prev => ({ ...prev, departureTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Arrival *</label>
                  <input
                    type="datetime-local"
                    value={editScheduleModal.arrivalTime}
                    onChange={(e) => setEditScheduleModal(prev => ({ ...prev, arrivalTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Frequency *</label>
                <select
                  value={editScheduleModal.frequency}
                  onChange={(e) => setEditScheduleModal(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="WEEKDAYS">Weekdays</option>
                  <option value="WEEKENDS">Weekends</option>
                  <option value="ONCE">One Time</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={closeEditScheduleModal}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitScheduleUpdate}
                className="px-4 py-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors font-semibold"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

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
