import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { updateCurrentUser } from '../../../api/userService';
import { ROUTES } from '../../../shared/constants/routes';
import TripGoIcon from '../../../assets/icons/TripGoIcon';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required';
    if (!formData.phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^\+?[0-9]{7,15}$/.test(formData.phone.trim())) errs.phone = 'Enter a valid phone number';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsLoading(true);
    try {
      await updateCurrentUser({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
      });
      const role = await checkAuth();
      if (role === 'OPERATOR') navigate(ROUTES.OPERATOR_DASHBOARD, { replace: true });
      else if (role === 'ADMIN') navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
      else navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="bg-deep-black text-slate-100 min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] glow-accent blur-3xl"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] glow-accent blur-3xl"></div>
      </div>

      <div className="max-w-md w-full bg-charcoal/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 md:p-12 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="text-primary cursor-pointer" onClick={() => navigate(ROUTES.HOME)}>
            <TripGoIcon className="w-8 h-8" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white">TripGo</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-white mb-2">Complete Your Profile</h1>
          <p className="text-slate-400 text-sm">Just a few more details to get you started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-silver-text ml-1">First Name</label>
              <input
                className={`w-full px-4 py-3.5 bg-input-gray border ${errors.firstName ? 'border-red-500' : 'border-white/10'} rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`}
                placeholder="Enter first name"
                value={formData.firstName}
                onChange={handleChange('firstName')}
              />
              {errors.firstName && <p className="text-red-400 text-xs ml-1">{errors.firstName}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-silver-text ml-1">Last Name</label>
              <input
                className={`w-full px-4 py-3.5 bg-input-gray border ${errors.lastName ? 'border-red-500' : 'border-white/10'} rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`}
                placeholder="Enter last name"
                value={formData.lastName}
                onChange={handleChange('lastName')}
              />
              {errors.lastName && <p className="text-red-400 text-xs ml-1">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-silver-text ml-1">Phone Number</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">phone</span>
              <input
                className={`w-full pl-12 pr-4 py-3.5 bg-input-gray border ${errors.phone ? 'border-red-500' : 'border-white/10'} rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`}
                placeholder="Enter phone number"
                type="tel"
                value={formData.phone}
                onChange={handleChange('phone')}
              />
            </div>
            {errors.phone && <p className="text-red-400 text-xs ml-1">{errors.phone}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-black py-4 rounded-xl font-extrabold text-lg transition-all shadow-[0_0_20px_rgba(0,212,255,0.2)] transform hover:scale-[1.01] active:scale-[0.99] mt-2"
          >
            {isLoading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
