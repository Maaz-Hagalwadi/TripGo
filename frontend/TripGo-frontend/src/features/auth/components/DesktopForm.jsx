import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import TripGoIcon from '../../../assets/icons/TripGoIcon';
import { API_BASE_URL } from '../../../config/env';

const BUS_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBn8Xu6YxgTm5MyWzn7d6Rl_cxu8YTmtjqgy0nYJP5Vh2kEeVlUNjVps6hzkLOTjgVOKBP4GDXQpbxUUvUkrqOwENA_tYK7J8Skr9kxzSSGwX-CUzXUXwjOS3XFejwT18N285GQidhRXHAQ7sWjw_I8-slj3CJDnoWDDgf8gmOchEhN7NqncJYuVZwWl8iXr63k-nmF3uAm0prUmXBg0fIKzG_IwSq0gf3scYz5nXofG_ywlfMF8A8O44VsvjWbW3fv9jgpHFEGZ1WD';

const inputCls = (err) =>
  `w-full pl-12 pr-4 py-3.5 bg-[#fbfcfe] border rounded-lg text-sm text-[#111827] placeholder:text-[#8a94a6] focus:ring-4 focus:ring-[#0B1F3A]/10 focus:border-[#0B1F3A] transition-all outline-none ${
    err ? 'border-[#0B1F3A]' : 'border-[#d8dde8]'
  }`;

const DesktopForm = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '', agreeToTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: '' }));
  };

  const registerUser = async (data) => {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 90000);
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, password: data.password }),
        signal: controller.signal,
      });
      clearTimeout(tid);
      if (res.ok) {
        toast.success('Account created! Please check your email to verify.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        const txt = await res.text();
        try {
          const obj = JSON.parse(txt);
          if (obj.message?.includes('phone:')) setErrors({ phone: 'Phone must be exactly 10 digits' });
          else if (obj.message?.includes('email:')) setErrors({ email: obj.message.split('email: ')[1] });
          else if (txt.includes('Email already in use')) setErrors({ email: 'Email already in use' });
          else if (txt.includes('Phone already in use')) setErrors({ phone: 'Phone already in use' });
          else toast.error(obj.message || 'Registration failed');
        } catch {
          if (txt.includes('Email already in use')) setErrors({ email: 'Email already in use' });
          else if (txt.includes('Phone already in use')) setErrors({ phone: 'Phone already in use' });
          else toast.error('Registration failed. Please try again.');
        }
      }
    } catch (err) {
      toast.error(`Network error: ${err.message}`);
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.firstName.trim()) e.firstName = 'First name is required';
    if (!formData.lastName.trim())  e.lastName  = 'Last name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Enter a valid email';
    if (!formData.phone.trim()) e.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) e.phone = 'Must be 10 digits';
    if (!formData.password.trim()) e.password = 'Password is required';
    else if (!/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(formData.password))
      e.password = 'Min 8 chars with letters, numbers & symbols';
    if (!formData.confirmPassword.trim()) e.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!formData.agreeToTerms) e.agreeToTerms = 'You must agree to the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!validate()) return;
    setIsLoading(true);
    await registerUser(formData);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-[#f5f7fb] text-[#111827]" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Left brand panel ── */}
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
            <span className="material-symbols-outlined text-[16px] text-[#D6E8FF]">confirmation_number</span>
            Fast e-ticket booking
          </p>
          <h1 className="text-5xl font-bold leading-tight mb-5 text-white">
            Start travelling with a cleaner way to book.
          </h1>
          <p className="text-white/72 text-lg leading-relaxed mb-9">
            Create your TripGo account to compare routes, save traveller details, and keep every ticket in one place.
          </p>
          <div className="grid gap-3">
            {[
              { icon: 'route', title: '500+ Connected Routes', sub: 'Find convenient departures across major cities.' },
              { icon: 'payments', title: 'Secure Checkout', sub: 'Pay safely and receive instant booking confirmation.' },
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
              ['Fast', 'search'],
              ['Secure', 'payments'],
              ['Easy', 'refunds'],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-xl font-black text-white">{value}</p>
                <p className="text-xs text-white/52 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="w-full lg:w-[54%] flex flex-col bg-[#f5f7fb]">
        {/* Header */}
        <div className="p-8 lg:px-12 flex justify-between items-center">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#111827]">
            <TripGoIcon className="w-7 h-7 text-[#0B1F3A] lg:hidden" />
            <span className="font-black text-xl lg:text-2xl tracking-tight">TripGo</span>
          </button>
          <a href="#" className="text-sm font-semibold text-[#44474e] hover:text-[#0B1F3A] transition-colors">Support</a>
        </div>

        {/* Main form */}
        <div className="flex-grow flex items-center justify-center p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-[500px] bg-white border border-[#e4e8f0] rounded-2xl shadow-[0_24px_70px_rgba(17,24,39,0.10)] p-6 sm:p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-[#111827] mb-2">Create your account</h2>
              <p className="text-sm text-[#667085]">Book faster, save traveller details, and manage every trip in one place.</p>
            </div>

            {/* Toggle */}
            <div className="flex p-1 bg-[#f2f4f7] rounded-xl mb-8 gap-1">
              <button className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all bg-white text-[#0B1F3A] shadow-sm">
                Traveler
              </button>
              <button
                type="button"
                onClick={() => navigate('/operator-register')}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all text-[#667085] hover:bg-white"
              >
                Operator
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Row 1: First + Last */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">First Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">person</span>
                    <input className={inputCls(errors.firstName)} placeholder="John" type="text" value={formData.firstName} onChange={set('firstName')} />
                  </div>
                  {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">Last Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">person</span>
                    <input className={inputCls(errors.lastName)} placeholder="Doe" type="text" value={formData.lastName} onChange={set('lastName')} />
                  </div>
                  {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#111827]">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">mail</span>
                  <input className={inputCls(errors.email)} placeholder="name@example.com" type="email" autoComplete="off" value={formData.email} onChange={set('email')} />
                </div>
                {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
              </div>

              {/* Row 2: Phone + Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">Phone Number</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">call</span>
                    <input className={inputCls(errors.phone)} placeholder="10-digit number" type="tel" value={formData.phone} onChange={set('phone')} />
                  </div>
                  {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#111827]">Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">lock</span>
                    <input className={`${inputCls(errors.password)} pr-12`} placeholder="••••••••" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={formData.password} onChange={set('password')} />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#98a2b3] hover:text-[#111827] transition-colors">
                      <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#111827]">Confirm Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">lock</span>
                  <input className={inputCls(errors.confirmPassword)} placeholder="Re-enter password" type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={set('confirmPassword')} />
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword}</p>}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 py-1">
                <input
                  id="terms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={set('agreeToTerms')}
                  className="mt-1 w-5 h-5 rounded border-[#d8dde8] cursor-pointer"
                  style={{ accentColor: '#0B1F3A' }}
                />
                <label htmlFor="terms" className="text-sm text-[#667085] leading-relaxed select-none cursor-pointer">
                  By creating an account, I agree to the{' '}
                  <a href="#" className="text-[#0B1F3A] font-semibold hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-[#0B1F3A] font-semibold hover:underline">Privacy Policy</a>.
                </label>
              </div>
              {errors.agreeToTerms && <p className="text-red-500 text-xs -mt-2">{errors.agreeToTerms}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 bg-[#0B1F3A] text-white text-sm font-bold rounded-xl hover:bg-[#102A4C] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_14px_30px_rgba(11,31,58,0.22)]"
              >
                {isLoading ? (
                  <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Creating Account…</>
                ) : (
                  <><span>Create Account</span><span className="material-symbols-outlined text-[20px]">arrow_forward</span></>
                )}
              </button>
              {isLoading && <p className="text-center text-xs text-[#8a94a6]">First registration may take up to 60 seconds…</p>}
            </form>

            <div className="mt-8 pt-8 border-t border-[#e4e8f0] text-center">
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
            {['Status', 'Privacy', 'Terms'].map(l => (
              <a key={l} href="#" className="text-xs text-[#8a94a6] hover:text-[#111827] transition-colors">{l}</a>
            ))}
          </div>
        </footer>
      </div>

    </div>
  );
};

export default DesktopForm;
