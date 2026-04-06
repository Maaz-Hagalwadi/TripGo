import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { changePassword, updateCurrentUser } from '../../../api/userService';
import { getMyCompletedTrips, submitTripRating } from '../../../api/bookingService';

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, loading, checkAuth, logout } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwordModal, setPasswordModal] = useState({
    open: false,
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [ratingDrafts, setRatingDrafts] = useState({});
  const [submittingRatingFor, setSubmittingRatingFor] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'USER') {
      navigate(ROUTES.HOME);
      return;
    }
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
    });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'USER') return;

    const loadCompletedTrips = async () => {
      setLoadingTrips(true);
      try {
        const data = await getMyCompletedTrips();
        const list = Array.isArray(data) ? data : Array.isArray(data?.trips) ? data.trips : [];
        setCompletedTrips(list);
      } catch (e) {
        toast.error(e.message || 'Failed to load completed trips');
      } finally {
        setLoadingTrips(false);
      }
    };

    loadCompletedTrips();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!form.firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!form.lastName.trim()) {
      toast.error('Last name is required');
      return;
    }

    setSavingProfile(true);
    try {
      await updateCurrentUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
      });
      await checkAuth();
      toast.success('Profile updated successfully');
    } catch (e) {
      toast.error(e.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const openPasswordModal = () => {
    setPasswordModal({
      open: true,
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const closePasswordModal = () => {
    setPasswordModal({
      open: false,
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleChangePassword = async () => {
    const oldPassword = passwordModal.oldPassword.trim();
    const newPassword = passwordModal.newPassword.trim();
    const confirmPassword = passwordModal.confirmPassword.trim();

    if (!oldPassword) {
      toast.error('Current password is required');
      return;
    }
    if (!newPassword) {
      toast.error('New password is required');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    const loadingToast = toast.loading('Changing password...');
    try {
      await changePassword(oldPassword, newPassword);
      toast.success('Password changed successfully', { id: loadingToast });
      closePasswordModal();
    } catch (e) {
      toast.error(e.message || 'Failed to change password', { id: loadingToast });
    } finally {
      setChangingPassword(false);
    }
  };

  const getTripScheduleId = (trip) => trip?.scheduleId || trip?.id || trip?.tripId || '';
  const getTripRoute = (trip) => {
    const from = trip?.fromCity || trip?.from || trip?.source || trip?.origin;
    const to = trip?.toCity || trip?.to || trip?.destination;
    if (from && to) return `${from} → ${to}`;
    return trip?.routeName || 'Route';
  };
  const getTripBusName = (trip) => trip?.busName || trip?.operatorBusName || 'Bus';
  const getTripDate = (trip) => trip?.travelDate || trip?.departureTime || trip?.completedAt || '';
  const canRateTrip = (trip) => !trip?.alreadyRated && !trip?.ratingSubmitted && getTripScheduleId(trip);

  const handleSubmitRating = async (trip) => {
    const scheduleId = getTripScheduleId(trip);
    if (!scheduleId) return toast.error('Schedule ID missing for this trip');

    const draft = ratingDrafts[scheduleId] || {};
    const rating = Number(draft.rating || 0);
    if (!rating || rating < 1 || rating > 5) {
      return toast.error('Please select a rating between 1 and 5');
    }

    setSubmittingRatingFor(scheduleId);
    try {
      await submitTripRating(scheduleId, {
        rating,
        comment: String(draft.comment || '').trim(),
      });
      toast.success('Rating submitted successfully');
      setCompletedTrips((prev) =>
        prev.map((item) => (getTripScheduleId(item) === scheduleId ? { ...item, alreadyRated: true, ratingSubmitted: true } : item))
      );
    } catch (e) {
      toast.error(e.message || 'Failed to submit rating');
    } finally {
      setSubmittingRatingFor('');
    }
  };

  return (
    <UserLayout activeItem="profile" title="My Profile">
      <div className="space-y-6">
        <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-1">Profile Details</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Update your personal details used for bookings and communication.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">First Name *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                placeholder="Enter first name"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Last Name *</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                placeholder="Enter last name"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-500"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-1">Security</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Keep your account secure with password updates and device logout.</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={openPasswordModal}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Change Password
            </button>
            <button
              onClick={() => {
                logout();
                navigate(ROUTES.LOGIN);
              }}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-1">Rate Completed Trips</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Ratings are available only after trip completion.</p>

          {loadingTrips ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading completed trips...</p>
          ) : completedTrips.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No completed trips found yet.</p>
          ) : (
            <div className="space-y-3">
              {completedTrips.map((trip, index) => {
                const scheduleId = getTripScheduleId(trip) || `trip-${index}`;
                const rated = Boolean(trip?.alreadyRated || trip?.ratingSubmitted);
                const currentDraft = ratingDrafts[scheduleId] || {};
                return (
                  <div key={scheduleId} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <p className="font-semibold">{getTripRoute(trip)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{getTripBusName(trip)} {getTripDate(trip) ? `• ${new Date(getTripDate(trip)).toLocaleDateString('en-IN')}` : ''}</p>
                      </div>
                      {rated && <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Rated</span>}
                    </div>

                    {canRateTrip(trip) ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Rating *</label>
                          <select
                            value={currentDraft.rating || ''}
                            onChange={(e) => setRatingDrafts((prev) => ({ ...prev, [scheduleId]: { ...prev[scheduleId], rating: e.target.value } }))}
                            className="w-full md:w-40 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                          >
                            <option value="">Select</option>
                            <option value="1">1 - Poor</option>
                            <option value="2">2 - Fair</option>
                            <option value="3">3 - Good</option>
                            <option value="4">4 - Very Good</option>
                            <option value="5">5 - Excellent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Comment (optional)</label>
                          <textarea
                            rows={2}
                            value={currentDraft.comment || ''}
                            onChange={(e) => setRatingDrafts((prev) => ({ ...prev, [scheduleId]: { ...prev[scheduleId], comment: e.target.value } }))}
                            placeholder="Share your trip experience"
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                          />
                        </div>
                        <button
                          onClick={() => handleSubmitRating(trip)}
                          disabled={submittingRatingFor === scheduleId}
                          className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
                        >
                          {submittingRatingFor === scheduleId ? 'Submitting...' : 'Submit Rating'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {rated ? 'You already submitted a rating for this trip.' : 'Rating will be available after the trip is completed.'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {passwordModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-op-card rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-1">Change Password</h3>
            <p className="text-xs text-slate-500 mb-4">Enter your current password and set a new password.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Current Password *</label>
                <input
                  type="password"
                  value={passwordModal.oldPassword}
                  onChange={(e) => setPasswordModal((prev) => ({ ...prev, oldPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">New Password *</label>
                <input
                  type="password"
                  value={passwordModal.newPassword}
                  onChange={(e) => setPasswordModal((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  value={passwordModal.confirmPassword}
                  onChange={(e) => setPasswordModal((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={closePasswordModal}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="px-4 py-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors font-semibold disabled:opacity-60"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

export default UserProfile;
