const DeleteBusModal = ({ bus, deleting, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-op-card rounded-xl p-6 max-w-md w-full">
      <h3 className="text-xl font-bold mb-4">Delete Bus</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Are you sure you want to delete <span className="font-bold">{bus?.name}</span> ({bus?.busCode})? This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={deleting} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={deleting} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
);

export default DeleteBusModal;
