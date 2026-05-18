import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getLatestBusTracking } from '../../../api/bookingService';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const busIcon = new L.DivIcon({
  html: `<div style="background:#002046;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:3px solid white">
    <span class="material-symbols-outlined" style="color:white;font-size:18px;line-height:1">directions_bus</span>
  </div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

const BusTrackingMap = ({ scheduleId, routeFrom, routeTo, onClose }) => {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const fetchTracking = async () => {
    try {
      const data = await getLatestBusTracking(scheduleId);
      if (data?.latitude && data?.longitude) {
        setTracking(data);
        setError('');
      } else {
        setTracking(null);
      }
    } catch {
      setError('Unable to fetch location data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    intervalRef.current = setInterval(fetchTracking, 10000);
    return () => clearInterval(intervalRef.current);
  }, [scheduleId]);

  const lat = tracking?.latitude;
  const lng = tracking?.longitude;
  const defaultCenter = [20.5937, 78.9629]; // India center

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#002046] text-lg">directions_bus</span>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Live Bus Tracking</p>
              {routeFrom && routeTo && (
                <p className="text-xs text-slate-400 mt-0.5">{routeFrom} → {routeTo}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {tracking && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-slate-500 text-sm">close</span>
            </button>
          </div>
        </div>

        <div className="relative" style={{ height: 400 }}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
                <p className="text-sm text-slate-500">Fetching location...</p>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">location_off</span>
                <p className="mt-2 text-sm text-slate-500">{error}</p>
              </div>
            </div>
          ) : !tracking ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">location_searching</span>
                <p className="mt-2 text-sm font-semibold text-slate-700">No location data yet</p>
                <p className="text-xs text-slate-400 mt-1">The operator hasn't shared the bus location.</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={[lat, lng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RecenterMap lat={lat} lng={lng} />
              <Marker position={[lat, lng]} icon={busIcon}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">Bus Location</p>
                    {tracking.speedKmph > 0 && <p>Speed: {Math.round(tracking.speedKmph)} km/h</p>}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          )}
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">Updates every 10 seconds</p>
          <button onClick={fetchTracking} className="flex items-center gap-1.5 text-xs font-semibold text-[#002046] hover:opacity-70 transition-opacity">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh now
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusTrackingMap;
