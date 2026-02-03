import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TripGoIcon from '../../assets/icons/TripGoIcon';

const DesktopForm = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const registerUser = async (formData) => {
    try {
      console.log('Sending registration request:', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });
      
      const response = await fetch('http://localhost:8080/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.ok) {
        const message = await response.text();
        console.log('Success response:', message);
        setErrors({ success: 'Registration successful! Please check your email to verify your account.' });
        setTimeout(() => navigate('/login'), 2000);
      } else {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        
        try {
          const errorObj = JSON.parse(errorText);
          if (errorObj.message && errorObj.message.includes('phone:')) {
            setErrors({ phone: 'Phone must be exactly 10 digits' });
          } else if (errorObj.message && errorObj.message.includes('email:')) {
            setErrors({ email: errorObj.message.split('email: ')[1] });
          } else if (errorText.includes('Email already in use')) {
            setErrors({ email: 'Email already in use' });
          } else if (errorText.includes('Phone already in use')) {
            setErrors({ phone: 'Phone already in use' });
          } else {
            setErrors({ general: errorObj.message || 'Registration failed' });
          }
        } catch {
          if (errorText.includes('Email already in use')) {
            setErrors({ email: 'Email already in use' });
          } else if (errorText.includes('Phone already in use')) {
            setErrors({ phone: 'Phone already in use' });
          } else {
            setErrors({ general: 'Registration failed. Please try again.' });
          }
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      setErrors({ general: `Network error: ${error.message}` });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone must be exactly 10 digits';
    }
    
    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else {
      const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        newErrors.password = 'Password must be at least 8 characters with letters, numbers, and symbols';
      }
    }
    
    // Confirm password validation
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Terms validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors
    if (validateForm()) {
      setIsLoading(true);
      await registerUser(formData);
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
              <p className="text-slate-400">Choose your account type and enter your details.</p>
              
              <div className="flex gap-4 mt-4 p-3 bg-input-gray/50 rounded-xl border border-white/5">
                <button 
                  type="button"
                  onClick={() => navigate('/register')}
                  className="flex-1 py-2 px-4 bg-primary text-black rounded-lg font-bold text-sm transition-all"
                >
                  Regular User
                </button>
                <button 
                  type="button"
                  onClick={() => navigate('/operator-register')}
                  className="flex-1 py-2 px-4 bg-white/10 text-white rounded-lg font-bold text-sm hover:bg-white/20 transition-all"
                >
                  Bus Operator
                </button>
              </div>
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
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3 pointer-events-none">person</span>
                    <input 
                      className={`w-full pl-12 pr-4 py-3 bg-input-gray border ${errors.firstName ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                      placeholder="First Name" 
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, firstName: e.target.value }));
                        if (errors.firstName) setErrors(prev => ({ ...prev, firstName: '' }));
                      }}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-red-400 text-xs mt-1 ml-1">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3 pointer-events-none">person</span>
                    <input 
                      className={`w-full pl-12 pr-4 py-3 bg-input-gray border ${errors.lastName ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                      placeholder="Last Name" 
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, lastName: e.target.value }));
                        if (errors.lastName) setErrors(prev => ({ ...prev, lastName: '' }));
                      }}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="text-red-400 text-xs mt-1 ml-1">{errors.lastName}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3 pointer-events-none">mail</span>
                  <input 
                    className={`w-full pl-12 pr-4 py-3 bg-input-gray border ${errors.email ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                    placeholder="name@company.com" 
                    type="email"
                    autoComplete="off"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, email: e.target.value }));
                      if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                    }}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1 ml-1">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3 pointer-events-none">call</span>
                  <input 
                    className={`w-full pl-12 pr-4 py-3 bg-input-gray border ${errors.phone ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                    placeholder="9765764530" 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, phone: e.target.value }));
                      if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                    }}
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-400 text-xs mt-1 ml-1">{errors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3 pointer-events-none">lock</span>
                  <input 
                    className={`w-full pl-12 pr-12 py-3 bg-input-gray border ${errors.password ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, password: e.target.value }));
                      if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
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
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1 ml-1">{errors.password}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 mt-3 pointer-events-none">lock</span>
                  <input 
                    className={`w-full pl-12 pr-4 py-3 bg-input-gray border ${errors.confirmPassword ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
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
              <div className="flex items-start gap-3 py-2">
                <div className="flex items-center h-5">
                  <input 
                    className="w-5 h-5 rounded border-white/10 bg-input-gray text-primary focus:ring-primary focus:ring-offset-deep-black transition-all cursor-pointer" 
                    id="terms" 
                    type="checkbox"
                    checked={formData.agreeToTerms}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, agreeToTerms: e.target.checked }));
                      if (errors.agreeToTerms) setErrors(prev => ({ ...prev, agreeToTerms: '' }));
                    }}
                  />
                </div>
                <label className="text-sm text-slate-400 leading-tight" htmlFor="terms">
                  I agree to the <a className="text-primary hover:underline font-medium" href="#">Terms and Conditions</a> and <a className="text-primary hover:underline font-medium" href="#">Privacy Policy</a>.
                </label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-red-400 text-xs mt-1 ml-1">{errors.agreeToTerms}</p>
              )}
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-black py-3 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,212,255,0.2)] transform hover:scale-[1.01] active:scale-[0.98]"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
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