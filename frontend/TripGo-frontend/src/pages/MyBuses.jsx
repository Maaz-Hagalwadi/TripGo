import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OperatorSidebar from '../components/operator/OperatorSidebar';
import { getBuses, deleteBus, updateBus, getAmenities } from '../api/amenityService';
import './OperatorDashboard.css';

const MyBuses = () => {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [activeView, setActiveView] = useState('my-buses');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [buses, setBuses] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [busToDelete, setBusToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [busToEdit, setBusToEdit] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [editFormData, setEditFormData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [updating, setUpdating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [busToView, setBusToView] = useState(null);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/');
      return;
    }
    if (user.role && user.role !== 'OPERATOR') {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchBuses();
    fetchAmenities();
  }, []);

  const fetchBuses = async () => {
    try {
      setLoadingBuses(true);
      const data = await getBuses();
      setBuses(data || []);
    } catch (error) {
      console.error('Failed to fetch buses:', error);
      setBuses([]);
    } finally {
      setLoadingBuses(false);
    }
  };

  const fetchAmenities = async () => {
    try {
      const data = await getAmenities();
      setAmenities(data || []);
    } catch (error) {
      console.error('Failed to fetch amenities:', error);
    }
  };

  const handleViewDetails = (bus) => {
    setBusToView(bus);
    setShowDetailsModal(true);
  };

  const handleDeleteClick = (bus) => {
    setBusToDelete(bus);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!busToDelete) return;
    try {
      setDeleting(true);
      await deleteBus(busToDelete.id);
      setShowDeleteModal(false);
      setBusToDelete(null);
      setSuccessMessage('Bus Deleted Successfully!');
      setShowSuccessModal(true);
      setTimeout(async () => {
        await fetchBuses();
        setShowSuccessModal(false);
      }, 1500);
    } catch (error) {
      alert(error.message || 'Failed to delete bus');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (bus) => {
    setBusToEdit(bus);
    setEditFormData({
      name: bus.name,
      busCode: bus.busCode,
      vehicleNumber: bus.vehicleNumber,
      model: bus.model,
      totalSeats: bus.totalSeats,
      busType: bus.busType,
      amenityIds: bus.amenities?.map(a => a.id) || []
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAmenityToggle = (amenityId) => {
    setEditFormData(prev => ({
      ...prev,
      amenityIds: prev.amenityIds.includes(amenityId)
        ? prev.amenityIds.filter(id => id !== amenityId)
        : [...prev.amenityIds, amenityId]
    }));
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editFormData.name?.trim()) errors.name = 'Bus name is required';
    if (!editFormData.busCode?.trim()) errors.busCode = 'Bus code is required';
    if (!editFormData.vehicleNumber?.trim()) errors.vehicleNumber = 'Vehicle number is required';
    if (!editFormData.model?.trim()) errors.model = 'Model is required';
    if (!editFormData.totalSeats || editFormData.totalSeats < 1) errors.totalSeats = 'Valid total seats required';
    if (!editFormData.busType) errors.busType = 'Bus type is required';
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateBus = async () => {
    if (!validateEditForm()) return;
    try {
      setUpdating(true);
      await updateBus(busToEdit.id, editFormData);
      setShowEditModal(false);
      setBusToEdit(null);
      setSuccessMessage('Bus Updated Successfully!');
      setShowSuccessModal(true);
      setTimeout(async () => {
        await fetchBuses();
        setShowSuccessModal(false);
      }, 1500);
    } catch (error) {
      alert(error.message || 'Failed to update bus');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    { id: 1, message: "New booking received for Route TRP-102", time: "10 min ago", unread: true },
    { id: 2, message: "Bus TRP-088 maintenance scheduled", time: "1 hour ago", unread: true },
    { id: 3, message: "Monthly revenue report available", time: "2 hours ago", unread: false }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getBusTypeLabel = (type) => {
    return type.replace(/_/g, ' ');
  };

  const filteredBuses = buses.filter(bus => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return bus.active === true;
    if (statusFilter === 'inactive') return bus.active === false;
    return true;
  });

  return (
    <div className="bg-background-light dark:bg-[#101e22] text-slate-900 dark:text-slate-100 min-h-screen flex">
      <div className="operator-sidebar">
        <OperatorSidebar activeItem={activeView} onNavigate={setActiveView} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      <main className={`operator-main flex-1 flex flex-col min-w-0 overflow-hidden transition-all ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101e22] flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-lg font-semibold capitalize">My Buses</h2>
            <div className="operator-search relative max-w-md w-full ml-4">
              <span className="material-symbols-outlined absolute left-3 top-[11px] text-slate-400 text-[18px]">search</span>
              <input className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Search buses..." type="text"/>
            </div>
            <button
              onClick={fetchBuses}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refresh
            </button>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="notification-dropdown absolute right-0 mt-2 w-80 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-sm">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className={`p-4 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${notification.unread ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-slate-500 mt-1">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                </div>
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>
              {showProfileDropdown && (
                <div className="profile-dropdown absolute right-0 mt-2 w-56 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <p className="font-bold text-sm">{user?.name || 'Operator'}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <button className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                    <span className="text-sm">Profile</span>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">settings</span>
                    <span className="text-sm">Settings</span>
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 text-red-600">
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({buses.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Active ({buses.filter(b => b.active).length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Pending ({buses.filter(b => !b.active).length})
            </button>
          </div>
          {loadingBuses ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-slate-500">Loading buses...</p>
              </div>
            </div>
          ) : filteredBuses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">directions_bus</span>
              <p className="text-slate-500 text-lg mb-4">No buses found</p>
              <button
                onClick={() => navigate('/operator/add-bus')}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
              >
                Add Your First Bus
              </button>
            </div>
          ) : (
            <div className="bus-grid grid gap-6">
              {filteredBuses.map((bus) => (
                <div key={bus.id} className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{bus.name}</h3>
                        <p className="text-sm text-slate-500">{bus.busCode}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="material-symbols-outlined text-primary text-3xl">directions_bus</span>
                        {bus.active ? (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full font-medium">Active</span>
                        ) : (
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded-full font-medium">Pending</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">tag</span>
                        <span className="text-slate-600 dark:text-slate-400">{bus.vehicleNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">category</span>
                        <span className="text-slate-600 dark:text-slate-400">{getBusTypeLabel(bus.busType)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">event_seat</span>
                        <span className="text-slate-600 dark:text-slate-400">{bus.totalSeats} Seats</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">precision_manufacturing</span>
                        <span className="text-slate-600 dark:text-slate-400">{bus.model}</span>
                      </div>
                    </div>

                    {bus.amenities && bus.amenities.length > 0 ? (
                      <div className="mb-4">
                        <p className="text-xs text-slate-500 mb-2">Amenities & Features</p>
                        <div className="flex flex-wrap gap-2">
                          {bus.amenities.map((amenity) => (
                            <span key={amenity.id} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                              {amenity.code}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <p className="text-xs text-slate-500 mb-2">Amenities & Features</p>
                        <p className="text-xs text-slate-400">No amenities selected</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <button onClick={() => handleViewDetails(bus)} className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors text-sm">
                        View Details
                      </button>
                      <button onClick={() => handleEditClick(bus)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      {bus.active && (
                        <button onClick={() => handleDeleteClick(bus)} className="px-4 py-2 border border-red-200 dark:border-red-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showDetailsModal && busToView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Bus Details</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-4xl">directions_bus</span>
                </div>
                <div>
                  <h4 className="text-2xl font-bold">{busToView.name}</h4>
                  <p className="text-slate-500">{busToView.busCode}</p>
                </div>
                {busToView.active ? (
                  <span className="ml-auto text-sm bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-3 py-1 rounded-full font-medium">Active</span>
                ) : (
                  <span className="ml-auto text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-full font-medium">Pending</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Vehicle Number</p>
                  <p className="font-semibold">{busToView.vehicleNumber}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Bus Type</p>
                  <p className="font-semibold">{getBusTypeLabel(busToView.busType)}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Total Seats</p>
                  <p className="font-semibold">{busToView.totalSeats}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Model</p>
                  <p className="font-semibold">{busToView.model}</p>
                </div>
              </div>
              {busToView.amenities && busToView.amenities.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-3">Amenities & Features</p>
                  <div className="grid grid-cols-3 gap-2">
                    {busToView.amenities.map((amenity) => (
                      <div key={amenity.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                        <span className="text-sm">{amenity.code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDetailsModal(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Close
              </button>
              <button onClick={() => { setShowDetailsModal(false); handleEditClick(busToView); }} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                Edit Bus
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Delete Bus</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete <span className="font-bold">{busToDelete?.name}</span> ({busToDelete?.busCode})? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-2xl w-full my-8">
            <h3 className="text-xl font-bold mb-6">Edit Bus</h3>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium mb-2">Bus Name</label>
                <input type="text" value={editFormData.name || ''} onChange={(e) => handleEditChange('name', e.target.value)} className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 ${editErrors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`} />
                {editErrors.name && <p className="text-red-500 text-xs mt-1">{editErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Bus Code</label>
                <input type="text" value={editFormData.busCode || ''} onChange={(e) => handleEditChange('busCode', e.target.value)} className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 ${editErrors.busCode ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`} />
                {editErrors.busCode && <p className="text-red-500 text-xs mt-1">{editErrors.busCode}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Vehicle Number</label>
                <input type="text" value={editFormData.vehicleNumber || ''} onChange={(e) => handleEditChange('vehicleNumber', e.target.value)} className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 ${editErrors.vehicleNumber ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`} />
                {editErrors.vehicleNumber && <p className="text-red-500 text-xs mt-1">{editErrors.vehicleNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <input type="text" value={editFormData.model || ''} onChange={(e) => handleEditChange('model', e.target.value)} className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 ${editErrors.model ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`} />
                {editErrors.model && <p className="text-red-500 text-xs mt-1">{editErrors.model}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Total Seats</label>
                <input type="number" value={editFormData.totalSeats || ''} onChange={(e) => handleEditChange('totalSeats', parseInt(e.target.value))} className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 ${editErrors.totalSeats ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`} />
                {editErrors.totalSeats && <p className="text-red-500 text-xs mt-1">{editErrors.totalSeats}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Bus Type</label>
                <select value={editFormData.busType || ''} onChange={(e) => handleEditChange('busType', e.target.value)} className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 ${editErrors.busType ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}>
                  <option value="">Select Bus Type</option>
                  <optgroup label="Seater Buses">
                    <option value="SEATER">Seater</option>
                    <option value="SEMI_SLEEPER">Semi Sleeper</option>
                    <option value="PUSH_BACK">Push Back</option>
                  </optgroup>
                  <optgroup label="Sleeper Buses">
                    <option value="SLEEPER">Sleeper</option>
                    <option value="AC_SLEEPER">AC Sleeper</option>
                  </optgroup>
                  <optgroup label="Premium Buses">
                    <option value="VOLVO_AC">Volvo AC</option>
                    <option value="VOLVO_MULTI_AXLE">Volvo Multi Axle</option>
                    <option value="SCANIA_MULTI_AXLE">Scania Multi Axle</option>
                  </optgroup>
                </select>
                {editErrors.busType && <p className="text-red-500 text-xs mt-1">{editErrors.busType}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Amenities</label>
                <div className="grid grid-cols-2 gap-2">
                  {amenities.map((amenity) => (
                    <label key={amenity.id} className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input type="checkbox" checked={editFormData.amenityIds?.includes(amenity.id)} onChange={() => handleAmenityToggle(amenity.id)} className="w-4 h-4" />
                      <span className="text-sm">{amenity.code}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} disabled={updating} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleUpdateBus} disabled={updating} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                {updating ? 'Updating...' : 'Update Bus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-semibold">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="mobile-bottom-nav fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-slate-800 z-40">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => navigate('/operator/dashboard')} className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-[22px]">dashboard</span>
            <span className="text-[10px]">Overview</span>
          </button>
          <button onClick={() => navigate('/operator/my-buses')} className="flex flex-col items-center gap-1 text-primary">
            <span className="material-symbols-outlined text-[22px]">directions_bus</span>
            <span className="text-[10px]">Buses</span>
          </button>
          <button onClick={() => navigate('/operator/add-bus')} className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-[22px]">add_circle</span>
            <span className="text-[10px]">Add Bus</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-[22px]">schedule</span>
            <span className="text-[10px]">Schedule</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            <span className="text-[10px]">Bookings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyBuses;
