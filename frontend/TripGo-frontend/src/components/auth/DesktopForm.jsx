import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TripGoIcon from '../../assets/icons/TripGoIcon';

const DesktopForm = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    agreeToTerms: false
  });

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
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight">Start Your Premium Journey Today.</h2>
            <p className="text-slate-300 text-lg max-w-md">Join over 2 million travelers booking seamless bus journeys across 500+ cities.</p>
            <div className="pt-8 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined !text-xl">verified_user</span>
                </div>
                <span className="text-slate-200 font-medium">Safe & Secure Booking</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined !text-xl">stars</span>
                </div>
                <span className="text-slate-200 font-medium">VIP Fleet Access</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-deep-black to-transparent opacity-60"></div>
        </div>
        <div className="w-1/2 p-8 md:p-16 flex flex-col justify-center bg-deep-black/60">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-extrabold text-white mb-3">Create Account</h1>
              <p className="text-slate-400">Enter your details to register for your TripGo account.</p>
            </div>
            <form className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3 pointer-events-none">person</span>
                  <input 
                    className="w-full pl-12 pr-4 py-3 bg-input-gray border border-white/5 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
                    placeholder="Enter Your Name" 
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3 pointer-events-none">mail</span>
                  <input 
                    className="w-full pl-12 pr-4 py-3 bg-input-gray border border-white/5 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
                    placeholder="name@company.com" 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3 pointer-events-none">call</span>
                  <input 
                    className="w-full pl-12 pr-4 py-3 bg-input-gray border border-white/5 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
                    placeholder="9765764530" 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3 pointer-events-none">lock</span>
                  <input 
                    className="w-full pl-12 pr-12 py-3 bg-input-gray border border-white/5 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors" 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined">visibility</span>
                  </button>
                </div>
              </div>
              <div className="flex items-start gap-3 py-2">
                <div className="flex items-center h-5">
                  <input 
                    className="w-5 h-5 rounded border-white/10 bg-input-gray text-primary focus:ring-primary focus:ring-offset-deep-black transition-all cursor-pointer" 
                    id="terms" 
                    type="checkbox"
                    checked={formData.agreeToTerms}
                    onChange={(e) => setFormData(prev => ({ ...prev, agreeToTerms: e.target.checked }))}
                  />
                </div>
                <label className="text-sm text-slate-400 leading-tight" htmlFor="terms">
                  I agree to the <a className="text-primary hover:underline font-medium" href="#">Terms and Conditions</a> and <a className="text-primary hover:underline font-medium" href="#">Privacy Policy</a>.
                </label>
              </div>
              <button className="w-full bg-primary hover:bg-primary/90 text-black py-3 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,212,255,0.2)] transform hover:scale-[1.01] active:scale-[0.98]">
                Create Account
              </button>
            </form>
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-deep-black px-2 text-slate-500 font-bold tracking-widest">Or sign up with</span>
              </div>
            </div>
            <button className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="text-xs font-bold">Google</span>
            </button>
            <p className="text-center mt-3 text-slate-400">
              Already have an account? 
              <button 
                onClick={() => navigate('/login')}
                className="text-primary hover:underline font-bold ml-1"
              >
                Log In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopForm;