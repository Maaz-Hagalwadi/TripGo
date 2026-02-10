import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
import TripGoIcon from '../../assets/icons/TripGoIcon';
import { darkTheme } from '../../theme/darkTheme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const MobileLoginLayout = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    if (loginSuccess && user?.role) {
      const timer = setTimeout(() => {
        if (user.role === 'OPERATOR') {
          navigate('/operator/dashboard');
        } else if (user.role === 'USER') {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, loginSuccess, navigate]);

  const loginUser = async (formData) => {
    try {
      const result = await login({
        emailOrPhone: formData.emailOrPhone,
        password: formData.password
      });

      if (result.success) {
        setErrors({ success: 'Login successful! Redirecting...' });
        setLoginSuccess(true);
      } else {
        setErrors({ general: result.error });
      }
    } catch (error) {
      console.error('Network error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

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
          background: 'radial-gradient(circle at center, rgba(0, 212, 255, 0.12) 0%, transparent 70%)',
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
          background: 'radial-gradient(circle at center, rgba(0, 212, 255, 0.12) 0%, transparent 70%)',
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
                <Box sx={{ color: '#00d4ff', cursor: 'pointer' }} onClick={() => navigate('/')}>
                  <TripGoIcon style={{ width: 32, height: 32 }} />
                </Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 800, 
                    color: 'white', 
                    cursor: 'pointer',
                    '&:hover': { color: '#00d4ff' },
                    transition: 'color 0.2s'
                  }}
                  onClick={() => navigate('/')}
                >
                  TripGo
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'white' }}>
                Travel Redefined.{' '}
                <span style={{ color: '#00d4ff' }}>Experience Luxury.</span>
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

            {errors.success && (
              <Box sx={{ 
                p: 2, 
                mb: 2, 
                bgcolor: 'rgba(76, 175, 80, 0.1)', 
                border: '1px solid rgba(76, 175, 80, 0.3)', 
                borderRadius: 2,
                color: '#4caf50'
              }}>
                <Typography variant="body2">{errors.success}</Typography>
              </Box>
            )}
            
            {errors.general && (
              <Box sx={{ 
                p: 2, 
                mb: 2, 
                bgcolor: 'rgba(244, 67, 54, 0.1)', 
                border: '1px solid rgba(244, 67, 54, 0.3)', 
                borderRadius: 2,
                color: '#f44336'
              }}>
                <Typography variant="body2">{errors.general}</Typography>
              </Box>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                required
                name="emailOrPhone"
                type="text"
                placeholder="name@company.com or phone"
                value={formData.emailOrPhone}
                onChange={handleInputChange}
                error={!!errors.emailOrPhone}
                helperText={errors.emailOrPhone}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: '#64748b' }} />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />

              <TextField
                fullWidth
                required
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                error={!!errors.password}
                helperText={errors.password}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#64748b' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleClickShowPassword}
                        edge="end"
                        sx={{ color: '#64748b' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                size="small"
              />

              <Box sx={{ textAlign: 'right', mb: 1 }}>
                <Typography 
                  variant="caption" 
                  sx={{ color: '#00d4ff', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot Password?
                </Typography>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                sx={{
                  bgcolor: '#00d4ff',
                  color: 'black',
                  py: 1.5,
                  fontWeight: 800,
                  fontSize: '1rem',
                  boxShadow: '0 4px 20px rgba(0,212,255,0.25)',
                  '&:hover': {
                    bgcolor: '#00b8e6',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(0,212,255,0.5)',
                    color: 'black'
                  }
                }}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
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
                style={{ color: '#00d4ff', fontWeight: 700, cursor: 'pointer' }}
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