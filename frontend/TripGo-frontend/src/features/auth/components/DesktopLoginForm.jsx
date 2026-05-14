import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../shared/contexts/AuthContext';
import TripGoIcon from '../../../assets/icons/TripGoIcon';
import { API_BASE_URL } from '../../../config/env';

const BUS_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBn8Xu6YxgTm5MyWzn7d6Rl_cxu8YTmtjqgy0nYJP5Vh2kEeVlUNjVps6hzkLOTjgVOKBP4GDXQpbxUUvUkrqOwENA_tYK7J8Skr9kxzSSGwX-CUzXUXwjOS3XFejwT18N285GQidhRXHAQ7sWjw_I8-slj3CJDnoWDDgf8gmOchEhN7NqncJYuVZwWl8iXr63k-nmF3uAm0prUmXBg0fIKzG_IwSq0gf3scYz5nXofG_ywlfMF8A8O44VsvjWbW3fv9jgpHFEGZ1WD';

const inputCls = (err) =>
  `w-full pl-12 pr-4 py-3.5 bg-[#fbfcfe] border rounded-lg text-sm text-[#111827] placeholder:text-[#8a94a6] focus:ring-4 focus:ring-[#0B1F3A]/10 focus:border-[#0B1F3A] transition-all outline-none ${
    err ? 'border-[#B42318]' : 'border-[#d8dde8]'
  }`;

const DesktopLoginForm = () => {
  const navigate = useNavigate();
  const { login, sendLoginOtp, loginWithOtp, user } = useAuth();
  const [formData, setFormData] = useState({ emailOrPhone: '', password: '', otp: '' });
  const [loginMode, setLoginMode] = useState('password');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (loginSuccess && user?.role) {
      const t = setTimeout(() => {
        if (user.role === 'OPERATOR') navigate('/operator/dashboard');
        else if (user.role === 'ADMIN') navigate('/admin/dashboard');
        else navigate('/dashboard');
      }, 100);
      return () => clearTimeout(t);
    }
  }, [user, loginSuccess, navigate]);

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateBase = () => {
    if (!formData.emailOrPhone.trim()) {
      setErrors({ emailOrPhone: 'Email or phone is required' });
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    setErrors({});
    if (!validateBase()) return;

    setIsOtpSending(true);
    try {
      const result = await sendLoginOtp({ emailOrPhone: formData.emailOrPhone.trim() });
      if (result.success) {
        setOtpSent(true);
        toast.success('OTP sent successfully.');
      } else {
        toast.error(result.error || 'Failed to send OTP');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsOtpSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!validateBase()) return;

    if (loginMode === 'password' && !formData.password.trim()) {
      setErrors({ password: 'Password is required' });
      return;
    }

    if (loginMode === 'otp' && !formData.otp.trim()) {
      setErrors({ otp: 'OTP is required' });
      return;
    }

    setIsLoading(true);
    try {
      const result = loginMode === 'otp'
        ? await loginWithOtp({
            emailOrPhone: formData.emailOrPhone.trim(),
            otp: formData.otp.trim(),
          })
        : await login({
            emailOrPhone: formData.emailOrPhone.trim(),
            password: formData.password,
          });

      if (result.success) {
        toast.success('Login successful!');
        setLoginSuccess(true);
      } else if (result.error?.toLowerCase().includes('suspend')) {
        setSuspended(true);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
            <span className="material-symbols-outlined text-[16px] text-[#D6E8FF]">verified</span>
            One secure login for every TripGo account
          </p>
          <h1 className="text-5xl font-bold leading-tight mb-5 text-white">
            Manage every bus journey from one professional workspace.
          </h1>
          <p className="text-white/72 text-lg leading-relaxed mb-9">
            Travellers and operators sign in from the same page, then TripGo takes each user to the right dashboard.
          </p>
          <div className="grid gap-3">
            {[
              { icon: 'event_seat', title: 'Passenger Bookings', sub: 'View tickets, seats, boarding points, and trip history.' },
              { icon: 'directions_bus', title: 'Operator Access', sub: 'Approved partners continue straight to fleet tools.' },
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
              ['500+', 'routes'],
              ['24/7', 'support'],
              ['Instant', 'tickets'],
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
          <a href="#" className="text-sm font-semibold text-[#44474e] hover:text-[#0B1F3A] transition-colors">Support</a>
        </div>

        <div className="flex-grow flex items-center justify-center p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-[430px] bg-white border border-[#e4e8f0] rounded-2xl shadow-[0_24px_70px_rgba(17,24,39,0.10)] p-6 sm:p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-[#111827] mb-2">Welcome back</h2>
              <p className="text-sm text-[#667085]">Use one login for traveller, operator, and admin access.</p>
            </div>

            <div className="flex p-1 bg-[#f2f4f7] rounded-xl mb-8 gap-1">
              {[
                ['password', 'Password', 'lock'],
                ['otp', 'Login with OTP', 'sms'],
              ].map(([mode, label, icon]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setLoginMode(mode);
                    setErrors({});
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    loginMode === mode ? 'bg-white text-[#0B1F3A] shadow-sm' : 'text-[#667085] hover:bg-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {suspended && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                <span className="material-symbols-outlined text-orange-500 mt-0.5 text-[20px]">block</span>
                <p className="text-orange-700 text-sm">
                  Account suspended. Contact{' '}
                  <a href="mailto:support@tripgo.com" className="font-bold underline">support@tripgo.com</a>
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#111827]">Email or Phone</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">mail</span>
                  <input
                    className={inputCls(errors.emailOrPhone)}
                    placeholder="name@example.com or mobile number"
                    type="text"
                    value={formData.emailOrPhone}
                    onChange={(e) => {
                      updateField('emailOrPhone', e.target.value);
                      setOtpSent(false);
                    }}
                  />
                </div>
                {errors.emailOrPhone && <p className="text-[#B42318] text-xs">{errors.emailOrPhone}</p>}
              </div>

              {loginMode === 'password' ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-[#111827]">Password</label>
                    <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm font-semibold text-[#0B1F3A] hover:underline">
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">lock</span>
                    <input
                      className={`${inputCls(errors.password)} pr-12`}
                      placeholder="Enter your password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#98a2b3] hover:text-[#111827] transition-colors">
                      <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {errors.password && <p className="text-[#B42318] text-xs">{errors.password}</p>}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-[#111827]">One-Time Password</label>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isOtpSending}
                      className="text-sm font-semibold text-[#0B1F3A] hover:underline disabled:opacity-60"
                    >
                      {isOtpSending ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">pin</span>
                    <input
                      className={inputCls(errors.otp)}
                      placeholder="Enter OTP"
                      inputMode="numeric"
                      value={formData.otp}
                      onChange={(e) => updateField('otp', e.target.value)}
                    />
                  </div>
                  {errors.otp && <p className="text-[#B42318] text-xs">{errors.otp}</p>}
                  {otpSent && <p className="text-xs text-[#667085]">OTP sent to your registered email or mobile number.</p>}
                </div>
              )}

              {loginMode === 'otp' && !otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isOtpSending}
                  className="w-full py-4 px-6 bg-[#0B1F3A] text-white text-sm font-bold rounded-xl hover:bg-[#102A4C] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_14px_30px_rgba(11,31,58,0.22)]"
                >
                  {isOtpSending ? 'Sending OTP...' : 'Send OTP'}
                  <span className="material-symbols-outlined text-[20px]">sms</span>
                </button>
              ) : (
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
                      Signing In...
                    </>
                  ) : (
                    <>
                      <span>{loginMode === 'otp' ? 'Verify & Sign In' : 'Sign In'}</span>
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </>
                  )}
                </button>
              )}
              {isLoading && <p className="text-center text-xs text-[#8a94a6]">First login may take up to 60 seconds...</p>}
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#e4e8f0]" /></div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-[#8a94a6] text-xs font-medium">Or continue with</span>
              </div>
            </div>

            <button
              onClick={() => { window.location.href = `${API_BASE_URL}/oauth2/authorization/google`; }}
              className="w-full bg-white border border-[#d8dde8] text-[#111827] py-3.5 rounded-xl text-sm font-semibold hover:bg-[#f8fafc] active:scale-[0.98] transition-all flex justify-center items-center gap-3"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>

            <div className="mt-8 pt-8 border-t border-[#e4e8f0] text-center space-y-3">
              <p className="text-sm text-[#667085]">
                New to TripGo?{' '}
                <button onClick={() => navigate('/register')} className="text-[#0B1F3A] font-bold hover:underline ml-1">
                  Create traveller account
                </button>
              </p>
              <p className="text-sm text-[#667085]">
                Running buses with TripGo?{' '}
                <button onClick={() => navigate('/operator-register')} className="text-[#0B1F3A] font-bold hover:underline ml-1">
                  Become an operator
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

export default DesktopLoginForm;
