import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import TripGoIcon from '../assets/icons/TripGoIcon';
import { getSharedTrip } from '../api/travellerFeaturesService';
import { formatIstTime } from '../shared/utils/scheduleSearchUtils';

const REFRESH_MS = 30000;

const busIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:36px;height:36px;border-radius:9999px;background:#0B1F3A;border:3px solid #FF8A65;display:flex;align-items:center;justify-content:center;color:#FDBA74;font-family:Material Symbols Outlined;font-size:20px">directions_bus</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const STATUS_LABELS = {
  SCHEDULED: 'Not departed yet',
  DELAYED: 'Running late',
  STARTED: 'On the way',
  COMPLETED: 'Arrived',
  CANCELLED: 'Cancelled',
};

/**
 * Public page opened from a "Share trip" link (spec §4). No login: the token in the URL
 * grants read-only access to one trip's status and the bus's latest location.
 */
const SharedTrip = () => {
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () => getSharedTrip(token)
      .then((data) => { if (alive) { setTrip(data); setError(''); } })
      .catch((e) => { if (alive) setError(e.message); });
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, [token]);

  const hasLocation = trip && Number.isFinite(Number(trip.latitude)) && Number.isFinite(Number(trip.longitude)) && trip.latitude !== null;
  const status = String(trip?.tripStatus || 'SCHEDULED').toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><TripGoIcon className="w-6 h-5 text-white" /></span>
            <span className="font-black text-white tracking-tight">TripGo</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {error ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300">link_off</span>
            <p className="mt-2 font-black text-slate-900">{error}</p>
            <p className="mt-1 text-sm text-slate-500">Trip links stop working after the journey ends. Ask for a new one.</p>
          </div>
        ) : !trip ? (
          <div className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        ) : (
          <>
            <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-600">{trip.travellerFirstName ? `${trip.travellerFirstName}’s trip` : 'Shared trip'}</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900">{trip.from} <span className="text-[#FF8A65]">→</span> {trip.to}</h1>
              <p className="text-sm text-slate-500">{trip.busName}{trip.busNumber ? ` · ${trip.busNumber}` : ''}</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ['Departs', formatIstTime(trip.departureTime)],
                  ['Arrives', formatIstTime(trip.arrivalTime)],
                  ['Status', STATUS_LABELS[status] || status],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-sm font-bold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              {hasLocation ? (
                <>
                  <MapContainer center={[Number(trip.latitude), Number(trip.longitude)]} zoom={12} style={{ height: 360 }} scrollWheelZoom={false}>
                    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[Number(trip.latitude), Number(trip.longitude)]} icon={busIcon} />
                  </MapContainer>
                  <p className="px-5 py-3 text-xs text-slate-500">
                    Last updated {trip.recordedAt ? new Date(trip.recordedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : 'recently'} · refreshes automatically
                  </p>
                </>
              ) : (
                <div className="p-10 text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300">location_searching</span>
                  <p className="mt-2 font-bold text-slate-900">Live location appears once the bus starts</p>
                  <p className="text-sm text-slate-500">This page updates by itself — keep it open.</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default SharedTrip;
