import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { getDrivers, addDriver, updateDriver, deleteDriver } from '../../../api/operatorDriverService';
import CenterScreenLoader from '../../../shared/components/ui/CenterScreenLoader';

const EMPTY_FORM = { firstName: '', lastName: '', phone: '', licenseNumber: '', licenseExpiry: '' };

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getDriverName = (driver) => {
  const full = `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim();
  return full || driver?.phone || 'Driver';
};

const getLicenseDate = (driver) => {
  if (!driver?.licenseExpiry) return null;
  const d = new Date(driver.licenseExpiry);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const isLicenseExpired = (driver) => {
  const expiry = getLicenseDate(driver);
  if (!expiry) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return expiry < today;
};

/* ── Driver Form Modal (Add / Edit) ── */
const DriverFormModal = ({ open, onClose, title, icon, iconBg, iconColor, form, onChange, onSubmit, submitting }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm sm:max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/70 max-h-[85vh] flex flex-col">
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <span className={`material-symbols-outlined text-lg ${iconColor}`}>{icon}</span>
          </div>
          <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors ml-auto">
            <span className="material-symbols-outlined text-sm text-slate-500">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 space-y-3">
          {[
            { label: 'First Name *', field: 'firstName', placeholder: 'Enter first name', type: 'text' },
            { label: 'Last Name', field: 'lastName', placeholder: 'Enter last name', type: 'text' },
            { label: 'Phone *', field: 'phone', placeholder: 'Enter phone number', type: 'text' },
            { label: 'License Number *', field: 'licenseNumber', placeholder: 'Enter license number', type: 'text' },
            { label: 'License Expiry *', field: 'licenseExpiry', placeholder: '', type: 'date' },
          ].map(({ label, field, placeholder, type }) => (
            <div key={field}>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                value={form[field]}
                onChange={(e) => onChange(field, e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-1 focus:ring-[#002046] transition-colors border border-slate-200"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 px-5 py-3 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onSubmit} disabled={submitting} className="flex-1 rounded-2xl bg-[#002046] py-2.5 text-sm font-bold text-white hover:bg-[#003a80] transition-colors disabled:opacity-60">
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving...
              </span>
            ) : title}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Delete Confirm Modal ── */
const DeleteDriverModal = ({ driver, deleting, onConfirm, onCancel }) => {
  if (!driver) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        <div className="px-6 py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-red-500 text-xl">delete</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 mb-1">Delete Driver</h3>
          <p className="text-sm text-slate-500 mb-1">This action cannot be undone.</p>
          <p className="text-sm text-slate-600">
            <span className="font-semibold">{getDriverName(driver)}</span> will be permanently removed.
          </p>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-60">
            {deleting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Deleting...
              </span>
            ) : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ── */
const Drivers = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [blockingLoader, setBlockingLoader] = useState(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deletingDriverId, setDeletingDriverId] = useState(null);
  const [deleteModalDriver, setDeleteModalDriver] = useState(null);

  const [viewMode, setViewMode] = useState(() => window.innerWidth < 640 ? 'list' : 'list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDriverId, setSelectedDriverId] = useState(null);

  const today = new Date();

  const expiringSoon = drivers.filter((d) => {
    if (!d.licenseExpiry) return false;
    const expiry = new Date(d.licenseExpiry);
    const diff = (expiry - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  }).length;

  const expiredLicenses = drivers.filter(isLicenseExpired).length;

  const filteredDrivers = drivers.filter((d) => {
    if (statusFilter === 'active') return !isLicenseExpired(d);
    if (statusFilter === 'expired') return isLicenseExpired(d);
    if (statusFilter === 'expiring') {
      if (!d.licenseExpiry) return false;
      const expiry = new Date(d.licenseExpiry);
      const diff = (expiry - today) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30;
    }
    return true;
  });

  const actionDriver = selectedDriverId
    ? filteredDrivers.find((d) => String(d.id) === selectedDriverId) ?? null
    : null;

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') { navigate(ROUTES.HOME); return; }
    fetchDrivers();
  }, [user, loading, navigate]);

  useEffect(() => { setSelectedDriverId(null); }, [statusFilter]);

  const fetchDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const data = await getDrivers();
      setDrivers(normalizeList(data));
    } catch (e) {
      setDrivers([]);
      toast.error(e.message || 'Failed to load drivers');
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleAddDriver = async () => {
    if (!form.firstName || !form.phone || !form.licenseNumber || !form.licenseExpiry) {
      toast.error('First name, phone, license number and expiry are required');
      return;
    }
    try {
      setAddSubmitting(true);
      setBlockingLoader('Adding driver...');
      await addDriver(form);
      setForm(EMPTY_FORM);
      setAddModalOpen(false);
      await fetchDrivers();
      toast.success('Driver added');
    } catch (e) {
      toast.error(e.message || 'Failed to add driver');
    } finally {
      setAddSubmitting(false);
      setBlockingLoader(null);
    }
  };

  const openEditModal = (driver) => {
    setEditingDriverId(driver.id);
    setEditForm({ firstName: driver.firstName || '', lastName: driver.lastName || '', phone: driver.phone || '', licenseNumber: driver.licenseNumber || '', licenseExpiry: driver.licenseExpiry || '' });
    setEditModalOpen(true);
  };

  const handleSaveDriver = async () => {
    if (!editForm.firstName || !editForm.phone || !editForm.licenseNumber || !editForm.licenseExpiry) {
      toast.error('First name, phone, license number and expiry are required');
      return;
    }
    try {
      setEditSubmitting(true);
      setBlockingLoader('Saving driver...');
      await updateDriver(editingDriverId, editForm);
      toast.success('Driver updated');
      setEditModalOpen(false);
      setEditingDriverId(null);
      setEditForm(EMPTY_FORM);
      await fetchDrivers();
    } catch (e) {
      toast.error(e.message || 'Failed to update driver');
    } finally {
      setEditSubmitting(false);
      setBlockingLoader(null);
    }
  };

  const handleDeleteDriver = async (driverId) => {
    try {
      setDeletingDriverId(driverId);
      setBlockingLoader('Deleting driver...');
      await deleteDriver(driverId);
      toast.success('Driver deleted');
      setSelectedDriverId(null);
      await fetchDrivers();
    } catch (e) {
      toast.error(e.message || 'Failed to delete driver');
    } finally {
      setDeletingDriverId(null);
      setBlockingLoader(null);
    }
  };

  const getLicenseStatus = (driver) => {
    if (isLicenseExpired(driver)) return 'expired';
    const expiry = getLicenseDate(driver);
    if (!expiry) return 'active';
    const diff = (expiry - today) / (1000 * 60 * 60 * 24);
    return diff <= 30 ? 'expiring' : 'active';
  };

  const StatusBadge = ({ driver }) => {
    const s = getLicenseStatus(driver);
    if (s === 'expired') return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />Expired
      </span>
    );
    if (s === 'expiring') return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />Expiring Soon
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />Valid
      </span>
    );
  };

  return (
    <>
      {blockingLoader && <CenterScreenLoader label={blockingLoader} description="Please wait while we update your driver information." />}

      <OperatorLayout activeItem="drivers" title="Drivers">
        <div className="space-y-5">

          {/* Page header */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">Drivers</h1>
              <p className="hidden sm:block text-sm text-slate-500 mt-0.5">Manage your drivers and monitor license validity</p>
            </div>
            <button
              onClick={() => { setForm(EMPTY_FORM); setAddModalOpen(true); }}
              className="flex-shrink-0 flex items-center gap-2 rounded-2xl bg-[#002046] text-white px-4 sm:px-5 py-2.5 text-sm font-bold hover:bg-[#003a80] transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              Add Driver
            </button>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-3 sm:p-5 text-white shadow-sm relative overflow-hidden">
              <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
              <p className="text-[9px] sm:text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-2">Total Drivers</p>
              {loadingDrivers ? (
                <div className="animate-pulse space-y-2"><div className="h-7 sm:h-9 w-12 sm:w-16 bg-white/20 rounded" /><div className="h-3 w-16 sm:w-24 bg-white/10 rounded" /></div>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-black">{drivers.length}</p>
                  <p className="text-[10px] sm:text-xs opacity-50 mt-1 sm:mt-1.5">registered drivers</p>
                </>
              )}
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-3 sm:p-5 text-white shadow-sm relative overflow-hidden">
              <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
              <p className="text-[9px] sm:text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-3">License Status</p>
              {loadingDrivers ? (
                <div className="space-y-2 animate-pulse">{[1,2].map(i => <div key={i} className="flex justify-between"><div className="h-3 w-20 bg-white/20 rounded"/><div className="h-3 w-6 bg-white/10 rounded"/></div>)}</div>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-black">{drivers.length - expiredLicenses}</p>
                  <div className="flex items-center gap-3 mt-1 sm:mt-2">
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs opacity-60"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />{drivers.length - expiredLicenses - expiringSoon} valid</span>
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs opacity-60"><span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />{expiringSoon} expiring</span>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-3 sm:p-5 text-white shadow-sm relative overflow-hidden col-span-2 sm:col-span-1">
              <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
              <p className="text-[9px] sm:text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-2">Expired</p>
              {loadingDrivers ? (
                <div className="animate-pulse space-y-2"><div className="h-7 sm:h-9 w-12 sm:w-16 bg-white/20 rounded" /><div className="h-3 w-16 sm:w-24 bg-white/10 rounded" /></div>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-black">{expiredLicenses}</p>
                  <p className="text-[10px] sm:text-xs opacity-50 mt-1 sm:mt-1.5">expired licenses</p>
                </>
              )}
            </div>
          </div>

          {/* Tab filter + view toggle */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm">
              {[
                { id: 'all',      label: 'All',      count: drivers.length },
                { id: 'active',   label: 'Valid',    count: drivers.length - expiredLicenses - expiringSoon },
                { id: 'expiring', label: 'Expiring', count: expiringSoon },
                { id: 'expired',  label: 'Expired',  count: expiredLicenses },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${statusFilter === tab.id ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {tab.label}
                  <span className={`ml-1.5 text-xs ${statusFilter === tab.id ? 'opacity-60' : 'opacity-40'}`}>({tab.count})</span>
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm">
              {[
                { id: 'list', icon: 'view_list', label: 'List' },
                { id: 'grid', icon: 'grid_view',  label: 'Grid' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => { setViewMode(mode.id); setSelectedDriverId(null); }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all flex items-center gap-1.5 ${viewMode === mode.id ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span className="material-symbols-outlined text-base">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action bar — shown when a driver is selected */}
          {actionDriver && (
            <div className="flex items-center gap-2 bg-white ring-1 ring-slate-200 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm">
              <span className="material-symbols-outlined text-base text-slate-400 flex-shrink-0">badge</span>
              <button
                onClick={() => { setSelectedDriverId(null); openEditModal(actionDriver); }}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Edit
              </button>
              <button
                onClick={() => { setSelectedDriverId(null); setDeleteModalDriver(actionDriver); }}
                className="flex items-center gap-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Delete
              </button>
              <button
                onClick={() => setSelectedDriverId(null)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center flex-shrink-0 transition-colors ml-auto"
              >
                <span className="material-symbols-outlined text-sm text-slate-500">close</span>
              </button>
            </div>
          )}

          {/* Main content card */}
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
            {loadingDrivers ? (
              <div className="p-10 flex items-center justify-center gap-3 text-sm text-slate-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
                Loading drivers...
              </div>

            ) : filteredDrivers.length === 0 ? (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-slate-300">badge</span>
                <h2 className="mt-4 text-lg font-bold text-slate-900">No drivers found</h2>
                <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
                  {statusFilter !== 'all' ? 'No drivers match this filter.' : 'Add your first driver to get started.'}
                </p>
                {statusFilter === 'all' && (
                  <button
                    onClick={() => { setForm(EMPTY_FORM); setAddModalOpen(true); }}
                    className="mt-5 rounded-2xl bg-[#002046] px-6 py-3 text-sm font-bold text-white hover:bg-[#003a80] transition-colors"
                  >
                    Add First Driver
                  </button>
                )}
              </div>

            ) : viewMode === 'grid' ? (
              <div className="p-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                {filteredDrivers.map((driver) => {
                  const isSelected = selectedDriverId === String(driver.id);
                  return (
                    <div
                      key={driver.id}
                      onClick={() => setSelectedDriverId((prev) => prev === String(driver.id) ? null : String(driver.id))}
                      className={`rounded-xl ring-1 p-3 sm:p-4 hover:shadow-md transition-all cursor-pointer ${isSelected ? 'bg-slate-50 ring-[#002046]/40 shadow-sm' : 'bg-white ring-slate-200'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">{getDriverName(driver)}</p>
                          {driver.phone && <p className="text-xs text-slate-400 mt-0.5 truncate">{driver.phone}</p>}
                        </div>
                        <StatusBadge driver={driver} />
                      </div>

                      <div className="space-y-1.5 mb-3 text-xs text-slate-500">
                        {driver.licenseNumber && (
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-slate-300 text-sm">badge</span>
                            <span className="truncate font-mono">{driver.licenseNumber}</span>
                          </div>
                        )}
                        {driver.licenseExpiry && (
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-slate-300 text-sm">calendar_month</span>
                            <span className={isLicenseExpired(driver) ? 'text-rose-600 font-medium' : ''}>
                              {isLicenseExpired(driver) ? 'Expired ' : 'Expires '}
                              {new Date(driver.licenseExpiry).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400">Click to select</span>
                        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#002046] border-[#002046]' : 'bg-white border-slate-300'}`}>
                          {isSelected && <span className="material-symbols-outlined text-white" style={{ fontSize: '12px' }}>check</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            ) : (
              <div className="overflow-x-auto sm:overflow-x-visible">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="pl-3 sm:pl-5 pr-1 sm:pr-2 py-3 sm:py-3.5 w-8 sm:w-10" />
                      <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver</th>
                      <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Phone</th>
                      <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">License No.</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Expiry</th>
                      <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDrivers.map((driver) => {
                      const isRowSelected = String(driver.id) === selectedDriverId;
                      return (
                        <tr key={driver.id} className={`transition-colors ${isRowSelected ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}>
                          <td className="pl-3 sm:pl-5 pr-1 sm:pr-2 py-3 sm:py-4">
                            <div
                              onClick={() => setSelectedDriverId((prev) => prev === String(driver.id) ? null : String(driver.id))}
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${isRowSelected ? 'bg-[#002046] border-[#002046]' : 'bg-white border-slate-300 hover:border-[#002046]/50'}`}
                            >
                              {isRowSelected && <span className="material-symbols-outlined text-white" style={{ fontSize: '12px' }}>check</span>}
                            </div>
                          </td>
                          <td className="px-3 sm:px-5 py-3 sm:py-4">
                            <p className="text-sm font-bold text-slate-900">{getDriverName(driver)}</p>
                            <p className="sm:hidden text-[10px] text-slate-400 mt-0.5">{driver.phone}</p>
                          </td>
                          <td className="px-3 sm:px-5 py-3 sm:py-4 hidden sm:table-cell">
                            <span className="text-sm text-slate-600">{driver.phone || '—'}</span>
                          </td>
                          <td className="px-3 sm:px-5 py-3 sm:py-4">
                            <StatusBadge driver={driver} />
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className="text-sm text-slate-600 font-mono">{driver.licenseNumber || '—'}</span>
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            {driver.licenseExpiry ? (
                              <span className={`text-sm ${isLicenseExpired(driver) ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                                {new Date(driver.licenseExpiry).toLocaleDateString()}
                              </span>
                            ) : <span className="text-sm text-slate-400">—</span>}
                          </td>
                          <td className="hidden sm:table-cell px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(driver)}
                                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                title="Edit driver"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                              <button
                                onClick={() => setDeleteModalDriver(driver)}
                                disabled={deletingDriverId === driver.id}
                                className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors disabled:opacity-60"
                                title="Delete driver"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Add Driver Modal */}
        <DriverFormModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Add Driver"
          icon="person_add"
          iconBg="bg-[#002046]/10"
          iconColor="text-[#002046]"
          form={form}
          onChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
          onSubmit={handleAddDriver}
          submitting={addSubmitting}
        />

        {/* Edit Driver Modal */}
        <DriverFormModal
          open={editModalOpen}
          onClose={() => { setEditModalOpen(false); setEditingDriverId(null); setEditForm(EMPTY_FORM); }}
          title="Edit Driver"
          icon="edit"
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          form={editForm}
          onChange={(field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))}
          onSubmit={handleSaveDriver}
          submitting={editSubmitting}
        />

        {/* Delete Confirm Modal */}
        <DeleteDriverModal
          driver={deleteModalDriver}
          deleting={deletingDriverId === deleteModalDriver?.id}
          onConfirm={async () => {
            await handleDeleteDriver(deleteModalDriver.id);
            setDeleteModalDriver(null);
          }}
          onCancel={() => setDeleteModalDriver(null)}
        />

      </OperatorLayout>
    </>
  );
};

export default Drivers;
