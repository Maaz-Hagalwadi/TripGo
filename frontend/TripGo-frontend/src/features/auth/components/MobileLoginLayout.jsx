import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Divider,
  ThemeProvider
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import TripGoIcon from '../../../assets/icons/TripGoIcon';
import { darkTheme } from '../../../shared/utils/darkTheme';

import { API_BASE_URL } from '../../../config/env';

const MobileLoginLayout = () => {
  const navigate = useNavigate();
  const { login, sendLoginOtp, loginWithOtp, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState('password');
  const [otpSent, setOtpSent] = useState(false);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: '',
    otp: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    if (loginSuccess && user?.role) {
      const timer = setTimeout(() => {
        if (user.role === 'OPERATOR') {
          navigate('/operator/dashboard');
        } else if (user.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (user.role === 'USER') {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, loginSuccess, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const switchMode = (mode) => {
    setLoginMode(mode);
    setOtpSent(false);
    setErrors({});
    setFormData(prev => ({ ...prev, password: '', otp: '' }));
  };

  const handleSendOtp = async () => {
    setErrors({});
    if (!formData.emailOrPhone.trim()) {
      setErrors({ emailOrPhone: 'Email or phone is required' });
      return;
    }
    setIsOtpSending(true);
    try {
      const result = await sendLoginOtp({ emailOrPhone: formData.emailOrPhone.trim() });
      if (result.success) {
        setOtpSent(true);
        toast.success('OTP sent. Check your email.');
      } else {
        toast.error(result.error || 'Failed to send OTP');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsOtpSending(false);
    }
  };

  const handleResult = (result) => {
    if (result.success) {
      toast.success('Login successful!');
      setLoginSuccess(true);
    } else {
      if (result.error?.toLowerCase().includes('suspend')) {
        setSuspended(true);
      } else {
        toast.error(result.error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!formData.emailOrPhone.trim()) {
      setErrors({ emailOrPhone: 'Email or phone is required' });
      return;
    }

    setIsLoading(true);
    try {
      if (loginMode === 'otp') {
        if (!formData.otp.trim()) {
          setErrors({ otp: 'OTP is required' });
          setIsLoading(false);
          return;
        }
        const result = await loginWithOtp({
          emailOrPhone: formData.emailOrPhone.trim(),
          otp: formData.otp.trim()
        });
        handleResult(result);
      } else {
        if (!formData.password.trim()) {
          setErrors({ password: 'Password is required' });
          setIsLoading(false);
          return;
        }
        const result = await login({
          emailOrPhone: formData.emailOrPhone,
          password: formData.password
        });
        handleResult(result);
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClickShowPassword = () => setShowPassword(!showPassword);

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#050505',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Box sx={{
          position: 'fixed',
          top: '20%',
          right: '-10%',
          width: '60%',
          height: '40%',
          background: 'radial-gradient(circle at center, rgba(11, 31, 58, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0
        }} />
        <Box sx={{
          position: 'fixed',
          bottom: '10%',
          left: '-10%',
          width: '60%',
          height: '40%',
          background: 'radial-gradient(circle at center, rgba(11, 31, 58, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, p: 0 }}>
          <Box sx={{
            height: '30vh',
            minHeight: '240px',
            backgroundImage: "linear-gradient(to bottom, rgba(5, 5, 5, 0.3), rgba(5, 5, 5, 1)), url('https://lh3.googleusercontent.com/aida-public/AB6AXuBaWdLvirFLq9gQIzc79yRfhZecULRAzSPQ-Eev3IdORsc2x4lKQEngg0b6iKpxyeUMQ3F3ndbAaochZqTN2xApDbxj_p_cT4_9gOtcKGLnxNMztUuDqUAxUgkV3wbpWpD8twOaCcLb8D_afIznu8gxsBjvhKgjQjMYKn5mpo-cqf4sRm8EXrrYZ9PM2LGiIp1wpostxaih0VJ2ZAvymjAewnAa1CusAzdfLA84hhKCwvxAteOK4ie_JUSDj4zUqp_62VUoc0FM7qvk')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'flex-end',
            p: 4
          }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ color: '#0B1F3A', cursor: 'pointer' }} onClick={() => navigate('/')}>
                  <TripGoIcon style={{ width: 32, height: 32 }} />
                </Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 800, 
                    color: 'white', 
                    cursor: 'pointer',
                    '&:hover': { color: '#0B1F3A' },
                    transition: 'color 0.2s'
                  }}
                  onClick={() => navigate('/')}
                >
                  TripGo
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'white' }}>
                Travel Redefined.{' '}
                <span style={{ color: '#0B1F3A' }}>Experience Luxury.</span>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3, pb: 5 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>
                Welcome Back
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Please enter your details to access your account.
              </Typography>
            </Box>

            {suspended && (
              <Box sx={{ p: 2, mb: 3, bgcolor: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <span className="material-symbols-outlined" style={{ color: '#fb923c', fontSize: 20, marginTop: 2 }}>block</span>
                <Typography variant="caption" sx={{ color: '#fdba74', lineHeight: 1.6 }}>
                  Your operator account has been suspended. Please contact our support team at{' '}
                  <a href="mailto:support@tripgo.com" style={{ color: '#0B1F3A', fontWeight: 700 }}>support@tripgo.com</a>
                </Typography>
              </Box>
            )}

            {/* Mode toggle */}
            <Box sx={{ display: 'flex', p: '4px', bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2, mb: 3, gap: '4px' }}>
              {[['password', 'Password'], ['otp', 'Login with OTP']].map(([mode, label]) => (
                <Button
                  key={mode}
                  size="small"
                  onClick={() => switchMode(mode)}
                  sx={{
                    flex: 1, py: 1, fontWeight: 700, fontSize: '0.75rem',
                    borderRadius: 1.5, textTransform: 'none',
                    bgcolor: loginMode === mode ? '#0B1F3A' : 'transparent',
                    color: loginMode === mode ? 'white' : '#64748b',
                    boxShadow: loginMode === mode ? '0 2px 8px rgba(11,31,58,0.3)' : 'none',
                    '&:hover': { bgcolor: loginMode === mode ? '#102A4C' : 'rgba(255,255,255,0.06)' },
                  }}
                >
                  {label}
                </Button>
              ))}
            </Box>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

              {/* ── PASSWORD MODE ── */}
              {loginMode === 'password' && (
                <>
                  <TextField
                    fullWidth name="emailOrPhone" type="text"
                    placeholder="Email or phone number"
                    value={formData.emailOrPhone} onChange={handleInputChange}
                    error={!!errors.emailOrPhone} helperText={errors.emailOrPhone}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: '#64748b' }} /></InputAdornment> }}
                    size="small"
                  />
                  <TextField
                    fullWidth name="password" type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password} onChange={handleInputChange}
                    error={!!errors.password} helperText={errors.password}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Lock sx={{ color: '#64748b' }} /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={handleClickShowPassword} edge="end" sx={{ color: '#64748b' }}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    size="small"
                  />
                  <Box sx={{ textAlign: 'right', mt: -1 }}>
                    <Typography variant="caption" sx={{ color: '#0B1F3A', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate('/forgot-password')}>
                      Forgot Password?
                    </Typography>
                  </Box>
                  <Button type="submit" fullWidth variant="contained" disabled={isLoading}
                    sx={{ bgcolor: '#0B1F3A', color: 'white', py: 1.5, fontWeight: 800, fontSize: '1rem', borderRadius: 2, textTransform: 'none', boxShadow: '0 4px 20px rgba(11,31,58,0.25)', '&:hover': { bgcolor: '#102A4C' }, '&:disabled': { bgcolor: 'rgba(11,31,58,0.5)', color: 'white' } }}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </>
              )}

              {/* ── OTP MODE — STEP 1: enter email/phone + Send OTP ── */}
              {loginMode === 'otp' && !otpSent && (
                <>
                  <TextField
                    fullWidth name="emailOrPhone" type="text"
                    placeholder="Email or phone number"
                    value={formData.emailOrPhone} onChange={handleInputChange}
                    error={!!errors.emailOrPhone} helperText={errors.emailOrPhone}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: '#64748b' }} /></InputAdornment> }}
                    size="small"
                  />
                  <Button fullWidth variant="contained" disabled={isOtpSending} onClick={handleSendOtp}
                    sx={{ bgcolor: '#0B1F3A', color: 'white', py: 1.5, fontWeight: 800, fontSize: '1rem', borderRadius: 2, textTransform: 'none', boxShadow: '0 4px 20px rgba(11,31,58,0.25)', '&:hover': { bgcolor: '#102A4C' }, '&:disabled': { bgcolor: 'rgba(11,31,58,0.5)', color: 'white' } }}
                  >
                    {isOtpSending ? 'Sending OTP...' : 'Send OTP'}
                  </Button>
                </>
              )}

              {/* ── OTP MODE — STEP 2: locked email + OTP input ── */}
              {loginMode === 'otp' && otpSent && (
                <>
                  {/* Locked identifier row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Email sx={{ color: '#64748b', fontSize: 18, flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formData.emailOrPhone}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ color: '#0B1F3A', fontWeight: 700, cursor: 'pointer', flexShrink: 0, ml: 1 }}
                      onClick={() => { setOtpSent(false); setFormData(p => ({ ...p, otp: '' })); }}
                    >
                      Change
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1 }}>
                      We sent a 6-digit code to your registered email.
                    </Typography>
                    <TextField
                      fullWidth name="otp" type="text" inputMode="numeric"
                      placeholder="Enter 6-digit OTP"
                      value={formData.otp} onChange={handleInputChange}
                      error={!!errors.otp} helperText={errors.otp}
                      inputProps={{ maxLength: 6 }}
                      autoFocus
                      size="small"
                    />
                  </Box>

                  <Button type="submit" fullWidth variant="contained" disabled={isLoading}
                    sx={{ bgcolor: '#0B1F3A', color: 'white', py: 1.5, fontWeight: 800, fontSize: '1rem', borderRadius: 2, textTransform: 'none', boxShadow: '0 4px 20px rgba(11,31,58,0.25)', '&:hover': { bgcolor: '#102A4C' }, '&:disabled': { bgcolor: 'rgba(11,31,58,0.5)', color: 'white' } }}
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                  </Button>

                  <Typography variant="caption" sx={{ textAlign: 'center', color: '#64748b' }}>
                    Didn't receive it?{' '}
                    <span
                      style={{ color: '#0B1F3A', fontWeight: 700, cursor: 'pointer' }}
                      onClick={handleSendOtp}
                    >
                      {isOtpSending ? 'Sending...' : 'Resend OTP'}
                    </span>
                  </Typography>
                </>
              )}

            </Box>

            <Box sx={{ my: 4, position: 'relative' }}>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  bgcolor: '#050505',
                  px: 2,
                  color: '#64748b',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase'
                }}
              >
                Or
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => window.location.href = `${API_BASE_URL}/oauth2/authorization/google`}
              sx={{
                py: 1.5,
                bgcolor: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.05)',
                color: '#e2e8f0',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.1)',
                },
              }}
              startIcon={
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              }
            >
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Sign in with Google</Typography>
            </Button>

            <Typography variant="caption" sx={{ textAlign: 'center', mt: 5, color: '#64748b', display: 'block' }}>
              Don't have an account?{' '}
              <span 
                style={{ color: '#0B1F3A', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => navigate('/register')}
              >
                Sign Up
              </span>
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default MobileLoginLayout;