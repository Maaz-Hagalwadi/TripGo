import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OperatorSidebar from '../components/operator/OperatorSidebar';
import { getBuses } from '../api/amenityService';
import { createRoute, addSegment, addFare, createSchedule } from '../api/routeService';
import './OperatorDashboard.css';

const CreateRoute = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [buses, setBuses] = useState([]);
  
  // Step 1: Route Details
  const [routeData, setRouteData] = useState({
    name: '',
    origin: '',
    destination: ''
  });
  const [routeId, setRouteId] = useState(null);
  
  // Step 2: Segments
  const [segments, setSegments] = useState([
    { fromStop: '', toStop: '', distanceKm: '', durationMinutes: '' }
  ]);
  const [segmentIds, setSegmentIds] = useState([]);
  
  // Step 3: Fares
  const [fares, setFares] = useState([]);
  
  // Step 4: Schedule
  const [scheduleData, setScheduleData] = useState({
    busId: '',
    departureTime: '',
    arrivalTime: '',
    frequency: 'DAILY'
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') {
      navigate('/');
    }
    fetchBuses();
  }, [user, loading, navigate]);

  const fetchBuses = async () => {
    try {
      const data = await getBuses();
      setBuses(data.filter(b => b.active) || []);
    } catch (error) {
      console.error('Failed to fetch buses:', error);
    }
  };

  const handleStep1Submit = async () => {
    if (!routeData.name || !routeData.origin || !routeData.destination) {
      setErrorMessage('Please fill all route details');
      return;
    }
    
    try {
      setSubmitting(true);
      setErrorMessage('');
      const response = await createRoute(routeData);
      setRouteId(response.id);
      setSegments([
        { fromStop: routeData.origin, toStop: '', distanceKm: '', durationMinutes: '' }
      ]);
      setStep(2);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addSegmentRow = () => {
    const lastSegment = segments[segments.length - 1];
    setSegments([...segments, { fromStop: lastSegment.toStop, toStop: '', distanceKm: '', durationMinutes: '' }]);
  };

  const updateSegment = (index, field, value) => {
    const updated = [...segments];
    updated[index][field] = value;
    setSegments(updated);
  };

  const handleStep2Submit = async () => {
    if (segments.some(s => !s.toStop || !s.distanceKm || !s.durationMinutes)) {
      setErrorMessage('Please fill all segment details');
      return;
    }
    
    try {
      setSubmitting(true);
      setErrorMessage('');
      const ids = [];
      for (const segment of segments) {
        const response = await addSegment(routeId, segment);
        ids.push(response.id);
      }
      setSegmentIds(ids);
      
      // Initialize fares for each segment
      const seatTypes = ['SLEEPER', 'SEATER', 'AC_SLEEPER', 'AC_SEATER'];
      const initialFares = [];
      segments.forEach((seg, idx) => {
        seatTypes.forEach(type => {
          initialFares.push({
            segmentId: ids[idx],
            seatType: type,
            baseFare: '',
            gstPercent: 5.0,
            segmentName: `${seg.fromStop} → ${seg.toStop}`
          });
        });
      });
      setFares(initialFares);
      setStep(3);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateFare = (index, field, value) => {
    const updated = [...fares];
    updated[index][field] = value;
    setFares(updated);
  };

  const handleStep3Submit = async () => {
    if (fares.some(f => !f.baseFare)) {
      setErrorMessage('Please set fares for all segments and seat types');
      return;
    }
    
    try {
      setSubmitting(true);
      setErrorMessage('');
      for (const fare of fares) {
        await addFare(routeId, {
          segmentId: fare.segmentId,
          seatType: fare.seatType,
          baseFare: parseFloat(fare.baseFare),
          gstPercent: fare.gstPercent
        });
      }
      setStep(4);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep4Submit = async () => {
    if (!scheduleData.busId || !scheduleData.departureTime || !scheduleData.arrivalTime) {
      setErrorMessage('Please fill all schedule details');
      return;
    }
    
    try {
      setSubmitting(true);
      setErrorMessage('');
      // Convert datetime-local to ISO 8601 format
      const payload = {
        busId: scheduleData.busId,
        departureTime: new Date(scheduleData.departureTime).toISOString(),
        arrivalTime: new Date(scheduleData.arrivalTime).toISOString(),
        frequency: scheduleData.frequency
      };
      await createSchedule(routeId, payload);
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/operator/schedules');
      }, 2000);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-[#101e22] text-slate-900 dark:text-slate-100 min-h-screen flex">
      <div className="operator-sidebar">
        <OperatorSidebar activeItem="schedules" collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      <main className={`operator-main flex-1 flex flex-col min-w-0 overflow-hidden transition-all ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101e22] flex items-center px-4 lg:px-8">
          <h2 className="text-lg font-semibold">Create Route & Schedule</h2>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  {s}
                </div>
                {s < 4 && <div className={`w-20 h-1 ${step > s ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} />}
              </div>
            ))}
          </div>

          <div className="max-w-4xl mx-auto bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-slate-200 dark:border-slate-800">
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                {errorMessage}
              </div>
            )}
            {/* Step 1: Route Details */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-4">Step 1: Route Details</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Route Name</label>
                  <input
                    type="text"
                    value={routeData.name}
                    onChange={(e) => setRouteData({...routeData, name: e.target.value})}
                    placeholder="Enter route name"
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Origin</label>
                    <input
                      type="text"
                      value={routeData.origin}
                      onChange={(e) => setRouteData({...routeData, origin: e.target.value})}
                      placeholder="Enter origin city"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Destination</label>
                    <input
                      type="text"
                      value={routeData.destination}
                      onChange={(e) => setRouteData({...routeData, destination: e.target.value})}
                      placeholder="Enter destination city"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <button
                  onClick={handleStep1Submit}
                  disabled={submitting}
                  className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Next: Add Stops'}
                </button>
              </div>
            )}

            {/* Step 2: Segments */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-4">Step 2: Add Stops & Segments</h3>
                {segments.map((seg, idx) => (
                  <div key={idx} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">From</label>
                        <input
                          type="text"
                          value={seg.fromStop}
                          disabled
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">To</label>
                        <input
                          type="text"
                          value={seg.toStop}
                          onChange={(e) => updateSegment(idx, 'toStop', e.target.value)}
                          placeholder="Enter stop name"
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Distance (km)</label>
                        <input
                          type="number"
                          value={seg.distanceKm}
                          onChange={(e) => updateSegment(idx, 'distanceKm', e.target.value)}
                          placeholder="Enter distance"
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                        <input
                          type="number"
                          value={seg.durationMinutes}
                          onChange={(e) => updateSegment(idx, 'durationMinutes', e.target.value)}
                          placeholder="Enter duration"
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addSegmentRow}
                  className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 px-4 py-3 rounded-lg hover:border-primary transition-colors"
                >
                  + Add Another Stop
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleStep2Submit}
                    disabled={submitting}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Next: Set Fares'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Fares */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-4">Step 3: Set Fares</h3>
                <div className="space-y-6">
                  {segments.map((seg, segIdx) => (
                    <div key={segIdx} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <h4 className="font-semibold mb-3">{seg.fromStop} → {seg.toStop}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {['SLEEPER', 'SEATER', 'AC_SLEEPER', 'AC_SEATER'].map((type) => {
                          const fareIdx = fares.findIndex(f => f.segmentId === segmentIds[segIdx] && f.seatType === type);
                          return (
                            <div key={type}>
                              <label className="block text-sm font-medium mb-2">{type.replace('_', ' ')}</label>
                              <input
                                type="number"
                                value={fares[fareIdx]?.baseFare || ''}
                                onChange={(e) => updateFare(fareIdx, 'baseFare', e.target.value)}
                                placeholder="Enter fare amount"
                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleStep3Submit}
                    disabled={submitting}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Next: Create Schedule'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Schedule */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-4">Step 4: Create Schedule</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Select Bus</label>
                  <select
                    value={scheduleData.busId}
                    onChange={(e) => setScheduleData({...scheduleData, busId: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  >
                    <option value="">Choose a bus</option>
                    {buses.map(bus => (
                      <option key={bus.id} value={bus.id}>{bus.name} ({bus.busCode})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Departure Time</label>
                    <input
                      type="datetime-local"
                      value={scheduleData.departureTime}
                      onChange={(e) => setScheduleData({...scheduleData, departureTime: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Arrival Time</label>
                    <input
                      type="datetime-local"
                      value={scheduleData.arrivalTime}
                      onChange={(e) => setScheduleData({...scheduleData, arrivalTime: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Frequency</label>
                  <select
                    value={scheduleData.frequency}
                    onChange={(e) => setScheduleData({...scheduleData, frequency: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="WEEKDAYS">Weekdays Only</option>
                    <option value="WEEKENDS">Weekends Only</option>
                    <option value="ONCE">One Time</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleStep4Submit}
                    disabled={submitting}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Schedule'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-green-600 text-4xl">check_circle</span>
            </div>
            <p className="text-lg font-semibold">Route & Schedule Created Successfully!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateRoute;
