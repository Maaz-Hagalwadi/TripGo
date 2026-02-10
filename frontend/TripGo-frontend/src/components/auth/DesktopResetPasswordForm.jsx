const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${API_BASE_URL}';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TripGoIcon from '../../assets/icons/TripGoIcon';

const DesktopResetPasswordForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (resetToken) {
      setToken(resetToken);
    } else {
      setErrors({ general: 'Invalid or missing reset token' });
    }
  }, [searchParams]);

  const resetPassword = async (token, newPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          newPassword: newPassword
        })
      });

      if (response.ok) {
        setErrors({ success: 'Password reset successful! Redirecting to login...' });
        setTimeout(() => navigate('/login'), 2000);
      } else {
        const errorText = await response.text();
        if (errorText.includes('Invalid or expired token')) {
          setErrors({ general: 'Reset link has expired. Please request a new one.' });
        } else {
          setErrors({ general: errorText || 'Password reset failed. Please try again.' });
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else {
      const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(formData.newPassword)) {
        newErrors.newPassword = 'Password must be at least 8 characters with letters, numbers, and symbols';
      }
    }
    
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    if (!token) {
      setErrors({ general: 'Invalid reset token' });
      return;
    }
    
    if (validateForm()) {
      setIsLoading(true);
      await resetPassword(token, formData.newPassword);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-deep-black text-slate-100 min-h-screen flex items-center justify-center p-4">
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
              <div className="text-primary">
                <TripGoIcon className="w-10 h-10" />
              </div>
              <span className="text-3xl font-extrabold tracking-tight text-white">TripGo</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight">Secure Your Account.</h2>
            <p className="text-slate-300 text-lg max-w-md">Create a strong password to protect your TripGo account.</p>
          </div>
        </div>
        <div className="w-1/2 p-8 md:p-16 flex flex-col justify-center bg-deep-black/60">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-extrabold text-white mb-3">Reset Password</h1>
              <p className="text-slate-400">Enter your new password below.</p>
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
                <label className="text-sm font-semibold text-silver-text ml-1">New Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3">lock</span>
                  <input 
                    className={`w-full pl-12 pr-12 py-4 bg-input-gray border ${errors.newPassword ? 'border-red-500' : 'border-white/10'} rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={formData.newPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, newPassword: e.target.value }));
                      if (errors.newPassword) setErrors(prev => ({ ...prev, newPassword: '' }));
                    }}
                  />
                  <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors" 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined">visibility</span>
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-red-400 text-xs mt-1 ml-1">{errors.newPassword}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-silver-text ml-1">Confirm Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3">lock</span>
                  <input 
                    className={`w-full pl-12 pr-4 py-4 bg-input-gray border ${errors.confirmPassword ? 'border-red-500' : 'border-white/10'} rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                    placeholder="••••••••" 
                    type="password"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
                      if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1 ml-1">{errors.confirmPassword}</p>
                )}
              </div>
              
              <button 
                type="submit"
                disabled={isLoading || !token}
                className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-black py-4 rounded-xl font-extrabold text-lg transition-all shadow-[0_0_20px_rgba(0,212,255,0.2)] transform hover:scale-[1.01] active:scale-[0.99] mt-2"
              >
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
            
            <div className="mt-12 text-center">
              <p className="text-slate-400">
                Remember your password? 
                <button 
                  onClick={() => navigate('/login')}
                  className="text-primary font-bold hover:underline ml-1"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopResetPasswordForm;