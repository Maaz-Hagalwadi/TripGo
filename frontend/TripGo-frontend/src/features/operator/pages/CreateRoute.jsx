import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getBuses } from '../../../api/busService';
import { createRoute, addSegment, addFare, createSchedule } from '../../../api/routeService';
import { toast } from 'sonner';
import { ROUTES } from '../../../shared/constants/routes';
import CenterScreenLoader from '../../../shared/components/ui/CenterScreenLoader';

const STEPS = ['Route Details', 'Stops', 'Fares', 'Schedule'];

const CreateRoute = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [buses, setBuses] = useState([]);

  const [routeData, setRouteData] = useState({ name: '', origin: '', destination: '' });
  const [routeId, setRouteId] = useState(null);
  const [segments, setSegments] = useState([{ fromStop: '', toStop: '', distanceKm: '', durationMinutes: '' }]);
  const [segmentIds, setSegmentIds] = useState([]);
  const [fares, setFares] = useState([]);
  const [scheduleData, setScheduleData] = useState({ busId: '', departureDate: '', departureTime: '', arrivalDate: '', arrivalTime: '', frequency: 'DAILY' });
  const [submitting, setSubmitting] = useState(false);
  const [submittingLabel, setSubmittingLabel] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const selectedBus = buses.find(b => String(b.id) === String(scheduleData.busId));
  const getFareSeatTypes = (busType = '') => {
    const t = busType.toUpperCase();
    if (t.includes('AC') && t.includes('SLEEPER')) return ['AC_SLEEPER'];
    if (t.includes('SLEEPER')) return ['SLEEPER'];
    if (t.includes('AC')) return ['AC_SEATER'];
    return ['SEATER'];
  };
  const fareSeatTypes = selectedBus ? getFareSeatTypes(selectedBus.busType) : ['SEATER', 'SLEEPER', 'AC_SEATER', 'AC_SLEEPER'];

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') { navigate('/'); return; }
    getBuses().then(data => setBuses((data || []).filter(b => b.active))).catch(() => {});
  }, [user, loading, navigate]);

  const handleStep1Submit = async () => {
    if (!routeData.name || !routeData.origin || !routeData.destination) { setErrorMessage('Please fill all route details'); return; }
    try {
      setSubmitting(true); setSubmittingLabel('Saving route details...'); setErrorMessage('');
      const response = await createRoute(routeData);
      setRouteId(response.id);
      setSegments([{ fromStop: routeData.origin, toStop: '', distanceKm: '', durationMinutes: '' }]);
      setStep(2);
    } catch (e) { setErrorMessage(e.message); }
    finally { setSubmitting(false); setSubmittingLabel(''); }
  };

  const addSegmentRow = () => {
    const last = segments[segments.length - 1];
    if (!last.toStop) { setErrorMessage('Fill the current stop before adding another'); return; }
    setErrorMessage('');
    setSegments([...segments, { fromStop: last.toStop, toStop: '', distanceKm: '', durationMinutes: '' }]);
  };

  const removeSegmentRow = (index) => {
    if (segments.length === 1) return;
    const updated = segments.filter((_, i) => i !== index);
    for (let i = 1; i < updated.length; i++) updated[i].fromStop = updated[i - 1].toStop;
    setSegments(updated);
  };

  const updateSegmentField = (index, field, value) => {
    const updated = [...segments];
    updated[index][field] = value;
    if (field === 'toStop' && index + 1 < updated.length) updated[index + 1].fromStop = value;
    setSegments(updated);
  };

  const handleStep2Submit = async () => {
    if (segments.some(s => !s.toStop || !s.distanceKm || !s.durationMinutes)) { setErrorMessage('Please fill all segment details'); return; }
    try {
      setSubmitting(true); setSubmittingLabel('Saving stops...'); setErrorMessage('');
      const ids = [];
      for (const seg of segments) { const r = await addSegment(routeId, seg); ids.push(r.id); }
      setSegmentIds(ids);
      const initialFares = [];
      segments.forEach((seg, idx) => {
        fareSeatTypes.forEach(type => initialFares.push({ segmentId: ids[idx], seatType: type, baseFare: '', gstPercent: 5.0, segmentName: `${seg.fromStop} → ${seg.toStop}` }));
      });
      setFares(initialFares);
      setStep(3);
    } catch (e) { setErrorMessage(e.message); }
    finally { setSubmitting(false); setSubmittingLabel(''); }
  };

  const updateFare = (index, field, value) => {
    const updated = [...fares]; updated[index][field] = value; setFares(updated);
  };

  const handleStep3Submit = async () => {
    try {
      setSubmitting(true); setSubmittingLabel('Saving fares...'); setErrorMessage('');
      for (const fare of fares.filter(f => f.baseFare)) {
        await addFare(routeId, { segmentId: fare.segmentId, seatType: fare.seatType, baseFare: parseFloat(fare.baseFare), gstPercent: fare.gstPercent });
      }
      setStep(4);
    } catch (e) { setErrorMessage(e.message); }
    finally { setSubmitting(false); setSubmittingLabel(''); }
  };

  const handleStep4Submit = async () => {
    const { busId, departureDate, departureTime, arrivalDate, arrivalTime, frequency } = scheduleData;
    if (!busId || !departureDate || !departureTime || !arrivalDate || !arrivalTime) { setErrorMessage('Please fill all schedule details'); return; }
    try {
      setSubmitting(true); setSubmittingLabel('Creating schedule...'); setErrorMessage('');
      await createSchedule(routeId, {
        busId,
        departureTime: new Date(`${departureDate}T${departureTime}`).toISOString(),
        arrivalTime: new Date(`${arrivalDate}T${arrivalTime}`).toISOString(),
        frequency,
      });
      toast.success('Route & Schedule created successfully!');
      navigate(ROUTES.OPERATOR_SCHEDULES);
    } catch (e) { setErrorMessage(e.message); }
    finally { setSubmitting(false); setSubmittingLabel(''); }
  };

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]';
  const labelCls = 'block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5';

  return (
    <>
      {submitting && <CenterScreenLoader label={submittingLabel || 'Processing...'} description="Please wait while we save your route setup." />}
      <OperatorLayout activeItem="schedules" title="Create Route">
        <div className="space-y-5 max-w-2xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(ROUTES.OPERATOR_SCHEDULES)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors flex-shrink-0">
              <span className="material-symbols-outlined text-base">arrow_back</span>
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-900">Create Route</h1>
              <p className="text-xs text-slate-500 mt-0.5">Set up a new route with stops, fares and a schedule</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="rounded-xl bg-white ring-1 ring-slate-200 shadow-sm px-5 py-3.5">
            <div className="flex items-center">
              {STEPS.map((label, i) => {
                const done = i + 1 < step, active = i + 1 === step;
                return (
                  <div key={label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${done ? 'bg-emerald-500 text-white' : active ? 'bg-[#002046] text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {done ? <span className="material-symbols-outlined text-xs">check</span> : i + 1}
                      </div>
                      <span className={`text-xs font-semibold hidden sm:block ${done ? 'text-emerald-600' : active ? 'text-[#002046]' : 'text-slate-400'}`}>{label}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className="flex-1 h-px mx-3 bg-slate-200" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 ring-1 ring-red-200 text-sm text-red-700">
              <span className="material-symbols-outlined text-red-500 text-base">error</span>
              {errorMessage}
            </div>
          )}

          {/* Step 1: Route Details */}
          {step === 1 && (
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-5 py-4 relative">
                <div className="absolute -top-1 -right-3 text-6xl opacity-[0.07] select-none pointer-events-none">★</div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-lg">route</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white">Route Details</h2>
                    <p className="text-white/60 text-xs mt-0.5">Name your route and set the endpoints</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className={labelCls}>Route Name *</label>
                  <input value={routeData.name} onChange={e => setRouteData({ ...routeData, name: e.target.value })} placeholder="e.g. Mumbai Express" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Origin *</label>
                    <input value={routeData.origin} onChange={e => setRouteData({ ...routeData, origin: e.target.value })} placeholder="e.g. Mumbai" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Destination *</label>
                    <input value={routeData.destination} onChange={e => setRouteData({ ...routeData, destination: e.target.value })} placeholder="e.g. Goa" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Select Bus (optional)</label>
                  <select value={scheduleData.busId} onChange={e => setScheduleData({ ...scheduleData, busId: e.target.value })} className={inputCls}>
                    <option value="">Choose a bus for fare calculation</option>
                    {buses.map(bus => <option key={bus.id} value={bus.id}>{bus.name} ({bus.busCode}) — {bus.busType.replace(/_/g, ' ')}</option>)}
                  </select>
                  {selectedBus && (
                    <p className="text-xs text-slate-400 mt-1.5">Fares will be set for: <span className="text-[#002046] font-semibold">{getFareSeatTypes(selectedBus.busType).join(', ')}</span></p>
                  )}
                  <p className="text-xs text-slate-400 mt-1.5">You can add more buses via "Add Schedule" after creating the route.</p>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
                <button onClick={handleStep1Submit} disabled={submitting} className="px-6 py-2.5 rounded-xl bg-[#002046] text-white font-bold text-sm hover:bg-[#003a80] transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
                  Next: Add Stops
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Segments */}
          {step === 2 && (
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-5 py-4 relative">
                <div className="absolute -top-1 -right-3 text-6xl opacity-[0.07] select-none pointer-events-none">★</div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-lg">pin_drop</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white">Stops & Segments</h2>
                    <p className="text-white/60 text-xs mt-0.5">Define the stops along this route</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-5 space-y-3">
                {segments.map((seg, idx) => (
                  <div key={idx} className="rounded-xl ring-1 ring-slate-200 bg-slate-50/50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#002046] text-white text-[10px] font-black flex items-center justify-center">{idx + 1}</span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Segment {idx + 1}</span>
                      </div>
                      {segments.length > 1 && (
                        <button onClick={() => removeSegmentRow(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>
                    <div className="px-4 py-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>From</label>
                          <input value={seg.fromStop} disabled className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-100 text-slate-500 outline-none" />
                        </div>
                        <div>
                          <label className={labelCls}>To *</label>
                          <input value={seg.toStop} onChange={e => updateSegmentField(idx, 'toStop', e.target.value)} placeholder="Next stop" className={inputCls} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Distance (km) *</label>
                          <input type="number" value={seg.distanceKm} onChange={e => updateSegmentField(idx, 'distanceKm', e.target.value)} placeholder="0" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Duration (min) *</label>
                          <input type="number" value={seg.durationMinutes} onChange={e => updateSegmentField(idx, 'durationMinutes', e.target.value)} placeholder="0" className={inputCls} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addSegmentRow} className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 text-sm font-semibold hover:border-[#002046] hover:text-[#002046] transition-colors flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-base">add</span>
                  Add Another Stop
                </button>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
                <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Back</button>
                <button onClick={handleStep2Submit} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-[#002046] text-white font-bold text-sm hover:bg-[#003a80] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  Next: Set Fares
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Fares */}
          {step === 3 && (
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-5 py-4 relative">
                <div className="absolute -top-1 -right-3 text-6xl opacity-[0.07] select-none pointer-events-none">★</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-lg">payments</span>
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white">Fares</h2>
                      <p className="text-white/60 text-xs mt-0.5">Set base fares per segment (optional)</p>
                    </div>
                  </div>
                  {selectedBus && (
                    <span className="text-[10px] font-bold text-white/60 bg-white/10 px-2.5 py-1 rounded-full">{selectedBus.busType.replace(/_/g, ' ')}</span>
                  )}
                </div>
              </div>
              <div className="px-5 py-5 space-y-4">
                {segments.map((seg, segIdx) => (
                  <div key={segIdx} className="rounded-xl ring-1 ring-slate-200 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                      <span className="material-symbols-outlined text-slate-400 text-sm">arrow_right_alt</span>
                      <span className="text-xs font-bold text-slate-600">{seg.fromStop} → {seg.toStop}</span>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-2 gap-3">
                      {fareSeatTypes.map(type => {
                        const fareIdx = fares.findIndex(f => f.segmentId === segmentIds[segIdx] && f.seatType === type);
                        return (
                          <div key={type}>
                            <label className={labelCls}>{type.replace(/_/g, ' ')}</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
                              <input type="number" min="0" value={fares[fareIdx]?.baseFare || ''} onChange={e => updateFare(fareIdx, 'baseFare', e.target.value)} placeholder="0.00" className="w-full pl-7 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046]" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate-400 text-center">Fares can also be managed later from the route detail page.</p>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
                <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Back</button>
                <button onClick={handleStep3Submit} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-[#002046] text-white font-bold text-sm hover:bg-[#003a80] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  Next: Schedule
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Schedule */}
          {step === 4 && (
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-5 py-4 relative">
                <div className="absolute -top-1 -right-3 text-6xl opacity-[0.07] select-none pointer-events-none">★</div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-lg">schedule</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white">First Schedule</h2>
                    <p className="text-white/60 text-xs mt-0.5">Add the first departure for this route</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-5 space-y-4">

                {/* Bus selector */}
                <div>
                  <label className={labelCls}>Bus *</label>
                  <select value={scheduleData.busId} onChange={e => setScheduleData({ ...scheduleData, busId: e.target.value })} className={inputCls}>
                    <option value="">Choose a bus</option>
                    {buses.map(bus => <option key={bus.id} value={bus.id}>{bus.name} ({bus.busCode}) — {bus.busType.replace(/_/g, ' ')}</option>)}
                  </select>
                  {selectedBus && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-[#002046]/[0.05] ring-1 ring-[#002046]/10">
                      <span className="material-symbols-outlined text-[#002046] text-sm">directions_bus</span>
                      <span className="text-xs font-semibold text-[#002046]">{selectedBus.name} · {selectedBus.totalSeats} seats · {selectedBus.busType.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>

                {/* Departure */}
                <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <span className="material-symbols-outlined text-slate-400 text-sm">flight_takeoff</span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Departure</span>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Date *</label>
                      <input type="date" value={scheduleData.departureDate} min={new Date().toISOString().split('T')[0]} onChange={e => setScheduleData({ ...scheduleData, departureDate: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Time *</label>
                      <input type="time" value={scheduleData.departureTime} onChange={e => setScheduleData({ ...scheduleData, departureTime: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                </div>

                {/* Arrival */}
                <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <span className="material-symbols-outlined text-slate-400 text-sm">flight_land</span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Arrival</span>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Date *</label>
                      <input type="date" value={scheduleData.arrivalDate} min={scheduleData.departureDate || new Date().toISOString().split('T')[0]} onChange={e => setScheduleData({ ...scheduleData, arrivalDate: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Time *</label>
                      <input type="time" value={scheduleData.arrivalTime} onChange={e => setScheduleData({ ...scheduleData, arrivalTime: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <label className={labelCls}>Frequency</label>
                  <select value={scheduleData.frequency} onChange={e => setScheduleData({ ...scheduleData, frequency: e.target.value })} className={inputCls}>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="WEEKDAYS">Weekdays Only</option>
                    <option value="WEEKENDS">Weekends Only</option>
                    <option value="ONCE">One Time</option>
                  </select>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
                <button onClick={() => setStep(3)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Back</button>
                <button onClick={handleStep4Submit} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-[#002046] text-white font-bold text-sm hover:bg-[#003a80] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Create Route & Schedule
                </button>
              </div>
            </div>
          )}

        </div>
      </OperatorLayout>
    </>
  );
};

export default CreateRoute;
