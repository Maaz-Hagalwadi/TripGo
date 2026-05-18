import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import {
  getRoutes, getRouteSegments, getRouteSchedules, deleteSchedule,
  getPoints, addPoint, updatePoint, deletePoint, getFares, addFare,
  deleteFare, updateFare, startTrip, completeTrip, markDelay,
  updateSchedule, createSchedule, copyPointsToSchedule,
  updateSegment, deleteSegment, addSegment, importPointsFromRoute,
} from '../../../api/routeService';
import { getDrivers, assignDriverToSchedule } from '../../../api/operatorDriverService';
import { getBuses } from '../../../api/busService';
import { apiPost } from '../../../api/apiClient';
import { toast } from 'sonner';
import { ROUTES } from '../../../shared/constants/routes';
import CenterScreenLoader from '../../../shared/components/ui/CenterScreenLoader';

/* ─── helpers ─── */
const isNumericValue = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const getLicenseDate = (d) => { if (!d?.licenseExpiry) return null; const e = new Date(d.licenseExpiry); if (Number.isNaN(e.getTime())) return null; e.setHours(0,0,0,0); return e; };
const isExpired = (d) => { const e = getLicenseDate(d); if (!e) return false; const t = new Date(); t.setHours(0,0,0,0); return e < t; };
const getDriverName = (d) => { if (typeof d === 'string' && d.trim()) return d; if (!d) return 'Not assigned'; return `${d.firstName||''} ${d.lastName||''}`.trim() || d.name || d.phone || 'Assigned'; };
const normalizeTripStatus = (s) => String(s?.tripStatus||s?.status||s?.tripState||s?.currentStatus||'SCHEDULED').toUpperCase();
const getDelayMinutes = (s) => { const v = [s?.delayMinutes,s?.delayedMinutes,s?.currentDelayMinutes,s?.delayInMinutes].find(isNumericValue); return v===undefined?0:Number(v); };
const formatDTL = (v) => { if(!v) return ''; const d=new Date(v); if(Number.isNaN(d.getTime())) return ''; const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const normalizeStop = (v) => String(v||'').trim().toLowerCase();
const normalizeSeatType = (v) => String(v||'').trim().toUpperCase();
const parseSegId = (v) => { if(v===null||v===undefined) return ''; if(typeof v==='object') return v.id!==null&&v.id!==undefined?String(v.id):''; return String(v); };
const getSegLabel = (f,from,to) => from&&to?`${normalizeStop(from)}->${normalizeStop(to)}`:'';

const TABS = [
  { key: 'schedules', label: 'Schedules', icon: 'schedule' },
  { key: 'segments',  label: 'Segments',  icon: 'route' },
  { key: 'fares',     label: 'Fares',     icon: 'payments' },
  { key: 'points',    label: 'Points',    icon: 'pin_drop' },
];

const TRIP_COLORS = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  STARTED:   'bg-blue-50 text-blue-700 border-blue-200',
  DELAYED:   'bg-amber-50 text-amber-700 border-amber-200',
};

const RouteDetail = () => {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [route, setRoute] = useState(null);
  const [activeTab, setActiveTab] = useState('schedules');
  const [blockingLoader, setBlockingLoader] = useState(null);

  const [segments, setSegments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [fares, setFares] = useState([]);
  const [points, setPoints] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [schedulePage, setSchedulePage] = useState(0);
  const SCHED_PAGE_SIZE = 10;

  /* ─── modals ─── */
  const [addScheduleModal, setAddScheduleModal] = useState({ open: false, busId: '', departureTime: '', arrivalTime: '', frequency: 'DAILY' });
  const [editScheduleModal, setEditScheduleModal] = useState(null);
  const [deleteScheduleModal, setDeleteScheduleModal] = useState(null);
  const [driverModal, setDriverModal] = useState(null);
  const [delayModal, setDelayModal] = useState(null);
  const [editingSegment, setEditingSegment] = useState(null);
  const [showAddSegment, setShowAddSegment] = useState(false);
  const [addSegmentForm, setAddSegmentForm] = useState({});
  const [fareForm, setFareForm] = useState({ busId: '', segmentId: '', seatType: '', baseFare: '' });
  const [editingFare, setEditingFare] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [pointForm, setPointForm] = useState({});
  const [editingPoint, setEditingPoint] = useState(null);
  const [copyTarget, setCopyTarget] = useState('');
  const [selectedScheduleIds, setSelectedScheduleIds] = useState(new Set());
  const [selectedSegmentIds, setSelectedSegmentIds] = useState(new Set());
  const [selectedFareIds, setSelectedFareIds] = useState(new Set());
  const [selectedBoardingIds, setSelectedBoardingIds] = useState(new Set());
  const [selectedDroppingIds, setSelectedDroppingIds] = useState(new Set());
  const [addPointModal, setAddPointModal] = useState(null);

  const run = async (label, fn) => { setBlockingLoader(label); try { return await fn(); } finally { setBlockingLoader(null); } };

  /* ─── bootstrap ─── */
  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') { navigate('/'); return; }
    (async () => {
      try {
        setLoadingPage(true);
        const [allRoutes, segs, scheds, faresData, driversData, busesData] = await Promise.all([
          getRoutes(),
          getRouteSegments(routeId),
          getRouteSchedules(routeId),
          getFares(routeId),
          getDrivers(),
          getBuses(),
        ]);
        const found = (allRoutes||[]).find(r => String(r.id) === String(routeId));
        setRoute(found || null);
        setSegments(segs || []);
        const activeBuses = Array.isArray(busesData) ? busesData.filter(b => b?.active) : [];
        setBuses(activeBuses);
        const normScheds = (scheds || [])
          .map(s => normalizeSchedule(s, activeBuses))
          .sort((a, b) => new Date(b.departureTime) - new Date(a.departureTime));
        setSchedules(normScheds);
        setFares(Array.isArray(faresData) ? faresData : []);
        setDrivers(normalizeList(driversData));
        if (normScheds.length > 0) setSelectedScheduleId(normScheds[0].id);
      } catch (e) {
        toast.error('Failed to load route details');
      } finally {
        setLoadingPage(false);
      }
    })();
  }, [user, loading, routeId]);

  const normalizeList = (d) => Array.isArray(d)?d:Array.isArray(d?.content)?d.content:Array.isArray(d?.data)?d.data:[];
  const normalizeSchedule = (s, busArr = buses) => {
    const bus = s?.bus || busArr.find(b => String(b.id) === String(s?.busId)) || null;
    const tripStatus = normalizeTripStatus(s);
    return {
      ...s, bus, busId: s?.busId||bus?.id||s?.bus?.id||'',
      tripStatus, status: tripStatus,
      driverName: s?.driverName||s?.assignedDriverName||s?.driver?.name||s?.assignedDriver?.name||'',
      actualDepartureTime: s?.actualDepartureTime||s?.startedAt||null,
      actualArrivalTime: s?.actualArrivalTime||s?.completedAt||null,
      delayMinutes: getDelayMinutes(s),
      delayReason: s?.delayReason||s?.currentDelayReason||'',
    };
  };
  const patchSchedule = (id, patch) => setSchedules(prev => prev.map(s => String(s.id)===String(id)?normalizeSchedule({...s,...patch}):s));
  const getScheduleDriverId = (s) => String(s?.driver?.id||s?.assignedDriver?.id||s?.driverId||s?.assignedDriverId||'');
  const hasDriver = (s) => Boolean(getScheduleDriverId(s)||s?.driverName||s?.assignedDriverName||s?.driver?.name||s?.assignedDriver?.name);

  /* ─── schedule actions ─── */
  const submitAddSchedule = async () => {
    const { busId, departureTime, arrivalTime, frequency } = addScheduleModal;
    if (segments.length === 0) { toast.error('Add at least one segment to this route before creating a schedule.'); return; }
    if (!busId||!departureTime||!arrivalTime) { toast.error('All fields required'); return; }
    const dep = new Date(departureTime), arr = new Date(arrivalTime);
    if (arr <= dep) { toast.error('Arrival must be after departure'); return; }
    await run('Creating schedule...', async () => {
      await createSchedule(routeId, { busId, departureTime: dep.toISOString(), arrivalTime: arr.toISOString(), frequency });
      const fresh = await getRouteSchedules(routeId);
      setSchedules((fresh||[]).map(s => normalizeSchedule(s)).sort((a, b) => new Date(b.departureTime) - new Date(a.departureTime)));
      toast.success('Schedule created');
      setAddScheduleModal({ open: false, busId: '', departureTime: '', arrivalTime: '', frequency: 'DAILY' });
    });
  };
  const submitEditSchedule = async () => {
    const { id, busId, departureTime, arrivalTime, frequency } = editScheduleModal;
    if (!busId||!departureTime||!arrivalTime) { toast.error('All fields required'); return; }
    const dep = new Date(departureTime), arr = new Date(arrivalTime);
    if (arr <= dep) { toast.error('Arrival must be after departure'); return; }
    await run('Saving schedule...', async () => {
      const updated = await updateSchedule(id, { busId, departureTime: dep.toISOString(), arrivalTime: arr.toISOString(), frequency });
      patchSchedule(id, { ...updated, bus: updated?.bus||buses.find(b => String(b.id)===String(busId)) });
      toast.success('Schedule updated');
      setEditScheduleModal(null);
    });
  };
  const confirmDeleteSchedule = async () => {
    await run('Deleting schedule...', async () => {
      await deleteSchedule(deleteScheduleModal);
      setSchedules(prev => prev.filter(s => s.id !== deleteScheduleModal));
      toast.success('Schedule deleted');
      setDeleteScheduleModal(null);
    });
  };
  const handleStartTrip = async (id) => {
    await run('Starting trip...', async () => {
      const res = await startTrip(id);
      patchSchedule(id, { tripStatus: res?.tripStatus||'STARTED', actualDepartureTime: res?.actualDepartureTime||new Date().toISOString() });
      toast.success('Trip started');
    });
  };
  const handleCompleteTrip = async (id) => {
    await run('Completing trip...', async () => {
      const res = await completeTrip(id);
      patchSchedule(id, { tripStatus: res?.tripStatus||'COMPLETED', actualArrivalTime: res?.actualArrivalTime||new Date().toISOString() });
      toast.success('Trip completed');
    });
  };
  const handleShareLocation = (scheduleId) => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported by your browser'); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await apiPost(`/tracking/${scheduleId}`, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speedKmph: pos.coords.speed != null ? pos.coords.speed * 3.6 : 0,
            heading: pos.coords.heading ?? 0,
          });
          toast.success('Location shared with passengers');
        } catch {
          toast.error('Failed to share location');
        }
      },
      () => toast.error('Location access denied. Please allow location in browser settings.')
    );
  };
  const submitDelay = async () => {
    const { id, minutes, reason } = delayModal;
    const mins = Number(minutes);
    if (!Number.isFinite(mins)||mins<=0) { toast.error('Enter valid delay minutes'); return; }
    await run('Marking delay...', async () => {
      const res = await markDelay(id, mins, reason||'');
      patchSchedule(id, { tripStatus: res?.tripStatus||'DELAYED', delayMinutes: res?.delayMinutes??mins, delayReason: res?.delayReason??reason });
      setDelayModal(null);
      toast.success('Delay marked');
    });
  };
  const openAssignDriver = (schedule) => {
    if (!drivers.length) { toast.error('No drivers added yet. Add one in the Drivers page.'); return; }
    setDriverModal({ scheduleId: schedule.id, selectedId: getScheduleDriverId(schedule)||String(drivers[0].id) });
  };
  const confirmAssignDriver = async () => {
    const { scheduleId, selectedId } = driverModal;
    const driver = drivers.find(d => String(d.id)===String(selectedId));
    if (driver && isExpired(driver)) { toast.error('Expired license — cannot assign'); return; }
    await run('Assigning driver...', async () => {
      const res = await assignDriverToSchedule(scheduleId, selectedId);
      patchSchedule(scheduleId, {
        driver: res?.driver||driver||{id:selectedId},
        driverName: res?.driverName||getDriverName(driver),
      });
      setDriverModal(null);
      toast.success('Driver assigned');
    });
  };

  /* ─── segment actions ─── */
  const handleSaveSegment = async () => {
    if (!editingSegment?.fromStop?.trim()||!editingSegment?.toStop?.trim()) { toast.error('From/To stop required'); return; }
    await run('Saving segment...', async () => {
      const updated = await updateSegment(routeId, editingSegment.id, { fromStop: editingSegment.fromStop, toStop: editingSegment.toStop, distanceKm: Number(editingSegment.distanceKm)||0, durationMinutes: Number(editingSegment.durationMinutes)||0 });
      setSegments(prev => prev.map(s => String(s.id)===String(editingSegment.id)?{...s,...updated}:s));
      setEditingSegment(null);
      toast.success('Segment updated');
    });
  };
  const handleDeleteSegment = async (id) => {
    await run('Deleting segment...', async () => {
      await deleteSegment(routeId, id);
      setSegments(prev => prev.filter(s => String(s.id)!==String(id)));
      setFares(prev => prev.filter(f => String(f?.segmentId||f?.segment?.id)!==String(id)));
      toast.success('Segment deleted');
    });
  };
  const handleAddSegment = async () => {
    if (!addSegmentForm.fromStop?.trim()||!addSegmentForm.toStop?.trim()) { toast.error('From/To stop required'); return; }
    await run('Adding segment...', async () => {
      const created = await addSegment(routeId, { fromStop: addSegmentForm.fromStop.trim(), toStop: addSegmentForm.toStop.trim(), distanceKm: Number(addSegmentForm.distanceKm)||0, durationMinutes: Number(addSegmentForm.durationMinutes)||0 });
      setSegments(prev => [...prev, created]);
      setAddSegmentForm({});
      setShowAddSegment(false);
      toast.success('Segment added');
    });
  };

  /* ─── fare helpers ─── */
  const getFareSegKeys = (f) => {
    const idKey = parseSegId(f?.segmentId||f?.segment?.id);
    const from = f?.segmentFromStop||f?.segment?.fromStop||'';
    const to = f?.segmentToStop||f?.segment?.toStop||'';
    return { idKey, labelKey: getSegLabel(f, from, to) };
  };
  const getSelSegKey = () => {
    const seg = segments.find(s => String(s.id)===String(fareForm.segmentId));
    if (!seg) return { idKey: String(fareForm.segmentId||''), labelKey: '' };
    return { idKey: String(seg.id), labelKey: getSegLabel(null, seg.fromStop, seg.toStop) };
  };
  const isSameSeg = (sel, fk) => {
    if (sel.idKey&&fk.idKey&&sel.idKey===fk.idKey) return true;
    if (sel.labelKey&&fk.labelKey&&sel.labelKey===fk.labelKey) return true;
    return false;
  };
  const usedSeatTypes = new Set(
    fares.filter(f => {
      const fk = getFareSegKeys(f);
      const sel = getSelSegKey();
      return isSameSeg(sel, fk) && String(f?.busId||f?.bus?.id||'')===String(fareForm.busId||'');
    }).map(f => normalizeSeatType(f.seatType))
  );
  const seatOptions = (() => {
    const t = (schedules[0]?.bus?.busType||'').toUpperCase();
    if (t.includes('AC')&&t.includes('SLEEPER')) return [['AC_SLEEPER','AC Sleeper']];
    if (t.includes('SLEEPER')) return [['SLEEPER','Sleeper']];
    if (t.includes('AC')) return [['AC_SEATER','AC Seater']];
    if (t) return [['SEATER','Seater']];
    return [['SEATER','Seater'],['SLEEPER','Sleeper'],['AC_SEATER','AC Seater'],['AC_SLEEPER','AC Sleeper']];
  })();
  const handleAddFare = async () => {
    const { busId, segmentId, seatType, baseFare } = fareForm;
    if (!segmentId||!seatType||!baseFare) { toast.error('Segment, seat type and fare required'); return; }
    await run('Saving fare...', async () => {
      const created = await addFare(routeId, { segmentId, seatType: normalizeSeatType(seatType), baseFare: parseFloat(baseFare), gstPercent: 5, busId: busId||null });
      const seg = segments.find(s => String(s.id)===String(segmentId));
      const bus = schedules.find(s => String(s.bus?.id)===String(busId))?.bus;
      setFares(prev => [...prev, { ...created, segmentFromStop: seg?.fromStop||'', segmentToStop: seg?.toStop||'', segmentName: seg?`${seg.fromStop}→${seg.toStop}`:'', bus: created?.bus||bus||null, busName: created?.busName||bus?.name||'' }]);
      setFareForm({ busId: '', segmentId: '', seatType: '', baseFare: '' });
      toast.success('Fare added');
    });
  };
  const handleDeleteFare = async (id) => {
    await run('Removing fare...', async () => {
      await deleteFare(routeId, id);
      setFares(prev => prev.filter(f => f.id !== id));
      toast.success('Fare deleted');
    });
  };
  const saveEditFare = async (fare) => {
    const next = parseFloat(editingFare?.baseFare);
    if (!Number.isFinite(next)||next<0) { toast.error('Valid fare amount required'); return; }
    await run('Saving fare...', async () => {
      const fk = getFareSegKeys(fare);
      await updateFare(routeId, fare.id, { segmentId: fk.idKey, seatType: fare.seatType, baseFare: next, gstPercent: fare.gstPercent??5, busId: fare?.busId||fare?.bus?.id||null });
      setFares(prev => prev.map(f => String(f.id)===String(fare.id)?{...f,baseFare:next}:f));
      setEditingFare(null);
      toast.success('Fare updated');
    });
  };

  /* ─── points actions ─── */
  useEffect(() => {
    if (selectedScheduleId && !points[selectedScheduleId]) {
      getPoints(selectedScheduleId).then(d => setPoints(p => ({ ...p, [selectedScheduleId]: d||[] }))).catch(() => {});
    }
  }, [selectedScheduleId]);
  const handleAddPoint = async () => {
    if (!pointForm.name||!pointForm.type) { toast.error('Name and type required'); return; }
    await run('Adding point...', async () => {
      const created = await addPoint(selectedScheduleId, pointForm);
      setPoints(prev => ({ ...prev, [selectedScheduleId]: [...(prev[selectedScheduleId]||[]), created] }));
      setPointForm({});
      setAddPointModal(null);
      toast.success('Point added');
    });
  };
  const handleDeletePoint = async (pid) => {
    await run('Removing point...', async () => {
      await deletePoint(selectedScheduleId, pid);
      setPoints(prev => ({ ...prev, [selectedScheduleId]: prev[selectedScheduleId].filter(p => p.id!==pid) }));
      toast.success('Point deleted');
    });
  };
  const saveEditPoint = async () => {
    if (!editingPoint?.name||!editingPoint?.type) { toast.error('Name and type required'); return; }
    await run('Saving point...', async () => {
      const { pointId, ...payload } = editingPoint;
      const updated = await updatePoint(selectedScheduleId, pointId, payload);
      setPoints(prev => ({ ...prev, [selectedScheduleId]: prev[selectedScheduleId].map(p => p.id===pointId?{...p,...updated}:p) }));
      setEditingPoint(null);
      toast.success('Point updated');
    });
  };
  const submitCopyPoints = async () => {
    if (!copyTarget) { toast.error('Select a target schedule'); return; }
    await run('Copying points...', async () => {
      await copyPointsToSchedule(selectedScheduleId, copyTarget);
      setCopyTarget('');
      toast.success('Points copied');
    });
  };

  /* ─── checkbox helpers ─── */
  const toggleId = (setter, id) => setter(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleBulkDeleteSchedules = async () => {
    const ids = [...selectedScheduleIds];
    if (!ids.length) return;
    await run(`Deleting ${ids.length} schedule(s)...`, async () => {
      await Promise.all(ids.map(id => deleteSchedule(id)));
      setSchedules(prev => prev.filter(s => !ids.includes(s.id)));
      setSelectedScheduleIds(new Set());
      toast.success(`${ids.length} schedule(s) deleted`);
    });
  };
  const handleBulkDeleteSegments = async () => {
    const ids = [...selectedSegmentIds];
    if (!ids.length) return;
    await run(`Deleting ${ids.length} segment(s)...`, async () => {
      await Promise.all(ids.map(id => deleteSegment(routeId, id)));
      setSegments(prev => prev.filter(s => !ids.includes(String(s.id))));
      setFares(prev => prev.filter(f => !ids.includes(String(f?.segmentId||f?.segment?.id))));
      setSelectedSegmentIds(new Set());
      toast.success(`${ids.length} segment(s) deleted`);
    });
  };
  const handleBulkDeleteFares = async () => {
    const ids = [...selectedFareIds];
    if (!ids.length) return;
    await run(`Deleting ${ids.length} fare(s)...`, async () => {
      await Promise.all(ids.map(id => deleteFare(routeId, id)));
      setFares(prev => prev.filter(f => !ids.includes(f.id)));
      setSelectedFareIds(new Set());
      toast.success(`${ids.length} fare(s) deleted`);
    });
  };
  const handleBulkDeletePoints = async () => {
    const bIds = [...selectedBoardingIds];
    const dIds = [...selectedDroppingIds];
    const all = [...bIds, ...dIds];
    if (!all.length) return;
    await run(`Deleting ${all.length} point(s)...`, async () => {
      await Promise.all(all.map(id => deletePoint(selectedScheduleId, id)));
      setPoints(prev => ({ ...prev, [selectedScheduleId]: (prev[selectedScheduleId]||[]).filter(p => !all.includes(p.id)) }));
      setSelectedBoardingIds(new Set());
      setSelectedDroppingIds(new Set());
      toast.success(`${all.length} point(s) deleted`);
    });
  };

  /* ─── grouped fares ─── */
  const groupedFares = fares.reduce((acc, f) => {
    const from = f.segmentFromStop||f.segment?.fromStop||'';
    const to = f.segmentToStop||f.segment?.toStop||'';
    const key = from&&to?`${from} → ${to}`:segments.find(s=>String(s.id)===String(f.segmentId||f.segment?.id))?`${segments.find(s=>String(s.id)===String(f.segmentId||f.segment?.id)).fromStop} → ${segments.find(s=>String(s.id)===String(f.segmentId||f.segment?.id)).toStop}`:'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  if (loadingPage) {
    return (
      <OperatorLayout activeItem="schedules" title="Route Details">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#002046]/20 border-t-[#002046] mx-auto mb-4" />
            <p className="text-sm text-slate-500">Loading route details...</p>
          </div>
        </div>
      </OperatorLayout>
    );
  }

  if (!route) {
    return (
      <OperatorLayout activeItem="schedules" title="Route Not Found">
        <div className="text-center py-16">
          <p className="text-slate-500 mb-4">Route not found.</p>
          <button onClick={() => navigate(ROUTES.OPERATOR_SCHEDULES)} className="px-4 py-2 rounded-xl bg-[#002046] text-white text-sm font-bold">Back to Routes</button>
        </div>
      </OperatorLayout>
    );
  }

  return (
    <>
      {blockingLoader && <CenterScreenLoader label={blockingLoader} description="Please wait..." />}

      <OperatorLayout activeItem="schedules" title={route.name}>
        <div className="space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(ROUTES.OPERATOR_SCHEDULES)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors flex-shrink-0">
              <span className="material-symbols-outlined text-base">arrow_back</span>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-black text-slate-900">{route.name}</h1>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <span className="material-symbols-outlined text-xs">location_on</span>
                <span>{route.origin}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                <span className="material-symbols-outlined text-xs">location_on</span>
                <span>{route.destination}</span>
                {route.totalDistanceKm && <span className="ml-1 text-slate-400">· {route.totalDistanceKm} km</span>}
              </div>
            </div>
            {activeTab === 'schedules' && (
              <button onClick={() => setAddScheduleModal(p => ({...p, open:true}))} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002046] text-white text-sm font-bold hover:bg-[#003a80] transition-colors shadow-sm flex-shrink-0">
                <span className="material-symbols-outlined text-sm">add</span>
                Add Schedule
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-5 py-3.5 text-xs font-bold transition-colors border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? 'border-[#002046] text-[#002046] bg-[#002046]/[0.02]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                  {tab.label}
                  {tab.key === 'schedules' && schedules.length > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab==='schedules'?'bg-[#002046] text-white':'bg-slate-100 text-slate-500'}`}>{schedules.length}</span>
                  )}
                  {tab.key === 'segments' && segments.length > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab==='segments'?'bg-[#002046] text-white':'bg-slate-100 text-slate-500'}`}>{segments.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── SCHEDULES TAB ── */}
            {activeTab === 'schedules' && (() => {
              const totalSchedPages = Math.ceil(schedules.length / SCHED_PAGE_SIZE);
              const pagedSchedules = schedules.slice(schedulePage * SCHED_PAGE_SIZE, (schedulePage + 1) * SCHED_PAGE_SIZE);
              return (
              <div>
                {/* Sticky action bar */}
                {selectedScheduleIds.size > 0 && (() => {
                  const sel = schedules.filter(s => selectedScheduleIds.has(s.id));
                  const one = sel.length === 1 ? sel[0] : null;
                  const ts = one ? normalizeTripStatus(one) : null;
                  return (
                    <div className="sticky top-0 z-20 flex items-center gap-2 px-5 py-2.5 bg-white border-b border-slate-200 shadow-sm flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#002046] text-white text-[10px] font-black">{selectedScheduleIds.size} selected</span>
                      {one && <button onClick={() => openAssignDriver(one)} className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors border border-slate-200"><span className="material-symbols-outlined text-xs">badge</span>Assign Driver</button>}
                      {one && (ts==='SCHEDULED'||ts==='DELAYED') && <button onClick={() => handleStartTrip(one.id)} disabled={Boolean(blockingLoader)} className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 disabled:opacity-60 transition-colors"><span className="material-symbols-outlined text-xs">play_arrow</span>Start Trip</button>}
                      {one && ts==='STARTED' && <button onClick={() => handleCompleteTrip(one.id)} disabled={Boolean(blockingLoader)} className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"><span className="material-symbols-outlined text-xs">task_alt</span>Complete Trip</button>}
                      {one && ts==='STARTED' && <button onClick={() => handleShareLocation(one.id)} className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition-colors"><span className="material-symbols-outlined text-xs">my_location</span>Share Location</button>}
                      {one && ts!=='COMPLETED' && <button onClick={() => setDelayModal({ id: one.id, minutes: getDelayMinutes(one)?String(getDelayMinutes(one)):'', reason: one.delayReason||'' })} className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"><span className="material-symbols-outlined text-xs">warning</span>Mark Delay</button>}
                      {one && <button onClick={() => setEditScheduleModal({ id: one.id, busId: String(one.bus?.id||''), departureTime: formatDTL(one.departureTime), arrivalTime: formatDTL(one.arrivalTime), frequency: one.frequency||'DAILY' })} className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors border border-slate-200"><span className="material-symbols-outlined text-xs">edit</span>Edit</button>}
                      <button onClick={handleBulkDeleteSchedules} disabled={Boolean(blockingLoader)} className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 disabled:opacity-60 transition-colors"><span className="material-symbols-outlined text-xs">delete</span>Delete</button>
                      <button onClick={() => setSelectedScheduleIds(new Set())} className="px-3 py-1 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors">Clear</button>
                    </div>
                  );
                })()}
                <div className="overflow-x-auto">
                  {schedules.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-slate-400 text-2xl">schedule</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-600 mb-1">No schedules yet</p>
                      <p className="text-xs text-slate-400 mb-4">Add a schedule to start assigning buses and drivers</p>
                      <button onClick={() => setAddScheduleModal(p=>({...p,open:true}))} className="px-4 py-2 rounded-xl bg-[#002046] text-white text-sm font-bold hover:bg-[#003a80] transition-colors">Add First Schedule</button>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80">
                          <th className="pl-5 pr-2 py-3.5 w-10">
                            <input type="checkbox" checked={selectedScheduleIds.size === pagedSchedules.length && pagedSchedules.length > 0} onChange={() => setSelectedScheduleIds(selectedScheduleIds.size === pagedSchedules.length ? new Set() : new Set(pagedSchedules.map(s => s.id)))} className="w-4 h-4 rounded accent-[#002046] cursor-pointer" />
                          </th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Bus</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Departure</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Arrival</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Frequency</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Trip Status</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Driver</th>
                          <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pagedSchedules.map(schedule => {
                          const tripStatus = normalizeTripStatus(schedule);
                          const busInitials = (schedule.bus?.name||'BUS').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
                          const driverLabel = getDriverName(schedule.driver||schedule.assignedDriver||schedule.driverName||schedule.assignedDriverName);
                          const isChecked = selectedScheduleIds.has(schedule.id);
                          return (
                            <tr key={schedule.id} className={`hover:bg-slate-50/70 transition-colors ${isChecked ? 'bg-[#002046]/[0.02]' : ''}`}>
                              <td className="pl-5 pr-2 py-4">
                                <input type="checkbox" checked={isChecked} onChange={() => toggleId(setSelectedScheduleIds, schedule.id)} className="w-4 h-4 rounded accent-[#002046] cursor-pointer" />
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-[#002046] flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-[10px] font-black">{busInitials}</span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{schedule.bus?.name||'Bus'}</p>
                                    <p className="text-[10px] text-slate-400">{schedule.bus?.busCode}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-sm text-slate-700">{new Date(schedule.departureTime).toLocaleString()}</p>
                                {schedule.actualDepartureTime && <p className="text-[10px] text-blue-500 mt-0.5">Started: {new Date(schedule.actualDepartureTime).toLocaleString()}</p>}
                              </td>
                              <td className="px-5 py-4 hidden md:table-cell">
                                <p className="text-sm text-slate-700">{new Date(schedule.arrivalTime).toLocaleString()}</p>
                                {schedule.actualArrivalTime && <p className="text-[10px] text-emerald-500 mt-0.5">Done: {new Date(schedule.actualArrivalTime).toLocaleString()}</p>}
                              </td>
                              <td className="px-5 py-4 hidden lg:table-cell">
                                <span className="text-xs text-slate-500">{schedule.frequency}</span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="space-y-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${TRIP_COLORS[tripStatus]||'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                    {tripStatus}
                                  </span>
                                  {getDelayMinutes(schedule) > 0 && (
                                    <p className="text-[10px] text-amber-600">{getDelayMinutes(schedule)} min delay{schedule.delayReason?` · ${schedule.delayReason}`:''}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-4 hidden xl:table-cell">
                                <span className="text-sm text-slate-600">{driverLabel}</span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => openAssignDriver(schedule)} title={hasDriver(schedule)?'Change Driver':'Assign Driver'} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors">
                                    <span className="material-symbols-outlined text-sm">badge</span>
                                  </button>
                                  {(tripStatus==='SCHEDULED'||tripStatus==='DELAYED') && (
                                    <button onClick={() => handleStartTrip(schedule.id)} title="Start Trip" className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                                      <span className="material-symbols-outlined text-sm">play_arrow</span>
                                    </button>
                                  )}
                                  {tripStatus==='STARTED' && (
                                    <button onClick={() => handleCompleteTrip(schedule.id)} title="Complete Trip" className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                                      <span className="material-symbols-outlined text-sm">task_alt</span>
                                    </button>
                                  )}
                                  {tripStatus==='STARTED' && (
                                    <button onClick={() => handleShareLocation(schedule.id)} title="Share Location" className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition-colors">
                                      <span className="material-symbols-outlined text-sm">my_location</span>
                                    </button>
                                  )}
                                  {tripStatus!=='COMPLETED' && (
                                    <button onClick={() => setDelayModal({ id: schedule.id, minutes: getDelayMinutes(schedule)?String(getDelayMinutes(schedule)):'', reason: schedule.delayReason||'' })} title="Mark Delay" className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center hover:bg-amber-100 transition-colors">
                                      <span className="material-symbols-outlined text-sm">warning</span>
                                    </button>
                                  )}
                                  <button onClick={() => setEditScheduleModal({ id: schedule.id, busId: String(schedule.bus?.id||''), departureTime: formatDTL(schedule.departureTime), arrivalTime: formatDTL(schedule.arrivalTime), frequency: schedule.frequency||'DAILY' })} title="Edit" className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors">
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                  </button>
                                  <button onClick={() => setDeleteScheduleModal(schedule.id)} title="Delete" className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors">
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
                {/* Pagination */}
                {schedules.length > SCHED_PAGE_SIZE && (
                  <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-400">
                      Showing {schedulePage * SCHED_PAGE_SIZE + 1}–{Math.min(schedules.length, (schedulePage + 1) * SCHED_PAGE_SIZE)} of {schedules.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSchedulePage(p => Math.max(0, p - 1))} disabled={schedulePage === 0} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </button>
                      {Array.from({ length: totalSchedPages }, (_, i) => (
                        <button key={i} onClick={() => setSchedulePage(i)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${schedulePage === i ? 'bg-[#002046] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{i + 1}</button>
                      ))}
                      <button onClick={() => setSchedulePage(p => Math.min(totalSchedPages - 1, p + 1))} disabled={schedulePage >= totalSchedPages - 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              );
            })()}

            {/* ── SEGMENTS TAB ── */}
            {activeTab === 'segments' && (
              <div>
                {selectedSegmentIds.size > 0 && (() => {
                  const sel = segments.filter(s => selectedSegmentIds.has(String(s.id)));
                  const one = sel.length === 1 ? sel[0] : null;
                  return (
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-[#002046]/[0.03] border-b border-slate-100 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#002046] text-white text-[10px] font-black">{selectedSegmentIds.size} selected</span>
                      {one && <button onClick={() => { setEditingSegment({ id: one.id, fromStop: one.fromStop, toStop: one.toStop, distanceKm: one.distanceKm, durationMinutes: one.durationMinutes }); setSelectedSegmentIds(new Set()); }} className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors border border-slate-200"><span className="material-symbols-outlined text-xs">edit</span>Edit</button>}
                      <button onClick={handleBulkDeleteSegments} disabled={Boolean(blockingLoader)} className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 disabled:opacity-60 transition-colors"><span className="material-symbols-outlined text-xs">delete</span>Delete</button>
                      <button onClick={() => setSelectedSegmentIds(new Set())} className="px-3 py-1 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors">Clear</button>
                    </div>
                  );
                })()}
                {segments.length === 0 && !showAddSegment ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-slate-400 mb-3">No segments defined yet</p>
                    <button onClick={() => setShowAddSegment(true)} className="px-4 py-2 rounded-xl bg-[#002046] text-white text-sm font-bold hover:bg-[#003a80] transition-colors">Add First Segment</button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80">
                          <th className="pl-5 pr-2 py-3.5 w-10">
                            <input type="checkbox" checked={selectedSegmentIds.size === segments.length && segments.length > 0} onChange={() => setSelectedSegmentIds(selectedSegmentIds.size === segments.length ? new Set() : new Set(segments.map(s => String(s.id))))} className="w-4 h-4 rounded accent-[#002046] cursor-pointer" />
                          </th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">#</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">From</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">To</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Distance</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Duration</th>
                          <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {segments.map((seg, idx) => {
                          const isEditing = editingSegment?.id === seg.id;
                          const isChecked = selectedSegmentIds.has(String(seg.id));
                          return (
                            <tr key={seg.id} className={isEditing ? 'bg-[#002046]/[0.02]' : `hover:bg-slate-50/70 transition-colors ${isChecked ? 'bg-[#002046]/[0.02]' : ''}`}>
                              {isEditing ? (
                                <td colSpan={7} className="px-5 py-4">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <input placeholder="From *" value={editingSegment.fromStop||''} onChange={e=>setEditingSegment(p=>({...p,fromStop:e.target.value}))} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                                    <input placeholder="To *" value={editingSegment.toStop||''} onChange={e=>setEditingSegment(p=>({...p,toStop:e.target.value}))} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                                    <input type="number" min="0" placeholder="Distance (km)" value={editingSegment.distanceKm||''} onChange={e=>setEditingSegment(p=>({...p,distanceKm:e.target.value}))} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                                    <input type="number" min="0" placeholder="Duration (min)" value={editingSegment.durationMinutes||''} onChange={e=>setEditingSegment(p=>({...p,durationMinutes:e.target.value}))} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                                  </div>
                                  <div className="flex gap-2 mt-2 justify-end">
                                    <button onClick={() => setEditingSegment(null)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold">Cancel</button>
                                    <button onClick={handleSaveSegment} disabled={Boolean(blockingLoader)} className="px-4 py-2 text-sm rounded-xl bg-[#002046] text-white font-bold hover:bg-[#003a80] disabled:opacity-60">Save</button>
                                  </div>
                                </td>
                              ) : (
                                <>
                                  <td className="pl-5 pr-2 py-4">
                                    <input type="checkbox" checked={isChecked} onChange={() => toggleId(setSelectedSegmentIds, String(seg.id))} className="w-4 h-4 rounded accent-[#002046] cursor-pointer" />
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className="w-6 h-6 rounded-full bg-[#002046]/10 text-[#002046] flex items-center justify-center text-xs font-black">{idx+1}</span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className="text-sm font-semibold text-slate-800">{seg.fromStop}</span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className="text-sm font-semibold text-slate-800">{seg.toStop}</span>
                                  </td>
                                  <td className="px-5 py-4 hidden sm:table-cell">
                                    <span className="text-sm text-slate-500">{seg.distanceKm > 0 ? `${seg.distanceKm} km` : '—'}</span>
                                  </td>
                                  <td className="px-5 py-4 hidden sm:table-cell">
                                    <span className="text-sm text-slate-500">{seg.durationMinutes > 0 ? `${seg.durationMinutes} min` : '—'}</span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => setEditingSegment({ id: seg.id, fromStop: seg.fromStop, toStop: seg.toStop, distanceKm: seg.distanceKm, durationMinutes: seg.durationMinutes })} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                      </button>
                                      <button onClick={() => handleDeleteSegment(seg.id)} disabled={Boolean(blockingLoader)} className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors disabled:opacity-60">
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {showAddSegment ? (
                  <div className="border-t border-slate-100 px-5 py-4 bg-[#002046]/[0.02]">
                    <p className="text-xs font-bold text-[#002046] uppercase tracking-wider mb-3">New Segment</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input placeholder="From stop *" value={addSegmentForm.fromStop||''} onChange={e=>setAddSegmentForm(p=>({...p,fromStop:e.target.value}))} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                      <input placeholder="To stop *" value={addSegmentForm.toStop||''} onChange={e=>setAddSegmentForm(p=>({...p,toStop:e.target.value}))} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                      <input type="number" min="0" placeholder="Distance (km)" value={addSegmentForm.distanceKm||''} onChange={e=>setAddSegmentForm(p=>({...p,distanceKm:e.target.value}))} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                      <input type="number" min="0" placeholder="Duration (min)" value={addSegmentForm.durationMinutes||''} onChange={e=>setAddSegmentForm(p=>({...p,durationMinutes:e.target.value}))} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                    </div>
                    <div className="flex gap-2 mt-3 justify-end">
                      <button onClick={() => { setShowAddSegment(false); setAddSegmentForm({}); }} className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold">Cancel</button>
                      <button onClick={handleAddSegment} disabled={Boolean(blockingLoader)} className="px-4 py-2 text-sm rounded-xl bg-[#002046] text-white font-bold hover:bg-[#003a80] disabled:opacity-60">Add Segment</button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between">
                    <p className="text-xs text-slate-400">{segments.length} segment{segments.length !== 1 ? 's' : ''}</p>
                    <button onClick={() => setShowAddSegment(true)} className="flex items-center gap-1.5 text-sm font-bold text-[#002046] hover:text-[#003a80] transition-colors">
                      <span className="material-symbols-outlined text-sm">add</span>Add Segment
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── FARES TAB ── */}
            {activeTab === 'fares' && (
              <div>
                {selectedFareIds.size > 0 && (() => {
                  const sel = fares.filter(f => selectedFareIds.has(f.id));
                  const one = sel.length === 1 ? sel[0] : null;
                  return (
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-[#002046]/[0.03] border-b border-slate-100 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#002046] text-white text-[10px] font-black">{selectedFareIds.size} selected</span>
                      {one && <button onClick={() => { setEditingFare({ fareId: one.id, baseFare: String(one.baseFare??'') }); setSelectedFareIds(new Set()); }} className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors border border-slate-200"><span className="material-symbols-outlined text-xs">edit</span>Edit</button>}
                      <button onClick={handleBulkDeleteFares} disabled={Boolean(blockingLoader)} className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 disabled:opacity-60 transition-colors"><span className="material-symbols-outlined text-xs">delete</span>Delete</button>
                      <button onClick={() => setSelectedFareIds(new Set())} className="px-3 py-1 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors">Clear</button>
                    </div>
                  );
                })()}
                {Object.keys(groupedFares).length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-slate-400 mb-1">No fares set yet</p>
                    <p className="text-xs text-slate-400">Use the form below to add your first fare</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80">
                          <th className="pl-5 pr-2 py-3.5 w-10">
                            <input type="checkbox" checked={selectedFareIds.size === fares.length && fares.length > 0} onChange={() => setSelectedFareIds(selectedFareIds.size === fares.length ? new Set() : new Set(fares.map(f => f.id)))} className="w-4 h-4 rounded accent-[#002046] cursor-pointer" />
                          </th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Segment</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Seat Type</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Bus</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Base Fare</th>
                          <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(groupedFares).map(([segLabel, segFares]) =>
                          segFares.map((f, fi) => {
                            const isEditing = editingFare?.fareId === f.id;
                            const isChecked = selectedFareIds.has(f.id);
                            return (
                              <tr key={f.id} className={`hover:bg-slate-50/70 transition-colors ${isChecked ? 'bg-[#002046]/[0.02]' : ''}`}>
                                <td className="pl-5 pr-2 py-4">
                                  <input type="checkbox" checked={isChecked} onChange={() => toggleId(setSelectedFareIds, f.id)} className="w-4 h-4 rounded accent-[#002046] cursor-pointer" />
                                </td>
                                <td className="px-5 py-4">
                                  {fi === 0 && <span className="text-xs font-semibold text-slate-600">{segLabel}</span>}
                                </td>
                                <td className="px-5 py-4">
                                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-[#002046]/[0.08] text-[#002046]">{f.seatType?.replace(/_/g,' ')}</span>
                                </td>
                                <td className="px-5 py-4 hidden md:table-cell">
                                  <span className="text-sm text-slate-500">{f?.bus?.name||f?.busName||(f?.busId?`Bus ${f.busId}`:'Default')}</span>
                                </td>
                                <td className="px-5 py-4">
                                  {isEditing ? (
                                    <div className="relative w-28">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                      <input type="number" min="0" value={editingFare.baseFare||''} onChange={e=>setEditingFare(p=>({...p,baseFare:e.target.value}))} className="w-full pl-5 pr-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                                    </div>
                                  ) : (
                                    <span className="text-sm font-bold text-slate-800">₹{f.baseFare}</span>
                                  )}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center justify-end gap-1">
                                    {isEditing ? (
                                      <>
                                        <button onClick={() => saveEditFare(f)} disabled={Boolean(blockingLoader)} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50">Save</button>
                                        <button onClick={() => setEditingFare(null)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-semibold hover:bg-slate-50">Cancel</button>
                                      </>
                                    ) : (
                                      <button onClick={() => setEditingFare({ fareId: f.id, baseFare: String(f.baseFare??'') })} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                      </button>
                                    )}
                                    <button onClick={() => handleDeleteFare(f.id)} disabled={Boolean(blockingLoader)} className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors disabled:opacity-50">
                                      <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Add fare form */}
                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/60">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Add Fare</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                    <select value={fareForm.busId} onChange={e=>setFareForm(p=>({...p,busId:e.target.value,seatType:''}))} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]">
                      <option value="">All buses (default)</option>
                      {Array.from(new Map(schedules.filter(s=>s?.bus?.id).map(s=>[String(s.bus.id),s.bus])).values()).map(bus=>(
                        <option key={bus.id} value={bus.id}>{bus.name} ({bus.busCode})</option>
                      ))}
                    </select>
                    <select value={fareForm.segmentId} onChange={e=>setFareForm(p=>({...p,segmentId:e.target.value,seatType:''}))} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]">
                      <option value="">Segment *</option>
                      {segments.map(s=><option key={s.id} value={s.id}>{s.fromStop} → {s.toStop}</option>)}
                    </select>
                    <select value={fareForm.seatType} onChange={e=>setFareForm(p=>({...p,seatType:e.target.value}))} disabled={!fareForm.segmentId} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046] disabled:opacity-50">
                      <option value="">Seat type *</option>
                      {seatOptions.map(([val,label])=>(
                        <option key={val} value={val} disabled={fareForm.segmentId&&usedSeatTypes.has(val)}>{label}{fareForm.segmentId&&usedSeatTypes.has(val)?' ✓':''}</option>
                      ))}
                    </select>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                      <input type="number" min="0" placeholder="Base fare *" value={fareForm.baseFare} onChange={e=>setFareForm(p=>({...p,baseFare:e.target.value}))} className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={handleAddFare} disabled={Boolean(blockingLoader)} className="flex items-center gap-1.5 rounded-xl bg-[#002046] px-4 py-2 text-sm font-bold text-white hover:bg-[#003a80] disabled:opacity-60 transition-colors">
                      <span className="material-symbols-outlined text-sm">add</span>Add Fare
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── POINTS TAB ── */}
            {activeTab === 'points' && (
              <div className="p-5 space-y-5">
                {schedules.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No schedules yet — add one in the Schedules tab first.</p>
                ) : (
                  <>
                    {/* Points bulk action bar */}
                    {(selectedBoardingIds.size + selectedDroppingIds.size) > 0 && (() => {
                      const total = selectedBoardingIds.size + selectedDroppingIds.size;
                      const allPts = points[selectedScheduleId] || [];
                      const allSelIds = [...selectedBoardingIds, ...selectedDroppingIds];
                      const one = total === 1 ? allPts.find(p => allSelIds.includes(p.id)) : null;
                      return (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#002046]/[0.03] border border-slate-200 rounded-xl flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#002046] text-white text-[10px] font-black">{total} selected</span>
                          {one && <button onClick={() => { setEditingPoint({ pointId: one.id, name: one.name, type: one.type, address: one.address||'', landmark: one.landmark||'', arrivalTime: one.arrivalTime||'' }); setSelectedBoardingIds(new Set()); setSelectedDroppingIds(new Set()); }} className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors border border-slate-200"><span className="material-symbols-outlined text-xs">edit</span>Edit</button>}
                          <button onClick={handleBulkDeletePoints} disabled={Boolean(blockingLoader)} className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 disabled:opacity-60 transition-colors"><span className="material-symbols-outlined text-xs">delete</span>Delete</button>
                          <button onClick={() => { setSelectedBoardingIds(new Set()); setSelectedDroppingIds(new Set()); }} className="px-3 py-1 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors">Clear</button>
                        </div>
                      );
                    })()}

                    {/* Schedule selector */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Schedule</label>
                      <select value={selectedScheduleId||''} onChange={e=>setSelectedScheduleId(e.target.value)} className="flex-1 min-w-0 max-w-sm px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]">
                        {schedules.map(s=><option key={s.id} value={s.id}>{s.bus?.name||'Bus'} — {new Date(s.departureTime).toLocaleString()}</option>)}
                      </select>
                    </div>

                    {/* Boarding + Dropping side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                      {/* ── Boarding Points ── */}
                      <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-600 text-sm">login</span>
                            <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">Boarding Points</p>
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">
                              {(points[selectedScheduleId]||[]).filter(p=>p.type==='BOARDING').length}
                            </span>
                          </div>
                          <button onClick={() => { setAddPointModal({ type:'BOARDING' }); setPointForm({ type:'BOARDING' }); }} className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors">
                            <span className="material-symbols-outlined text-sm">add</span>Add
                          </button>
                        </div>
                        {(points[selectedScheduleId]||[]).filter(p=>p.type==='BOARDING').length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <span className="material-symbols-outlined text-slate-300 text-3xl">directions_bus</span>
                            <p className="text-xs text-slate-400 mt-2">No boarding points yet</p>
                          </div>
                        ) : (
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50/60">
                                <th className="pl-4 pr-2 py-2.5 w-8">
                                  <input type="checkbox" checked={selectedBoardingIds.size === (points[selectedScheduleId]||[]).filter(p=>p.type==='BOARDING').length && (points[selectedScheduleId]||[]).filter(p=>p.type==='BOARDING').length > 0} onChange={() => { const bpts = (points[selectedScheduleId]||[]).filter(p=>p.type==='BOARDING'); setSelectedBoardingIds(selectedBoardingIds.size === bpts.length ? new Set() : new Set(bpts.map(p=>p.id))); }} className="w-4 h-4 rounded accent-[#002046] cursor-pointer" />
                                </th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(points[selectedScheduleId]||[]).filter(p=>p.type==='BOARDING').map(p => {
                                const isEditing = editingPoint?.pointId === p.id;
                                const isChecked = selectedBoardingIds.has(p.id);
                                return (
                                  <tr key={p.id} className={isEditing ? 'bg-[#002046]/[0.02]' : `hover:bg-slate-50/70 ${isChecked ? 'bg-[#002046]/[0.02]' : ''}`}>
                                    {isEditing ? (
                                      <td colSpan={4} className="px-4 py-3">
                                        <div className="grid grid-cols-2 gap-2">
                                          <input placeholder="Name *" value={editingPoint.name||''} onChange={e=>setEditingPoint(prev=>({...prev,name:e.target.value}))} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                                          <input type="time" value={editingPoint.arrivalTime||''} onChange={e=>setEditingPoint(prev=>({...prev,arrivalTime:e.target.value}))} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                                          <input placeholder="Address" value={editingPoint.address||''} onChange={e=>setEditingPoint(prev=>({...prev,address:e.target.value}))} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                                          <input placeholder="Landmark" value={editingPoint.landmark||''} onChange={e=>setEditingPoint(prev=>({...prev,landmark:e.target.value}))} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                                        </div>
                                        <div className="flex gap-2 mt-2 justify-end">
                                          <button onClick={() => setEditingPoint(null)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-semibold">Cancel</button>
                                          <button onClick={saveEditPoint} disabled={Boolean(blockingLoader)} className="px-3 py-1.5 text-xs rounded-lg bg-[#002046] text-white font-bold disabled:opacity-50">Save</button>
                                        </div>
                                      </td>
                                    ) : (
                                      <>
                                        <td className="pl-4 pr-2 py-3">
                                          <input type="checkbox" checked={isChecked} onChange={() => toggleId(setSelectedBoardingIds, p.id)} className="w-4 h-4 rounded accent-[#002046] cursor-pointer" />
                                        </td>
                                        <td className="px-4 py-3">
                                          <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                                          {p.landmark && <p className="text-[10px] text-slate-400">{p.landmark}</p>}
                                          {p.address && <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{p.address}</p>}
                                        </td>
                                        <td className="px-4 py-3"><span className="text-xs text-slate-500">{p.arrivalTime||'—'}</span></td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => setEditingPoint({ pointId:p.id, name:p.name, type:p.type, address:p.address||'', landmark:p.landmark||'', arrivalTime:p.arrivalTime||'' })} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors">
                                              <span className="material-symbols-outlined text-xs">edit</span>
                                            </button>
                                            <button onClick={() => handleDeletePoint(p.id)} disabled={Boolean(blockingLoader)} className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center hover:bg-rose-100 disabled:opacity-50">
                                              <span className="material-symbols-outlined text-xs">delete</span>
                                            </button>
                                          </div>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {/* ── Dropping Points ── */}
                      <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-100">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500 text-sm">logout</span>
                            <p className="text-xs font-black text-red-700 uppercase tracking-wider">Dropping Points</p>
                            <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black">
                              {(points[selectedScheduleId]||[]).filter(p=>p.type==='DROPPING').length}
                            </span>
                          </div>
                          <button onClick={() => { setAddPointModal({ type:'DROPPING' }); setPointForm({ type:'DROPPING' }); }} className="flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-900 transition-colors">
                            <span className="material-symbols-outlined text-sm">add</span>Add
                          </button>
                        </div>
                        {(points[selectedScheduleId]||[]).filter(p=>p.type==='DROPPING').length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <span className="material-symbols-outlined text-slate-300 text-3xl">flag</span>
                            <p className="text-xs text-slate-400 mt-2">No dropping points yet</p>
                          </div>
                        ) : (
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50/60">
                                <th className="pl-4 pr-2 py-2.5 w-8">
                                  <input type="checkbox" checked={selectedDroppingIds.size === (points[selectedScheduleId]||[]).filter(p=>p.type==='DROPPING').length && (points[selectedScheduleId]||[]).filter(p=>p.type==='DROPPING').length > 0} onChange={() => { const dpts = (points[selectedScheduleId]||[]).filter(p=>p.type==='DROPPING'); setSelectedDroppingIds(selectedDroppingIds.size === dpts.length ? new Set() : new Set(dpts.map(p=>p.id))); }} className="w-4 h-4 rounded accent-[#002046] cursor-pointer" />
                                </th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(points[selectedScheduleId]||[]).filter(p=>p.type==='DROPPING').map(p => {
                                const isEditing = editingPoint?.pointId === p.id;
                                const isChecked = selectedDroppingIds.has(p.id);
                                return (
                                  <tr key={p.id} className={isEditing ? 'bg-[#002046]/[0.02]' : `hover:bg-slate-50/70 ${isChecked ? 'bg-[#002046]/[0.02]' : ''}`}>
                                    {isEditing ? (
                                      <td colSpan={4} className="px-4 py-3">
                                        <div className="grid grid-cols-2 gap-2">
                                          <input placeholder="Name *" value={editingPoint.name||''} onChange={e=>setEditingPoint(prev=>({...prev,name:e.target.value}))} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                                          <input type="time" value={editingPoint.arrivalTime||''} onChange={e=>setEditingPoint(prev=>({...prev,arrivalTime:e.target.value}))} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                                          <input placeholder="Address" value={editingPoint.address||''} onChange={e=>setEditingPoint(prev=>({...prev,address:e.target.value}))} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                                          <input placeholder="Landmark" value={editingPoint.landmark||''} onChange={e=>setEditingPoint(prev=>({...prev,landmark:e.target.value}))} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                                        </div>
                                        <div className="flex gap-2 mt-2 justify-end">
                                          <button onClick={() => setEditingPoint(null)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-semibold">Cancel</button>
                                          <button onClick={saveEditPoint} disabled={Boolean(blockingLoader)} className="px-3 py-1.5 text-xs rounded-lg bg-[#002046] text-white font-bold disabled:opacity-50">Save</button>
                                        </div>
                                      </td>
                                    ) : (
                                      <>
                                        <td className="pl-4 pr-2 py-3">
                                          <input type="checkbox" checked={isChecked} onChange={() => toggleId(setSelectedDroppingIds, p.id)} className="w-4 h-4 rounded accent-[#002046] cursor-pointer" />
                                        </td>
                                        <td className="px-4 py-3">
                                          <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                                          {p.landmark && <p className="text-[10px] text-slate-400">{p.landmark}</p>}
                                          {p.address && <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{p.address}</p>}
                                        </td>
                                        <td className="px-4 py-3"><span className="text-xs text-slate-500">{p.arrivalTime||'—'}</span></td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => setEditingPoint({ pointId:p.id, name:p.name, type:p.type, address:p.address||'', landmark:p.landmark||'', arrivalTime:p.arrivalTime||'' })} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors">
                                              <span className="material-symbols-outlined text-xs">edit</span>
                                            </button>
                                            <button onClick={() => handleDeletePoint(p.id)} disabled={Boolean(blockingLoader)} className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center hover:bg-rose-100 disabled:opacity-50">
                                              <span className="material-symbols-outlined text-xs">delete</span>
                                            </button>
                                          </div>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* Copy points */}
                    {schedules.length > 1 && (
                      <div className="rounded-xl ring-1 ring-slate-200 px-4 py-4 bg-slate-50/60">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Copy Points to Another Schedule</p>
                        <div className="flex gap-2">
                          <select value={copyTarget} onChange={e=>setCopyTarget(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]">
                            <option value="">Select target schedule</option>
                            {schedules.filter(s=>s.id!==selectedScheduleId).map(s=><option key={s.id} value={s.id}>{s.bus?.name||'Bus'} — {new Date(s.departureTime).toLocaleString()}</option>)}
                          </select>
                          <button onClick={submitCopyPoints} disabled={Boolean(blockingLoader)||!copyTarget} className="px-4 py-2 text-sm rounded-xl bg-[#002046] text-white font-bold hover:bg-[#003a80] disabled:opacity-60 transition-colors">Copy</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </OperatorLayout>

      {/* Add Schedule Modal */}
      {addScheduleModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl ring-1 ring-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-9 h-9 bg-[#002046]/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined text-[#002046] text-lg">add_circle</span></div>
              <h3 className="font-extrabold text-base">Add Schedule</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bus *</label>
                <select value={addScheduleModal.busId} onChange={e=>setAddScheduleModal(p=>({...p,busId:e.target.value}))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]">
                  <option value="">Select bus</option>
                  {buses.map(b=><option key={b.id} value={b.id}>{b.name} ({b.busCode}) · {b.busType?.replace(/_/g,' ')}</option>)}
                </select>
                {buses.length === 0
                  ? <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1"><span className="material-symbols-outlined text-sm">warning</span>No approved buses yet. Add a bus and wait for admin approval first.</p>
                  : <p className="text-xs text-slate-400 mt-1.5">Only admin-approved buses are shown.</p>
                }
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Departure *</label><input type="datetime-local" value={addScheduleModal.departureTime} onChange={e=>setAddScheduleModal(p=>({...p,departureTime:e.target.value}))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Arrival *</label><input type="datetime-local" value={addScheduleModal.arrivalTime} onChange={e=>setAddScheduleModal(p=>({...p,arrivalTime:e.target.value}))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Frequency *</label><select value={addScheduleModal.frequency} onChange={e=>setAddScheduleModal(p=>({...p,frequency:e.target.value}))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]"><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="WEEKDAYS">Weekdays</option><option value="WEEKENDS">Weekends</option><option value="ONCE">One Time</option></select></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setAddScheduleModal({ open:false, busId:'', departureTime:'', arrivalTime:'', frequency:'DAILY' })} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={submitAddSchedule} className="flex-1 py-2.5 rounded-xl bg-[#002046] text-white font-bold text-sm hover:bg-[#003a80] transition-colors">Create Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Schedule Modal */}
      {editScheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl ring-1 ring-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-9 h-9 bg-[#002046]/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined text-[#002046] text-lg">edit_calendar</span></div>
              <h3 className="font-extrabold text-base">Edit Schedule</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bus *</label><select value={editScheduleModal.busId} onChange={e=>setEditScheduleModal(p=>({...p,busId:e.target.value}))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]"><option value="">Select bus</option>{buses.map(b=><option key={b.id} value={b.id}>{b.name} ({b.busCode}) · {b.busType?.replace(/_/g,' ')}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Departure *</label><input type="datetime-local" value={editScheduleModal.departureTime} onChange={e=>setEditScheduleModal(p=>({...p,departureTime:e.target.value}))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Arrival *</label><input type="datetime-local" value={editScheduleModal.arrivalTime} onChange={e=>setEditScheduleModal(p=>({...p,arrivalTime:e.target.value}))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Frequency *</label><select value={editScheduleModal.frequency} onChange={e=>setEditScheduleModal(p=>({...p,frequency:e.target.value}))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]"><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="WEEKDAYS">Weekdays</option><option value="WEEKENDS">Weekends</option><option value="ONCE">One Time</option></select></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setEditScheduleModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={submitEditSchedule} className="flex-1 py-2.5 rounded-xl bg-[#002046] text-white font-bold text-sm hover:bg-[#003a80] transition-colors">Save Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Schedule Confirm */}
      {deleteScheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><span className="material-symbols-outlined text-red-500 text-xl">delete</span></div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">Delete Schedule</h3>
              <p className="text-sm text-slate-500">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setDeleteScheduleModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={confirmDeleteSchedule} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Assign Modal */}
      {driverModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl ring-1 ring-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-9 h-9 bg-[#002046]/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined text-[#002046] text-lg">badge</span></div>
              <h3 className="font-extrabold text-base">Assign Driver</h3>
            </div>
            <div className="px-6 py-4 max-h-64 overflow-y-auto space-y-2">
              {drivers.map(d => (
                <label key={d.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isExpired(d)?'cursor-not-allowed border-red-200 bg-red-50/80 opacity-70':'cursor-pointer'} ${String(driverModal.selectedId)===String(d.id)?'border-[#002046] bg-[#002046]/[0.03]':'border-slate-200 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="driver" disabled={isExpired(d)} checked={String(driverModal.selectedId)===String(d.id)} onChange={() => setDriverModal(p=>({...p,selectedId:String(d.id)}))} />
                    <div>
                      <p className="text-sm font-semibold">{getDriverName(d)}</p>
                      <p className="text-xs text-slate-500">{d.phone} · {d.licenseNumber}</p>
                      {isExpired(d) && <p className="text-xs text-red-600 font-medium mt-0.5">License expired{d.licenseExpiry?` on ${new Date(d.licenseExpiry).toLocaleDateString()}`:''}</p>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setDriverModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={confirmAssignDriver} disabled={Boolean(blockingLoader)} className="flex-1 py-2.5 rounded-xl bg-[#002046] text-white font-bold text-sm hover:bg-[#003a80] transition-colors disabled:opacity-60">Confirm Assign</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Point Modal */}
      {addPointModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl ring-1 ring-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${addPointModal.type === 'BOARDING' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                <span className={`material-symbols-outlined text-lg ${addPointModal.type === 'BOARDING' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {addPointModal.type === 'BOARDING' ? 'login' : 'logout'}
                </span>
              </div>
              <h3 className="font-extrabold text-base">Add {addPointModal.type === 'BOARDING' ? 'Boarding' : 'Dropping'} Point</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Name *</label>
                <input placeholder="e.g. City Bus Stand" value={pointForm.name||''} onChange={e=>setPointForm(p=>({...p,name:e.target.value}))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pickup Time</label>
                <input type="time" value={pointForm.arrivalTime||''} onChange={e=>setPointForm(p=>({...p,arrivalTime:e.target.value}))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Address</label>
                <input placeholder="Street address" value={pointForm.address||''} onChange={e=>setPointForm(p=>({...p,address:e.target.value}))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Landmark</label>
                <input placeholder="Near landmark" value={pointForm.landmark||''} onChange={e=>setPointForm(p=>({...p,landmark:e.target.value}))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => { setAddPointModal(null); setPointForm({}); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleAddPoint} disabled={Boolean(blockingLoader)} className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-60 ${addPointModal.type === 'BOARDING' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}>
                Add {addPointModal.type === 'BOARDING' ? 'Boarding' : 'Dropping'} Point
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delay Modal */}
      {delayModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl ring-1 ring-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined text-amber-600 text-lg">warning</span></div>
              <h3 className="font-extrabold text-base">Mark Delay</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Delay Minutes *</label><input type="number" min="1" value={delayModal.minutes} onChange={e=>setDelayModal(p=>({...p,minutes:e.target.value}))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" /></div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reason</label><input type="text" value={delayModal.reason} onChange={e=>setDelayModal(p=>({...p,reason:e.target.value}))} placeholder="Traffic, weather, etc." className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" /></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setDelayModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={submitDelay} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors">Save Delay</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RouteDetail;
