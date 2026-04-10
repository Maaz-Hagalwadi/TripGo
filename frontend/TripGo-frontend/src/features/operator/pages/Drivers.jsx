import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { getDrivers, addDriver, updateDriver, deleteDriver } from '../../../api/operatorDriverService';
import './OperatorDashboard.css';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  licenseNumber: '',
  licenseExpiry: ''
};

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getDriverName = (driver) => {
  const fullName = `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim();
  return fullName || driver?.phone || 'Driver';
};

const getLicenseDate = (driver) => {
  if (!driver?.licenseExpiry) return null;
  const expiry = new Date(driver.licenseExpiry);
  if (Number.isNaN(expiry.getTime())) return null;
  expiry.setHours(0, 0, 0, 0);
  return expiry;
};

const isLicenseExpired = (driver) => {
  const expiry = getLicenseDate(driver);
  if (!expiry) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiry < today;
};

const Drivers = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingDriverId, setDeletingDriverId] = useState(null);
  const [deleteModalDriver, setDeleteModalDriver] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const today = new Date();
  const expiringSoon = drivers.filter((d) => {
    if (!d.licenseExpiry) return false;
    const expiry = new Date(d.licenseExpiry);
    const diff = (expiry - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  }).length;
  const expiredLicenses = drivers.filter((driver) => isLicenseExpired(driver)).length;

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') {
      navigate(ROUTES.HOME);
      return;
    }
    fetchDrivers();
  }, [user, loading, navigate]);

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
      setSaving(true);
      await addDriver(form);
      setForm(EMPTY_FORM);
      await fetchDrivers();
      toast.success('Driver added');
    } catch (e) {
      toast.error(e.message || 'Failed to add driver');
    } finally {
      setSaving(false);
    }
  };

  const startEditDriver = (driver) => {
    setEditingDriverId(driver.id);
    setEditForm({
      firstName: driver.firstName || '',
      lastName: driver.lastName || '',
      phone: driver.phone || '',
      licenseNumber: driver.licenseNumber || '',
      licenseExpiry: driver.licenseExpiry || ''
    });
  };

  const cancelEditDriver = () => {
    setEditingDriverId(null);
    setEditForm(EMPTY_FORM);
  };

  const handleSaveDriver = async (driverId) => {
    if (!editForm.firstName || !editForm.phone || !editForm.licenseNumber || !editForm.licenseExpiry) {
      toast.error('First name, phone, license number and expiry are required');
      return;
    }

    try {
      setSavingEdit(true);
      await updateDriver(driverId, editForm);
      toast.success('Driver updated');
      setEditingDriverId(null);
      await fetchDrivers();
    } catch (e) {
      toast.error(e.message || 'Failed to update driver');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteDriver = async (driverId) => {
    try {
      setDeletingDriverId(driverId);
      await deleteDriver(driverId);
      toast.success('Driver deleted');
      await fetchDrivers();
    } catch (e) {
      toast.error(e.message || 'Failed to delete driver');
    } finally {
      setDeletingDriverId(null);
    }
  };

  const requestDeleteDriver = (driver) => {
    setDeleteModalDriver(driver);
  };

  return (
    <OperatorLayout activeItem="drivers" title="Drivers">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-500">Total Drivers</p>
          <p className="text-3xl font-bold mt-1">{drivers.length}</p>
        </div>
        <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-500">Licenses Expiring in 30 Days</p>
          <p className="text-3xl font-bold mt-1">{expiringSoon}</p>
        </div>
        <div className="bg-white dark:bg-op-card border border-red-200 dark:border-red-900/50 rounded-xl p-5">
          <p className="text-sm text-slate-500">Expired Licenses</p>
          <p className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{expiredLicenses}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Add Driver</h3>
          <button
            onClick={fetchDrivers}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">First Name *</label>
            <input
              placeholder="Enter driver first name"
              value={form.firstName}
              onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Last Name</label>
            <input
              placeholder="Enter driver last name"
              value={form.lastName}
              onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Phone *</label>
            <input
              placeholder="Enter phone number"
              value={form.phone}
              onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">License No. *</label>
            <input
              placeholder="Enter license number"
              value={form.licenseNumber}
              onChange={(e) => setForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">License Expiry *</label>
            <input
              type="date"
              value={form.licenseExpiry}
              onChange={(e) => setForm(prev => ({ ...prev, licenseExpiry: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
          </div>
          <div className="lg:col-span-5 flex justify-end">
            <button
              onClick={handleAddDriver}
              disabled={saving}
              className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saving ? 'Adding...' : 'Add Driver'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="font-bold">Driver List</h3>
          <div className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
            {['grid', 'list'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${viewMode === mode ? 'bg-white text-slate-900 shadow-sm dark:bg-black/40 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}
              >
                {mode === 'grid' ? 'Grid' : 'List'}
              </button>
            ))}
          </div>
        </div>
        {loadingDrivers ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary inline-block"></span>
            Loading drivers...
          </div>
        ) : drivers.length === 0 ? (
          <p className="text-sm text-slate-400">No drivers added yet.</p>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-2'}>
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className={`rounded-lg px-3 py-3 text-sm ${viewMode === 'grid' ? '' : 'flex items-center justify-between'} ${
                  isLicenseExpired(driver)
                    ? 'bg-red-50 dark:bg-red-950/25 ring-1 ring-red-200 dark:ring-red-900/50'
                    : 'bg-slate-50 dark:bg-slate-800'
                }`}
              >
                {editingDriverId === driver.id ? (
                  <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                    <input
                      placeholder="Enter first name"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                      className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                    />
                    <input
                      placeholder="Enter last name"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                      className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                    />
                    <input
                      placeholder="Enter phone number"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                    />
                    <input
                      placeholder="Enter license number"
                      value={editForm.licenseNumber}
                      onChange={(e) => setEditForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
                      className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                    />
                    <input
                      type="date"
                      value={editForm.licenseExpiry}
                      onChange={(e) => setEditForm(prev => ({ ...prev, licenseExpiry: e.target.value }))}
                      className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                    />
                    <div className="md:col-span-5 flex items-center justify-end gap-3">
                      <button
                        onClick={() => cancelEditDriver()}
                        className="text-xs text-slate-600 dark:text-slate-300 hover:underline"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveDriver(driver.id)}
                        disabled={savingEdit}
                        className="px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {savingEdit ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`flex ${viewMode === 'grid' ? 'h-full flex-col gap-4' : 'items-center justify-between w-full'}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{getDriverName(driver)}</span>
                        {driver.phone && <span className="text-slate-400">· {driver.phone}</span>}
                        {driver.licenseNumber && <span className="text-slate-400">· {driver.licenseNumber}</span>}
                        {isLicenseExpired(driver) && (
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
                            Driver Expired License
                          </span>
                        )}
                      </div>
                      <div className={`${viewMode === 'grid' ? 'mt-auto flex items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-700' : 'flex items-center gap-3'}`}>
                        <span className={`text-xs ${isLicenseExpired(driver) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-400'}`}>
                          {driver.licenseExpiry
                            ? isLicenseExpired(driver)
                              ? `Expired ${new Date(driver.licenseExpiry).toLocaleDateString()}`
                              : `Expires ${new Date(driver.licenseExpiry).toLocaleDateString()}`
                            : ''}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => startEditDriver(driver)}
                            className="text-xs text-primary hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => requestDeleteDriver(driver)}
                            disabled={deletingDriverId === driver.id}
                            className="text-xs text-red-500 hover:underline disabled:opacity-60"
                          >
                            {deletingDriverId === driver.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteModalDriver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-op-card rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500">delete</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Delete Driver</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{getDriverName(deleteModalDriver)}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModalDriver(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleDeleteDriver(deleteModalDriver.id);
                  setDeleteModalDriver(null);
                }}
                disabled={deletingDriverId === deleteModalDriver.id}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deletingDriverId === deleteModalDriver.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
};

export default Drivers;
