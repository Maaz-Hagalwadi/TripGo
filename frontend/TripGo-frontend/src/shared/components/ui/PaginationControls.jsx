const PaginationControls = ({
  page,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  itemLabel = 'items',
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= pageSize) return null;

  const start = totalItems === 0 ? 0 : (page * pageSize) + 1;
  const end = Math.min(totalItems, (page + 1) * pageSize);

  return (
    <div className={`flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/10 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Showing {start}-{end} of {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(page - 1, 0))}
          disabled={page <= 0}
          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
        >
          Previous
        </button>
        <span className="min-w-[92px] text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
          Page {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(page + 1, totalPages - 1))}
          disabled={page + 1 >= totalPages}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-black transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
