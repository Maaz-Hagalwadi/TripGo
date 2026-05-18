import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import TripGoIcon from '../../../assets/icons/TripGoIcon';
import { API_BASE_URL } from '../../../config/env';

const BUS_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBn8Xu6YxgTm5MyWzn7d6Rl_cxu8YTmtjqgy0nYJP5Vh2kEeVlUNjVps6hzkLOTjgVOKBP4GDXQpbxUUvUkrqOwENA_tYK7J8Skr9kxzSSGwX-CUzXUXwjOS3XFejwT18N285GQidhRXHAQ7sWjw_I8-slj3CJDnoWDDgf8gmOchEhN7NqncJYuVZwWl8iXr63k-nmF3uAm0prUmXBg0fIKzG_IwSq0gf3scYz5nXofG_ywlfMF8A8O44VsvjWbW3fv9jgpHFEGZ1WD';

const inputCls = (err) =>
  `w-full pl-12 pr-4 py-3.5 bg-[#fbfcfe] border rounded-lg text-sm text-[#111827] placeholder:text-[#8a94a6] focus:ring-4 focus:ring-[#0B1F3A]/10 focus:border-[#0B1F3A] transition-all outline-none ${
    err ? 'border-[#B42318]' : 'border-[#d8dde8]'
  }`;

const textareaCls = (err) =>
  `w-full pl-12 pr-4 py-3.5 bg-[#fbfcfe] border rounded-lg text-sm text-[#111827] placeholder:text-[#8a94a6] focus:ring-4 focus:ring-[#0B1F3A]/10 focus:border-[#0B1F3A] transition-all outline-none resize-none ${
    err ? 'border-[#B42318]' : 'border-[#d8dde8]'
  }`;

const FieldError = ({ children }) => (
  children ? <p className="text-[#B42318] text-xs">{children}</p> : null
);

const DesktopOperatorForm = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '',
    operatorName: '', shortName: '', contactPhone: '', contactEmail: '', address: '',
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((p) => ({ ...p, [field]: val }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const validateForm = () => {
    const e = {};
    if (!formData.firstName.trim()) e.firstName = 'First name is required';
    if (!formData.lastName.trim()) e.lastName = 'Last name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Enter a valid email';
    if (!formData.phone.trim()) e.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) e.phone = 'Must be 10 digits';
    if (!formData.password.trim()) e.password = 'Password is required';
    else if (!/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(formData.password)) {
      e.password = 'Min 8 chars with letters, numbers & symbols';
    }
    if (!formData.confirmPassword.trim()) e.confirmPassword = 'Confirm your password';
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!formData.operatorName.trim()) e.operatorName = 'Company name is required';
    if (!formData.shortName.trim()) e.shortName = 'Short name is required';
    if (!formData.contactPhone.trim()) e.contactPhone = 'Contact phone is required';
    else if (!/^\d{10}$/.test(formData.contactPhone.replace(/\D/g, ''))) e.contactPhone = 'Must be 10 digits';
    if (!formData.contactEmail.trim()) e.contactEmail = 'Contact email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) e.contactEmail = 'Enter a valid email';
    if (!formData.address.trim()) e.address = 'Address is required';
    if (!formData.agreeToTerms) e.agreeToTerms = 'You must agree to the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setErrors({});
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/operators/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          operatorName: formData.operatorName,
          shortName: formData.shortName,
          contactPhone: formData.contactPhone,
          contactEmail: formData.contactEmail,
          address: formData.address,
        }),
      });

      if (res.ok) {
        toast.success('Registration successful! Awaiting admin approval.');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        const text = await res.text();
        try {
          const obj = JSON.parse(text);
          if (obj.message?.includes('email:')) setErrors({ email: obj.message.split('email: ')[1] });
          else if (obj.message?.includes('phone:')) setErrors({ phone: 'Phone must be exactly 10 digits' });
          else if (text.includes('Email already in use')) setErrors({ email: 'Email already in use' });
          else if (text.includes('Phone already in use')) setErrors({ phone: 'Phone already in use' });
          else toast.error(obj.message || 'Registration failed');
        } catch {
          toast.error('Registration failed. Please try again.');
        }
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-[#f5f7fb] text-[#111827]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="hidden lg:flex lg:w-[46%] relative bg-[#121826] items-center overflow-hidden">
        <img src={BUS_IMG} className="absolute inset-0 h-full w-full object-cover opacity-45" alt="" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,24,38,0.98)_0%,rgba(18,24,38,0.86)_44%,rgba(18,24,38,0.42)_100%)]" />
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.32) 1px, transparent 0)', backgroundSize: '34px 34px' }}
        />
        <div className="absolute left-0 top-0 h-full w-1.5 bg-[#0B1F3A]" />

        <div className="relative z-10 p-14 xl:p-16 max-w-xl text-white">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 mb-12">
            <span className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <TripGoIcon className="w-7 h-7 text-white" />
            </span>
            <span className="font-black text-2xl tracking-tight text-white">TripGo</span>
          </button>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 mb-6">
            <span className="material-symbols-outlined text-[16px] text-[#D6E8FF]">directions_bus</span>
            Operator partner registration
          </p>
          <h1 className="text-5xl font-bold leading-tight mb-5 text-white">
            Bring your bus routes onto TripGo.
          </h1>
          <p className="text-white/72 text-lg leading-relaxed mb-9">
            Register your company, verify your contact details, and start preparing your fleet for online bookings.
          </p>
          <div className="grid gap-3">
            {[
              { icon: 'route', title: 'Route Management', sub: 'List routes, schedules, seats, and boarding points.' },
              { icon: 'verified_user', title: 'Admin Approval', sub: 'Operator accounts are reviewed before going live.' },
            ].map(({ icon, title, sub }) => (
              <div key={title} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm">
                <span className="material-symbols-outlined text-[#D6E8FF]">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-white/58 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {[
              ['Fleet', 'tools'],
              ['Secure', 'access'],
              ['Live', 'routes'],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-xl font-black text-white">{value}</p>
                <p className="text-xs text-white/52 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[54%] flex flex-col bg-[#f5f7fb]">
        <div className="p-8 lg:px-12 flex justify-between items-center">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#111827]">
            <TripGoIcon className="w-7 h-7 text-[#0B1F3A] lg:hidden" />
            <span className="font-black text-xl lg:text-2xl tracking-tight">TripGo</span>
          </button>
        </div>

        <div className="flex-grow flex items-center justify-center p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-[560px] bg-white border border-[#e4e8f0] rounded-2xl shadow-[0_24px_70px_rgba(17,24,39,0.10)] p-6 sm:p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-[#111827] mb-2">Register as operator</h2>
              <p className="text-sm text-[#667085]">Create your partner profile and submit company details for approval.</p>
            </div>

            <div className="flex p-1 bg-[#f2f4f7] rounded-xl mb-8 gap-1">
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all text-[#667085] hover:bg-white"
              >
                Traveller
              </button>
              <button type="button" className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all bg-white text-[#0B1F3A] shadow-sm">
                Operator
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-xs font-semibold text-[#8a94a6] uppercase tracking-widest">Personal Information</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">First Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">person</span>
                    <input className={inputCls(errors.firstName)} placeholder="Enter first name" type="text" value={formData.firstName} onChange={set('firstName')} />
                  </div>
                  <FieldError>{errors.firstName}</FieldError>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">Last Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">person</span>
                    <input className={inputCls(errors.lastName)} placeholder="Enter last name" type="text" value={formData.lastName} onChange={set('lastName')} />
                  </div>
                  <FieldError>{errors.lastName}</FieldError>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">Email Address</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">mail</span>
                    <input className={inputCls(errors.email)} placeholder="Enter your mail" type="email" value={formData.email} onChange={set('email')} />
                  </div>
                  <FieldError>{errors.email}</FieldError>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">Phone Number</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">call</span>
                    <input className={inputCls(errors.phone)} placeholder="10-digit number" type="tel" value={formData.phone} onChange={set('phone')} />
                  </div>
                  <FieldError>{errors.phone}</FieldError>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">lock</span>
                    <input className={`${inputCls(errors.password)} pr-12`} placeholder="Enter password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={set('password')} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#98a2b3] hover:text-[#111827] transition-colors">
                      <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  <FieldError>{errors.password}</FieldError>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">Confirm Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">lock</span>
                    <input className={inputCls(errors.confirmPassword)} placeholder="Re-enter password" type="password" value={formData.confirmPassword} onChange={set('confirmPassword')} />
                  </div>
                  <FieldError>{errors.confirmPassword}</FieldError>
                </div>
              </div>

              <p className="text-xs font-semibold text-[#8a94a6] uppercase tracking-widest pt-2">Company Information</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">Company Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">business</span>
                    <input className={inputCls(errors.operatorName)} placeholder="Enter company name" type="text" value={formData.operatorName} onChange={set('operatorName')} />
                  </div>
                  <FieldError>{errors.operatorName}</FieldError>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">Short Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">badge</span>
                    <input className={inputCls(errors.shortName)} placeholder="Enter short name" type="text" value={formData.shortName} onChange={set('shortName')} />
                  </div>
                  <FieldError>{errors.shortName}</FieldError>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">Contact Phone</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">call</span>
                    <input className={inputCls(errors.contactPhone)} placeholder="10-digit number" type="tel" value={formData.contactPhone} onChange={set('contactPhone')} />
                  </div>
                  <FieldError>{errors.contactPhone}</FieldError>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">Contact Email</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">mail</span>
                    <input className={inputCls(errors.contactEmail)} placeholder="company@example.com" type="email" value={formData.contactEmail} onChange={set('contactEmail')} />
                  </div>
                  <FieldError>{errors.contactEmail}</FieldError>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#111827]">Company Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-4 text-[#98a2b3] text-[20px] pointer-events-none">location_on</span>
                  <textarea className={textareaCls(errors.address)} placeholder="Enter your company address" rows={2} value={formData.address} onChange={set('address')} />
                </div>
                <FieldError>{errors.address}</FieldError>
              </div>

              <div className="flex items-start gap-3 py-1">
                <input
                  id="operator-terms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={set('agreeToTerms')}
                  className="mt-1 w-5 h-5 rounded border-[#d8dde8] cursor-pointer"
                  style={{ accentColor: '#0B1F3A' }}
                />
                <label htmlFor="operator-terms" className="text-sm text-[#667085] leading-relaxed select-none cursor-pointer">
                  By registering as an operator, I agree to the{' '}
                  <a href="#" className="text-[#0B1F3A] font-semibold hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-[#0B1F3A] font-semibold hover:underline">Privacy Policy</a>.
                </label>
              </div>
              {errors.agreeToTerms && <p className="text-[#B42318] text-xs -mt-2">{errors.agreeToTerms}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 bg-[#0B1F3A] text-white text-sm font-bold rounded-xl hover:bg-[#102A4C] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_14px_30px_rgba(11,31,58,0.22)]"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <span>Register as Operator</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </>
                )}
              </button>
              {isLoading && <p className="text-center text-xs text-[#8a94a6]">Submitting your application...</p>}
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#e4e8f0]" /></div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-[#8a94a6] text-xs font-medium">Or continue with</span>
              </div>
            </div>

            <button
              onClick={() => { window.location.href = `${API_BASE_URL}/oauth2/authorization/google`; }}
              className="w-full bg-white border border-[#d8dde8] text-[#111827] py-3.5 rounded-xl text-sm font-semibold hover:bg-[#f8fafc] active:scale-[0.98] transition-all flex justify-center items-center gap-3 mb-8"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <div className="pt-8 border-t border-[#e4e8f0] text-center">
              <p className="text-sm text-[#667085]">
                Already have an account?{' '}
                <button onClick={() => navigate('/login')} className="text-[#0B1F3A] font-bold hover:underline ml-1">
                  Sign in instead
                </button>
              </p>
            </div>
          </div>
        </div>

        <footer className="p-8 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#8a94a6]">© {new Date().getFullYear()} TripGo. All rights reserved.</p>
          <div className="flex gap-6">
            {['Status', 'Privacy', 'Terms'].map((l) => (
              <a key={l} href="#" className="text-xs text-[#8a94a6] hover:text-[#111827] transition-colors">{l}</a>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DesktopOperatorForm;
