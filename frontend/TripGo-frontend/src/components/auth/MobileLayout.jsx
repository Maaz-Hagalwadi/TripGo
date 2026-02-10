const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${API_BASE_URL}';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  TextField, 
  Button, 
  Typography, 
  Checkbox, 
  FormControlLabel, 
  InputAdornment, 
  IconButton,
  Divider,
  ThemeProvider
} from '@mui/material';
import { 
  Person, 
  Email, 
  Phone, 
  Lock, 
  Visibility, 
  VisibilityOff 
} from '@mui/icons-material';
import TripGoIcon from '../../assets/icons/TripGoIcon';
import { darkTheme } from '../../theme/darkTheme';

const MobileLayout = () => {
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
      
      const response = await fetch(`${API_BASE_URL}/auth/register', {
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsLoading(true);
      await registerUser(formData);
      setIsLoading(false);
    }
    return false;
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
                Start Your Premium Journey Today
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3, pb: 5 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>
                Create Account
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                Choose your account type and enter your details.
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                gap: 1, 
                p: 1, 
                bgcolor: 'rgba(255,255,255,0.05)', 
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <Button 
                  onClick={() => navigate('/register')}
                  sx={{
                    flex: 1,
                    py: 1,
                    bgcolor: '#00d4ff',
                    color: 'black',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    borderRadius: 1.5,
                    '&:hover': { bgcolor: '#00b8e6' }
                  }}
                >
                  Regular User
                </Button>
                <Button 
                  onClick={() => navigate('/operator-register')}
                  sx={{
                    flex: 1,
                    py: 1,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    borderRadius: 1.5,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                  }}
                >
                  Bus Operator
                </Button>
              </Box>
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
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  required
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />
                <TextField
                  fullWidth
                  required
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />
              </Box>

              <TextField
                fullWidth
                required
                name="email"
                type="email"
                placeholder="name@email.com"
                value={formData.email}
                onChange={handleInputChange}
                error={!!errors.email}
                helperText={errors.email}
                inputProps={{ autoComplete: 'off' }}
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
                name="phone"
                type="tel"
                placeholder="9875934033"
                value={formData.phone}
                onChange={handleInputChange}
                error={!!errors.phone}
                helperText={errors.phone}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone sx={{ color: '#64748b' }} />
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
                inputProps={{ autoComplete: 'new-password' }}
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

              <TextField
                fullWidth
                required
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                inputProps={{ autoComplete: 'new-password' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#64748b' }} />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />

              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      required
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={handleInputChange}
                      sx={{ color: '#64748b', '&.Mui-checked': { color: '#00d4ff' } }}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      I agree to the <span style={{ color: '#00d4ff', fontWeight: 600 }}>Terms</span> and{' '}
                      <span style={{ color: '#00d4ff', fontWeight: 600 }}>Privacy Policy</span>.
                    </Typography>
                  }
                />
                {errors.agreeToTerms && (
                  <Typography variant="caption" sx={{ color: '#f44336', display: 'block', mt: 0.5, ml: 4 }}>
                    {errors.agreeToTerms}
                  </Typography>
                )}
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
                {isLoading ? 'Creating Account...' : 'Create Account'}
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
              Already have an account?{' '}
              <span 
                style={{ color: '#00d4ff', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => navigate('/login')}
              >
                Log In
              </span>
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default MobileLayout;