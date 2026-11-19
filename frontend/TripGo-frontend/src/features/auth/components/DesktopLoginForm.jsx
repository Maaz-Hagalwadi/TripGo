import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../shared/contexts/AuthContext';
import TripGoIcon from '../../../assets/icons/TripGoIcon';
import loginBusImg from '../../../assets/images/login-bus.jpg';
import { API_BASE_URL } from '../../../config/env';
import { sanitizeReturnTo, saveReturnToForOAuth } from '../../../shared/utils/returnTo';
import { ROUTES } from '../../../shared/constants/routes';

const OTP_RESEND_SECONDS = 30;
const RATE_LIMIT_WAIT_SECONDS = 60; // backend login bucket refills over one minute

const inputCls = (err) =>
  `w-full pl-12 pr-4 py-3.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-[#FDBA74]/25 focus:border-[#FF8A65] transition-all outline-none ${
    err ? 'border-red-500' : 'border-slate-200'
  }`;

const primaryBtnCls =
  'w-full py-4 px-6 bg-[#0B1F3A] text-white text-sm font-bold rounded-xl hover:bg-[#102A4C] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_14px_30px_rgba(11,31,58,0.22)]';

const linkCls = 'font-bold text-primary hover:text-[#FF8A65] transition-colors';

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const DesktopLoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sendLoginOtp, loginWithOtp, user } = useAuth();
  const [formData, setFormData] = useState({ emailOrPhone: '', password: '', otp: '' });
  const [loginMode, setLoginMode] = useState('password');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [formError, setFormError] = useState('');
  const [lockedFor, setLockedFor] = useState(0);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Page the user was on before being asked to sign in (search results, a protected page, …)
  const returnTo = useMemo(() => sanitizeReturnTo(location.state?.returnTo), [location.state]);

  useEffect(() => {
    if (loginSuccess && user?.role) {
      const t = setTimeout(() => {
        if (returnTo) navigate(returnTo.pathname, { replace: true, state: returnTo.state });
        else if (user.role === 'OPERATOR') navigate('/operator/dashboard');
        else if (user.role === 'ADMIN') navigate('/admin/dashboard');
        else navigate('/dashboard');
      }, 100);
      return () => clearTimeout(t);
    }
  }, [user, loginSuccess, navigate, returnTo]);

  useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setTimeout(() => {
      setLockedFor((s) => s - 1);
      if (lockedFor === 1) setFormError('');
    }, 1000);
    return () => clearTimeout(t);
  }, [lockedFor]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    if (!lockedFor) setFormError('');
  };

  // Failed attempts show a persistent message on the form (toasts disappear too quickly)
  const showFailure = (result) => {
    if (result.rateLimited) setLockedFor(RATE_LIMIT_WAIT_SECONDS);
    setFormError(result.error || 'Something went wrong. Please try again.');
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
    if (!validateBase() || resendIn > 0 || lockedFor > 0) return;
    setFormError('');

    setIsOtpSending(true);
    try {
      const result = await sendLoginOtp({ emailOrPhone: formData.emailOrPhone.trim() });
      if (result.success) {
        setOtpSent(true);
        setResendIn(OTP_RESEND_SECONDS);
        toast.success('Check your email for a 6-digit code.');
      } else {
        showFailure(result);
      }
    } catch {
      showFailure({ error: 'Network error. Please try again.' });
    } finally {
      setIsOtpSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!validateBase() || lockedFor > 0) return;
    setFormError('');

    if (loginMode === 'password' && !formData.password.trim()) {
      setErrors({ password: 'Password is required' });
      return;
    }

    if (loginMode === 'otp' && !formData.otp.trim()) {
      setErrors({ otp: 'Code is required' });
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
        showFailure(result);
      }
    } catch {
      showFailure({ error: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = () => {
    // OAuth leaves the app, so keep the return page in sessionStorage for OAuth2Callback
    saveReturnToForOAuth(location.state?.returnTo);
    window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
  };

  const emailField = (
    <div className="space-y-1.5">
      <label htmlFor="login-identifier" className="text-sm font-semibold text-slate-900">Email or phone</label>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">mail</span>
        <input
          id="login-identifier"
          name="username"
          autoComplete="username"
          className={inputCls(errors.emailOrPhone)}
          placeholder="you@example.com or mobile number"
          type="text"
          value={formData.emailOrPhone}
          onChange={(e) => updateField('emailOrPhone', e.target.value)}
        />
      </div>
      {errors.emailOrPhone && <p className="text-red-600 text-xs">{errors.emailOrPhone}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[46%] relative bg-primary items-center overflow-hidden">
        <img src={loginBusImg} className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-50" alt="" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,31,58,0.97)_0%,rgba(11,31,58,0.85)_48%,rgba(11,31,58,0.35)_100%)]" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-[#FF8A65]/15 blur-3xl" aria-hidden="true" />

        <button onClick={() => navigate('/')} className="absolute top-8 left-14 xl:left-16 z-20 flex items-center gap-3">
          <span className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
            <TripGoIcon className="w-7 h-6 text-white" />
          </span>
          <span className="font-black text-2xl tracking-tight text-white">TripGo</span>
        </button>

        <div className="relative z-10 p-14 xl:p-16 max-w-xl text-white">

          <h1 className="text-5xl font-black leading-[1.1] tracking-tight mb-5 text-white">
            Your next trip<br />
            <span className="bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] bg-clip-text text-transparent">starts here.</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-9">
            Sign in to see your tickets, manage your bookings, and book your next seat in seconds.
          </p>

          <div className="grid gap-3">
            {[
              { icon: 'confirmation_number', title: 'Your tickets in one place', sub: 'Download QR tickets, check boarding points, and manage cancellations.' },
              { icon: 'directions_bus', title: 'Operators sign in here too', sub: 'We’ll take you straight to your fleet dashboard.' },
            ].map(({ icon, title, sub }) => (
              <div key={title} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm">
                <span className="w-10 h-10 flex-shrink-0 rounded-lg bg-[#FDBA74]/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#FDBA74]">{icon}</span>
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {[
              ['No', 'booking fees'],
              ['15 min', 'seat hold at checkout'],
              ['QR', 'e-tickets'],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-xl font-black text-[#FDBA74]">{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="w-full lg:w-[54%] flex flex-col bg-slate-50">
        <div className="p-8 lg:px-12 flex justify-between items-center lg:invisible">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-900">
            <span className="lg:hidden w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <TripGoIcon className="w-6 h-5 text-white" />
            </span>
            <span className="font-black text-xl lg:text-2xl tracking-tight text-primary">TripGo</span>
          </button>
        </div>

        <div className="flex-grow flex items-center justify-center p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-[430px] bg-white border border-slate-200/70 rounded-2xl shadow-[0_24px_70px_rgba(11,31,58,0.10)] p-6 sm:p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-900 mb-2">Welcome back</h2>
              <p className="text-sm text-slate-500">
                {returnTo ? 'Sign in to continue where you left off.' : 'Travellers and operators use the same login.'}
              </p>
            </div>

            <div className="flex p-1 bg-slate-100 rounded-xl mb-8 gap-1" role="tablist">
              {[
                ['password', 'Password', 'lock'],
                ['otp', 'Email code', 'mark_email_read'],
              ].map(([mode, label, icon]) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={loginMode === mode}
                  onClick={() => {
                    setLoginMode(mode);
                    setErrors({});
                    if (!lockedFor) setFormError('');
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    loginMode === mode ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${loginMode === mode ? 'text-[#FF8A65]' : ''}`}>{icon}</span>
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

            {formError && (
              <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <span className="material-symbols-outlined text-red-500 text-[20px] mt-0.5">{lockedFor > 0 ? 'timer' : 'error'}</span>
                <div className="text-sm text-red-700">
                  <p className="font-semibold">{formError}</p>
                  {lockedFor > 0 && <p className="mt-0.5 text-red-600">You can try again in {lockedFor}s.</p>}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* ── PASSWORD MODE ── */}
              {loginMode === 'password' && (
                <>
                  {emailField}

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="login-password" className="text-sm font-semibold text-slate-900">Password</label>
                      <button type="button" onClick={() => navigate('/forgot-password')} className={`text-sm ${linkCls}`}>
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">lock</span>
                      <input
                        id="login-password"
                        name="password"
                        autoComplete="current-password"
                        className={`${inputCls(errors.password)} pr-12`}
                        placeholder="Enter your password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => updateField('password', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {errors.password && <p className="text-red-600 text-xs">{errors.password}</p>}
                  </div>

                  <button type="submit" disabled={isLoading || lockedFor > 0} className={primaryBtnCls}>
                    {lockedFor > 0 ? (
                      <span>Try again in {lockedFor}s</span>
                    ) : isLoading ? (
                      <><Spinner />Signing in...</>
                    ) : (
                      <><span>Sign In</span><span className="material-symbols-outlined text-[20px]">arrow_forward</span></>
                    )}
                  </button>
                </>
              )}

              {/* ── EMAIL CODE MODE — STEP 1: enter email/phone ── */}
              {loginMode === 'otp' && !otpSent && (
                <>
                  {emailField}
                  <p className="-mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-sm text-[#FF8A65]">info</span>
                    We’ll email a 6-digit code to the email address on your account — even if you enter your phone number.
                  </p>

                  <button type="button" onClick={handleSendOtp} disabled={isOtpSending || resendIn > 0 || lockedFor > 0} className={primaryBtnCls}>
                    {lockedFor > 0 ? (
                      <span>Try again in {lockedFor}s</span>
                    ) : isOtpSending ? (
                      <><Spinner />Sending code...</>
                    ) : resendIn > 0 ? (
                      <span>Send again in {resendIn}s</span>
                    ) : (
                      <><span>Email me a code</span><span className="material-symbols-outlined text-[20px]">send</span></>
                    )}
                  </button>
                </>
              )}

              {/* ── EMAIL CODE MODE — STEP 2: enter code ── */}
              {loginMode === 'otp' && otpSent && (
                <>
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-primary text-[18px] shrink-0">mail</span>
                      <span className="text-sm text-slate-900 font-medium truncate">{formData.emailOrPhone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); updateField('otp', ''); }}
                      className={`text-xs shrink-0 ml-3 ${linkCls}`}
                    >
                      Change
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="login-otp" className="text-sm font-semibold text-slate-900">Enter code</label>
                    <p className="text-xs text-slate-500">
                      If an account exists for these details, we’ve emailed a 6-digit code to its email address. It expires in 10 minutes.
                    </p>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">pin</span>
                      <input
                        id="login-otp"
                        name="one-time-code"
                        autoComplete="one-time-code"
                        className={`${inputCls(errors.otp)} tracking-[0.4em] font-bold`}
                        placeholder="• • • • • •"
                        inputMode="numeric"
                        maxLength={6}
                        value={formData.otp}
                        onChange={(e) => updateField('otp', e.target.value.replace(/\D/g, ''))}
                        autoFocus
                      />
                    </div>
                    {errors.otp && <p className="text-red-600 text-xs">{errors.otp}</p>}
                  </div>

                  <button type="submit" disabled={isLoading || lockedFor > 0} className={primaryBtnCls}>
                    {lockedFor > 0 ? (
                      <span>Try again in {lockedFor}s</span>
                    ) : isLoading ? (
                      <><Spinner />Verifying...</>
                    ) : (
                      <><span>Verify &amp; Sign In</span><span className="material-symbols-outlined text-[20px]">arrow_forward</span></>
                    )}
                  </button>

                  <p className="text-center text-xs text-slate-500">
                    Didn&apos;t get it? Check your spam folder, or{' '}
                    {resendIn > 0 ? (
                      <span className="font-semibold text-slate-400">resend in {resendIn}s</span>
                    ) : (
                      <button type="button" onClick={handleSendOtp} disabled={isOtpSending} className={`${linkCls} disabled:opacity-60`}>
                        {isOtpSending ? 'sending...' : 'resend code'}
                      </button>
                    )}
                  </p>
                </>
              )}
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-slate-400 text-xs font-medium">Or continue with</span>
              </div>
            </div>

            <button
              onClick={handleGoogle}
              className="w-full bg-white border border-slate-200 text-slate-900 py-3.5 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all flex justify-center items-center gap-3"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>

            <div className="mt-8 pt-8 border-t border-slate-200 text-center space-y-3">
              <p className="text-sm text-slate-500">
                New to TripGo?{' '}
                <button onClick={() => navigate('/register', { state: location.state })} className={`ml-1 ${linkCls}`}>
                  Create an account
                </button>
              </p>
              <p className="text-sm text-slate-500">
                Running buses?{' '}
                <button onClick={() => navigate('/operator-register')} className={`ml-1 ${linkCls}`}>
                  Become an operator
                </button>
              </p>
            </div>
          </div>
        </div>

        <footer className="p-8 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} TripGo. All rights reserved.</p>
          <div className="flex gap-6">
            {[
              ['Privacy', ROUTES.PRIVACY],
              ['Terms', ROUTES.TERMS],
            ].map(([label, to]) => (
              <Link key={label} to={to} className="text-xs text-slate-400 hover:text-slate-900 transition-colors">{label}</Link>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DesktopLoginForm;
