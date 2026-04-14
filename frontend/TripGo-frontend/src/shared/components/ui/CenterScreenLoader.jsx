const CenterScreenLoader = ({
  label = 'Processing your request...',
  description = 'Please wait while we update your information.',
}) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
    <div className="flex min-w-[300px] flex-col items-center gap-5 rounded-3xl bg-white px-10 py-8 text-center shadow-2xl ring-1 ring-slate-200/60 dark:bg-[#0e0e0e] dark:ring-white/10">

      {/* Branded animated logo */}
      <div className="relative flex items-center justify-center w-20 h-20">
        {/* Outer spinning ring */}
        <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 80 80" fill="none">
          <circle
            cx="40" cy="40" r="36"
            stroke="#00d4ff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="56 170"
          />
        </svg>
        {/* Inner counter-spin ring */}
        <svg className="absolute inset-0 w-full h-full" style={{ animation: 'spin 1.8s linear infinite reverse' }} viewBox="0 0 80 80" fill="none">
          <circle
            cx="40" cy="40" r="28"
            stroke="#00d4ff"
            strokeWidth="2"
            strokeOpacity="0.3"
            strokeLinecap="round"
            strokeDasharray="30 120"
          />
        </svg>
        {/* T logo in center */}
        <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-2xl bg-primary shadow-lg shadow-primary/30">
          <span className="text-black font-black text-xl leading-none select-none">T</span>
        </div>
      </div>

      <div>
        <p className="text-base font-bold text-slate-900 dark:text-white">{label}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>

      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary"
            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>

    <style>{`
      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
      }
    `}</style>
  </div>
);

export default CenterScreenLoader;
