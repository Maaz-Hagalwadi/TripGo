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

const DesktopForgotPasswordForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!email.trim()) { setErrors({ email: 'Email is required' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrors({ email: 'Please enter a valid email address' }); return; }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `email=${encodeURIComponent(email)}`,
      });

      if (response.ok) {
        setSent(true);
        toast.success('Reset email sent! Check your inbox.');
      } else {
        const data = await response.json().catch(() => ({}));
        const msg = data.message || '';
        if (msg.includes('User not found')) setErrors({ email: 'No account found with this email address' });
        else if (msg.includes('OAuth')) toast.error('This account uses Google sign-in. Password reset is not available.');
        else toast.error(msg || 'Failed to send reset email. Please try again.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f5f7fb] text-[#111827]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left panel */}
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
            <span className="material-symbols-outlined text-[16px] text-[#D6E8FF]">lock_reset</span>
            Secure account recovery
          </p>
          <h1 className="text-5xl font-bold leading-tight mb-5 text-white">
            Recover your account in seconds.
          </h1>
          <p className="text-white/72 text-lg leading-relaxed mb-9">
            Enter your email and we'll send you a secure link to reset your password and get back on the road.
          </p>
          <div className="grid gap-3">
            {[
              { icon: 'shield_person', title: 'Encrypted Reset Link', sub: 'Your link expires in 15 minutes for maximum security.' },
              { icon: 'mark_email_read', title: 'Instant Delivery', sub: 'Reset instructions sent straight to your inbox.' },
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
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-[54%] flex flex-col bg-[#f5f7fb]">
        <div className="p-8 lg:px-12 flex justify-between items-center">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#111827]">
            <TripGoIcon className="w-7 h-7 text-[#0B1F3A] lg:hidden" />
            <span className="font-black text-xl lg:text-2xl tracking-tight">TripGo</span>
          </button>
        </div>

        <div className="flex-grow flex items-center justify-center p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-[430px] bg-white border border-[#e4e8f0] rounded-2xl shadow-[0_24px_70px_rgba(17,24,39,0.10)] p-6 sm:p-8">
            {!sent ? (
              <>
                <div className="mb-8">
                  <div className="h-11 w-11 rounded-xl bg-[#f2f4f7] border border-[#e4e8f0] flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-[#0B1F3A] text-[22px]">lock_reset</span>
                  </div>
                  <h2 className="text-3xl font-bold text-[#111827] mb-2">Forgot password?</h2>
                  <p className="text-sm text-[#667085]">No worries, we'll send you reset instructions.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[#111827]">Email address</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[20px] pointer-events-none">mail</span>
                      <input
                        className={inputCls(errors.email)}
                        placeholder="Enter your email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                      />
                    </div>
                    {errors.email && <p className="text-[#B42318] text-xs">{errors.email}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 px-6 bg-[#0B1F3A] text-white text-sm font-bold rounded-xl hover:bg-[#102A4C] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_14px_30px_rgba(11,31,58,0.22)]"
                  >
                    {isLoading ? (
                      <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Sending...</>
                    ) : (
                      <><span>Send Reset Link</span><span className="material-symbols-outlined text-[20px]">arrow_forward</span></>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-8 border-t border-[#e4e8f0] text-center">
                  <button
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] hover:text-[#111827] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to log in
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="h-14 w-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-5">
                  <span className="material-symbols-outlined text-green-600 text-[28px]">mark_email_read</span>
                </div>
                <h2 className="text-2xl font-bold text-[#111827] mb-2">Check your email</h2>
                <p className="text-sm text-[#667085] mb-1">We sent a password reset link to</p>
                <p className="text-sm font-semibold text-[#111827] mb-6">{email}</p>
                <p className="text-xs text-[#8a94a6] mb-8">
                  Didn't receive the email?{' '}
                  <button onClick={() => setSent(false)} className="font-bold text-[#0B1F3A] hover:underline">
                    Try again
                  </button>
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] hover:text-[#111827] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Back to log in
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="p-8 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#8a94a6]">© {new Date().getFullYear()} TripGo. All rights reserved.</p>
          <div className="flex gap-6">
            {['Privacy', 'Terms'].map((l) => (
              <a key={l} href="#" className="text-xs text-[#8a94a6] hover:text-[#111827] transition-colors">{l}</a>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DesktopForgotPasswordForm;
