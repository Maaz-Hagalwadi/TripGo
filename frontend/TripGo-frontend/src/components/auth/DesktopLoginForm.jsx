const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TripGoIcon from '../../assets/icons/TripGoIcon';

const DesktopLoginForm = () => {
  const navigate = useNavigate();
  const { login, checkAuth, user } = useAuth();
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    console.log('Login redirect check - loginSuccess:', loginSuccess, 'user:', user, 'role:', user?.role);
    if (loginSuccess && user && user.role) {
      console.log('Redirecting based on role:', user.role);
      if (user.role === 'OPERATOR') {
        navigate('/operator/dashboard');
      } else if (user.role === 'USER') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    }
  }, [user, loginSuccess, navigate]);

  const loginUser = async (formData) => {
    try {
      const success = await login({
        emailOrPhone: formData.emailOrPhone,
        password: formData.password
      });

      if (success) {
        setErrors({ success: 'Login successful! Redirecting...' });
        setLoginSuccess(true);
      } else {
        setErrors({ general: 'Invalid email/phone or password' });
      }
    } catch (error) {
      console.error('Network error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    if (!formData.emailOrPhone.trim()) {
      setErrors({ emailOrPhone: 'Email or phone is required' });
      return;
    }
    if (!formData.password.trim()) {
      setErrors({ password: 'Password is required' });
      return;
    }
    
    setIsLoading(true);
    await loginUser(formData);
    setIsLoading(false);
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
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight">Travel Redefined. <br/><span className="text-primary">Experience Luxury.</span></h2>
            <p className="text-slate-300 text-lg max-w-md">Join thousands of travelers who choose TripGo for their premium city-to-city journeys.</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-deep-black to-transparent opacity-60"></div>
        </div>
        <div className="w-1/2 p-8 md:p-16 flex flex-col justify-center bg-deep-black/60">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-extrabold text-white mb-3">Welcome Back</h1>
              <p className="text-slate-400">Please enter your details to access your account.</p>
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
                <label className="text-sm font-semibold text-silver-text ml-1">Email or Phone</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3">mail</span>
                  <input 
                    className={`w-full pl-12 pr-4 py-4 bg-input-gray border ${errors.emailOrPhone ? 'border-red-500' : 'border-white/10'} rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                    placeholder="name@company.com or phone" 
                    type="text"
                    value={formData.emailOrPhone}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, emailOrPhone: e.target.value }));
                      if (errors.emailOrPhone) setErrors(prev => ({ ...prev, emailOrPhone: '' }));
                    }}
                  />
                </div>
                {errors.emailOrPhone && (
                  <p className="text-red-400 text-xs mt-1 ml-1">{errors.emailOrPhone}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-semibold text-silver-text">Password</label>
                  <a 
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3">lock</span>
                  <input 
                    className={`w-full pl-12 pr-4 py-4 bg-input-gray border ${errors.password ? 'border-red-500' : 'border-white/10'} rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                    placeholder="••••••••" 
                    type="password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, password: e.target.value }));
                      if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                    }}
                  />
                </div>
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1 ml-1">{errors.password}</p>
                )}
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-black py-4 rounded-xl font-extrabold text-lg transition-all shadow-[0_0_20px_rgba(0,212,255,0.2)] transform hover:scale-[1.01] active:scale-[0.99] mt-2"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
            <div className="mt-10">
              <div className="relative flex items-center mb-8">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-xs font-bold uppercase tracking-widest">Or continue with</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>
              <button className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all font-semibold">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
            </div>
            <div className="mt-12 text-center">
              <p className="text-slate-400">
                Don't have an account? 
                <button 
                  onClick={() => navigate('/register')}
                  className="text-primary font-bold hover:underline ml-1"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopLoginForm;