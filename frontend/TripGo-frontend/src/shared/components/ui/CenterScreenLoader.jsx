const CenterScreenLoader = ({
  label = 'Processing your request...',
  description = 'Please wait while we update your information.',
}) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="flex min-w-[260px] flex-col items-center gap-4 rounded-[28px] bg-white px-8 py-7 text-center shadow-2xl ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,#080808_0%,#121212_100%)] dark:ring-white/10">
      <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" />
      <div>
        <p className="text-base font-bold text-slate-900 dark:text-white">{label}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  </div>
);

export default CenterScreenLoader;
