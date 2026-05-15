import TripGoIcon from '../../../assets/icons/TripGoIcon';

const TripGoLoader = ({ label = 'Loading your journey...' }) => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#002046] select-none">

    {/* Decorative background circles */}
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-white/[0.03] pointer-events-none" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-white/[0.04] pointer-events-none" />

    {/* Brand + bus */}
    <div className="relative flex flex-col items-center z-10 mb-10">
      {/* Bus icon with float */}
      <div style={{ animation: 'tgFloat 2s ease-in-out infinite' }}>
        <TripGoIcon className="w-24 h-20 text-white drop-shadow-lg" />
      </div>

      {/* Wheel spin overlays — tiny circles behind wheel positions */}
      <div className="relative -mt-1 w-24 h-3 flex items-center justify-between px-[9px] pointer-events-none">
        <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white" style={{ animation: 'tgSpin 0.7s linear infinite' }} />
        <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white" style={{ animation: 'tgSpin 0.7s linear infinite' }} />
      </div>

      {/* Brand name */}
      <div className="mt-5 flex items-center gap-2">
        <span className="text-white font-black text-4xl tracking-tight leading-none">TripGo</span>
      </div>
      <p className="text-white/40 text-xs font-medium mt-1 tracking-widest uppercase">Bus Booking</p>
    </div>

    {/* Road + driving bus */}
    <div className="relative w-72 z-10">
      {/* Road surface */}
      <div className="w-full h-10 rounded-2xl bg-white/[0.06] overflow-hidden relative flex items-center">
        {/* Dashed center line */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-[200%] flex gap-4" style={{ animation: 'tgRoad 1s linear infinite' }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="h-0.5 w-8 flex-shrink-0 bg-white/20 rounded-full" />
            ))}
          </div>
        </div>

        {/* Moving mini bus */}
        <div className="absolute" style={{ animation: 'tgDrive 2.4s ease-in-out infinite' }}>
          <TripGoIcon className="w-8 h-6 text-white/90" />
        </div>
      </div>

      {/* Road shadow */}
      <div className="w-full h-1 bg-black/20 rounded-b-2xl blur-sm" />
    </div>

    {/* Loading label */}
    <p className="mt-8 text-white/50 text-sm z-10">{label}</p>

    {/* Dot pulse */}
    <div className="flex items-center gap-1.5 mt-3 z-10">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/40"
          style={{ animation: `tgPulse 1.4s ease-in-out ${i * 0.22}s infinite` }}
        />
      ))}
    </div>

    <style>{`
      @keyframes tgFloat {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-10px); }
      }
      @keyframes tgSpin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes tgRoad {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      @keyframes tgDrive {
        0%   { left: -2rem; opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 1; }
        100% { left: calc(100% + 0.5rem); opacity: 0; }
      }
      @keyframes tgPulse {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
        40%            { transform: scale(1);   opacity: 1; }
      }
    `}</style>
  </div>
);

export default TripGoLoader;
