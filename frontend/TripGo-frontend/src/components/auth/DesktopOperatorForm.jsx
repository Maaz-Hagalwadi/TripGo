const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TripGoIcon from '../../assets/icons/TripGoIcon';

const DesktopOperatorForm = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    operatorName: '',
    shortName: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    agreeToTerms: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const registerOperator = async (formData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/operators/register`, {
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
          address: formData.address
        })
      });

      if (response.ok) {
        setErrors({ success: 'Operator registration successful! Awaiting admin approval.' });
        setTimeout(() => navigate('/login'), 3000);
      } else {
        const errorText = await response.text();
        try {
          const errorObj = JSON.parse(errorText);
          if (errorObj.message && errorObj.message.includes('email:')) {
            setErrors({ email: errorObj.message.split('email: ')[1] });
          } else if (errorObj.message && errorObj.message.includes('phone:')) {
            setErrors({ phone: 'Phone must be exactly 10 digits' });
          } else if (errorText.includes('Email already in use')) {
            setErrors({ email: 'Email already in use' });
          } else if (errorText.includes('Phone already in use')) {
            setErrors({ phone: 'Phone already in use' });
          } else {
            setErrors({ general: errorObj.message || 'Registration failed' });
          }
        } catch {
          setErrors({ general: 'Registration failed. Please try again.' });
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone must be exactly 10 digits';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else {
      const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        newErrors.password = 'Password must be at least 8 characters with letters, numbers, and symbols';
      }
    }
    
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.operatorName.trim()) newErrors.operatorName = 'Company name is required';
    if (!formData.shortName.trim()) newErrors.shortName = 'Short name is required';
    if (!formData.contactPhone.trim()) {
      newErrors.contactPhone = 'Contact phone is required';
    } else if (!/^\d{10}$/.test(formData.contactPhone.replace(/\D/g, ''))) {
      newErrors.contactPhone = 'Contact phone must be exactly 10 digits';
    }
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid contact email';
    }
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (validateForm()) {
      setIsLoading(true);
      await registerOperator(formData);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-deep-black text-slate-100 min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] glow-accent blur-3xl"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] glow-accent blur-3xl"></div>
      </div>
      <div className="max-w-7xl w-full bg-charcoal/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-row min-h-[900px]">
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
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight">Partner With TripGo.</h2>
            <p className="text-slate-300 text-lg max-w-md">Join our network of premium bus operators and expand your business reach.</p>
            <div className="pt-8 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined !text-xl">business</span>
                </div>
                <span className="text-slate-200 font-medium">Business Growth</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined !text-xl">analytics</span>
                </div>
                <span className="text-slate-200 font-medium">Advanced Analytics</span>
              </div>
            </div>
          </div>
        </div>
        <div className="w-1/2 p-8 md:p-12 flex flex-col justify-center bg-deep-black/60 overflow-y-auto">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-extrabold text-white mb-3">Operator Registration</h1>
              <p className="text-slate-400">Register your bus company with TripGo.</p>
              
              <div className="flex gap-4 mt-4 p-3 bg-input-gray/50 rounded-xl border border-white/5">
                <button 
                  type="button"
                  onClick={() => navigate('/register')}
                  className="flex-1 py-2 px-4 bg-white/10 text-white rounded-lg font-bold text-sm hover:bg-white/20 transition-all"
                >
                  Regular User
                </button>
                <button 
                  type="button"
                  onClick={() => navigate('/operator-register')}
                  className="flex-1 py-2 px-4 bg-primary text-black rounded-lg font-bold text-sm transition-all"
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
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white mb-3">Personal Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                    <input 
                      className={`w-full px-4 py-3 bg-input-gray border ${errors.firstName ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                      placeholder="First Name" 
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, firstName: e.target.value }));
                        if (errors.firstName) setErrors(prev => ({ ...prev, firstName: '' }));
                      }}
                    />
                    {errors.firstName && <p className="text-red-400 text-xs mt-1 ml-1">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                    <input 
                      className={`w-full px-4 py-3 bg-input-gray border ${errors.lastName ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                      placeholder="Last Name" 
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, lastName: e.target.value }));
                        if (errors.lastName) setErrors(prev => ({ ...prev, lastName: '' }));
                      }}
                    />
                    {errors.lastName && <p className="text-red-400 text-xs mt-1 ml-1">{errors.lastName}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <input 
                      className={`w-full px-4 py-3 bg-input-gray border ${errors.email ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                      placeholder="name@company.com" 
                      type="email"
                      autoComplete="off"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, email: e.target.value }));
                        if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                      }}
                    />
                    {errors.email && <p className="text-red-400 text-xs mt-1 ml-1">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                    <input 
                      className={`w-full px-4 py-3 bg-input-gray border ${errors.phone ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                      placeholder="9765764530" 
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, phone: e.target.value }));
                        if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                      }}
                    />
                    {errors.phone && <p className="text-red-400 text-xs mt-1 ml-1">{errors.phone}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative">
                      <input 
                        className={`w-full px-4 py-3 pr-12 bg-input-gray border ${errors.password ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
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
                    {errors.password && <p className="text-red-400 text-xs mt-1 ml-1">{errors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                    <input 
                      className={`w-full px-4 py-3 bg-input-gray border ${errors.confirmPassword ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                      placeholder="••••••••" 
                      type="password"
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
                        if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                      }}
                    />
                    {errors.confirmPassword && <p className="text-red-400 text-xs mt-1 ml-1">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-bold text-white mb-3">Company Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                    <input 
                      className={`w-full px-4 py-3 bg-input-gray border ${errors.operatorName ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                      placeholder="City Bus Lines" 
                      type="text"
                      value={formData.operatorName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, operatorName: e.target.value }));
                        if (errors.operatorName) setErrors(prev => ({ ...prev, operatorName: '' }));
                      }}
                    />
                    {errors.operatorName && <p className="text-red-400 text-xs mt-1 ml-1">{errors.operatorName}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Short Name</label>
                    <input 
                      className={`w-full px-4 py-3 bg-input-gray border ${errors.shortName ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                      placeholder="CBL" 
                      type="text"
                      value={formData.shortName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, shortName: e.target.value }));
                        if (errors.shortName) setErrors(prev => ({ ...prev, shortName: '' }));
                      }}
                    />
                    {errors.shortName && <p className="text-red-400 text-xs mt-1 ml-1">{errors.shortName}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
                    <input 
                      className={`w-full px-4 py-3 bg-input-gray border ${errors.contactPhone ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                      placeholder="9876543210" 
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, contactPhone: e.target.value }));
                        if (errors.contactPhone) setErrors(prev => ({ ...prev, contactPhone: '' }));
                      }}
                    />
                    {errors.contactPhone && <p className="text-red-400 text-xs mt-1 ml-1">{errors.contactPhone}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Email</label>
                    <input 
                      className={`w-full px-4 py-3 bg-input-gray border ${errors.contactEmail ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none`} 
                      placeholder="contact@company.com" 
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, contactEmail: e.target.value }));
                        if (errors.contactEmail) setErrors(prev => ({ ...prev, contactEmail: '' }));
                      }}
                    />
                    {errors.contactEmail && <p className="text-red-400 text-xs mt-1 ml-1">{errors.contactEmail}</p>}
                  </div>
                </div>
                <div className="space-y-2 mt-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Address</label>
                  <textarea 
                    className={`w-full px-4 py-3 bg-input-gray border ${errors.address ? 'border-red-500' : 'border-white/5'} rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none resize-none`} 
                    placeholder="123 Main St, City, State" 
                    rows="2"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, address: e.target.value }));
                      if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
                    }}
                  />
                  {errors.address && <p className="text-red-400 text-xs mt-1 ml-1">{errors.address}</p>}
                </div>
              </div>

              <div className="flex items-start gap-3 py-2">
                <input 
                  className="w-5 h-5 rounded border-white/10 bg-input-gray text-primary focus:ring-primary focus:ring-offset-deep-black transition-all cursor-pointer mt-1" 
                  id="terms" 
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, agreeToTerms: e.target.checked }));
                    if (errors.agreeToTerms) setErrors(prev => ({ ...prev, agreeToTerms: '' }));
                  }}
                />
                <label className="text-sm text-slate-400 leading-tight" htmlFor="terms">
                  I agree to the <a className="text-primary hover:underline font-medium" href="#">Terms and Conditions</a> and <a className="text-primary hover:underline font-medium" href="#">Privacy Policy</a>.
                </label>
              </div>
              {errors.agreeToTerms && <p className="text-red-400 text-xs mt-1 ml-1">{errors.agreeToTerms}</p>}
              
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-black py-3 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,212,255,0.2)] transform hover:scale-[1.01] active:scale-[0.98] mt-4"
              >
                {isLoading ? 'Registering...' : 'Register as Operator'}
              </button>
            </form>
            
            <p className="text-center mt-6 text-slate-400">
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

export default DesktopOperatorForm;