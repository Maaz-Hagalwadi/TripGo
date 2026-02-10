const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${API_BASE_URL}';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TripGoIcon from '../../assets/icons/TripGoIcon';

const DesktopForgotPasswordForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const forgotPassword = async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `email=${email}`
      });

      if (response.ok) {
        setErrors({ success: 'Reset email sent! Check your inbox.' });
      } else {
        const errorText = await response.text();
        if (errorText.includes('User not found')) {
          setErrors({ email: 'No account found with this email address' });
        } else {
          setErrors({ general: errorText || 'Failed to send reset email. Please try again.' });
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    if (!email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }
    
    setIsLoading(true);
    await forgotPassword(email);
    setIsLoading(false);
  };

  return (
    <div className="bg-deep-black text-slate-100 min-h-screen flex flex-col items-center justify-center p-4">      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] glow-accent blur-3xl"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] glow-accent blur-3xl"></div>
      </div>
      <div className="max-w-6xl w-full bg-charcoal/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-row min-h-[800px]">
        <div 
          className="flex w-1/2 relative bg-cover bg-center items-center p-12 overflow-hidden"
          style={{
            backgroundImage: "linear-gradient(rgba(5, 5, 5, 0.6), rgba(5, 5, 5, 0.8)), url('https://lh3.googleusercontent.com/aida-public/AB6AXuBaWdLvirFLq9gQIzc79yRfhZecULRAzSPQ-Eev3IdORsc2x4lKQEngg0b6iKpxyeUMQ3F3ndbAaochZqTN2xApDbxj_p_cT4_9gOtcKGLnxNMztUuDqUAxUgkV3wbpWpD8twOaCcLb8D_afIznu8gxsBjvhKgjQjMYKn5mpo-cqf4sRm8EXrrYZ9PM2LGiIp1wpostxaih0VJ2ZAvymjAewnAa1CusAzdfLA84hhKCwvxAteOK4ie_JUSDj4zUqp_62VUoc0FM7qvk')"
          }}
        >
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3 mb-12">
              <div className="text-primary cursor-pointer" onClick={() => navigate('/')}>
                <TripGoIcon className="w-10 h-10" />
              </div>
              <span 
                className="text-3xl font-extrabold tracking-tight text-white cursor-pointer hover:text-primary transition-colors" 
                onClick={() => navigate('/')}
              >
                TripGo
              </span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight">Travel with Peace of Mind.</h2>
            <p className="text-slate-300 text-lg max-w-md">Our recovery system ensures you never lose access to your premium travel experiences.</p>
            <div className="pt-8 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined !text-xl">lock_reset</span>
                </div>
                <span className="text-slate-200 font-medium">Quick Recovery Process</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined !text-xl">shield_person</span>
                </div>
                <span className="text-slate-200 font-medium">Encrypted Data Protection</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-deep-black to-transparent opacity-60"></div>
        </div>
        <div className="w-1/2 p-8 md:p-16 flex flex-col justify-center bg-deep-black/60">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-extrabold text-white mb-3">Forgot Password?</h1>
              <p className="text-slate-400">No worries, we'll send you reset instructions.</p>
            </div>
            {errors.success && (
              <div className="p-3 mb-4 bg-green-900/20 border border-green-500/30 rounded-xl text-green-400">
                <p className="text-sm">{errors.success}</p>
              </div>
            )}
            
            {errors.general && (
              <div className="p-3 mb-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400">
                <p className="text-sm">{errors.general}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3 pointer-events-none">mail</span>
                  <input 
                    className={`w-full pl-12 pr-4 py-3 bg-input-gray border ${errors.email ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                    placeholder="name@company.com" 
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                    }}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1 ml-1">{errors.email}</p>
                )}
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-black py-3 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,212,255,0.2)] transform hover:scale-[1.01] active:scale-[0.98] mt-6"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <div className="mt-8 flex flex-col items-center">
              <button 
                onClick={() => navigate('/login')}
                className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold"
              >
                <span className="material-symbols-outlined text-xl transition-transform group-hover:-translate-x-1">arrow_back</span>
                Back to Log In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopForgotPasswordForm;