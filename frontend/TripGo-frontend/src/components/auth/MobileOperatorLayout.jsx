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
  ThemeProvider
} from '@mui/material';
import { 
  Person, 
  Email, 
  Phone, 
  Lock, 
  Visibility, 
  VisibilityOff,
  Business,
  LocationOn
} from '@mui/icons-material';
import TripGoIcon from '../../assets/icons/TripGoIcon';
import { darkTheme } from '../../theme/darkTheme';

const MobileOperatorLayout = () => {
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
      const response = await fetch('http://localhost:8080/operators/register', {
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsLoading(true);
      await registerOperator(formData);
      setIsLoading(false);
    }
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

        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, p: 0 }}>
          <Box sx={{
            height: '25vh',
            minHeight: '200px',
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
                Partner With TripGo
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3, pb: 5 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>
                Operator Registration
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                Register your bus company with TripGo.
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
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    borderRadius: 1.5,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                  }}
                >
                  Regular User
                </Button>
                <Button 
                  onClick={() => navigate('/operator-register')}
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
              <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700, mt: 2 }}>
                Personal Information
              </Typography>
              
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

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  required
                  name="email"
                  type="email"
                  placeholder="name@company.com"
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
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
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
              </Box>

              <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700, mt: 2 }}>
                Company Information
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  required
                  name="operatorName"
                  placeholder="City Bus Lines"
                  value={formData.operatorName}
                  onChange={handleInputChange}
                  error={!!errors.operatorName}
                  helperText={errors.operatorName}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Business sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />
                <TextField
                  fullWidth
                  required
                  name="shortName"
                  placeholder="CBL"
                  value={formData.shortName}
                  onChange={handleInputChange}
                  error={!!errors.shortName}
                  helperText={errors.shortName}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Business sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  required
                  name="contactPhone"
                  type="tel"
                  placeholder="9876543210"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  error={!!errors.contactPhone}
                  helperText={errors.contactPhone}
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
                  name="contactEmail"
                  type="email"
                  placeholder="contact@company.com"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  error={!!errors.contactEmail}
                  helperText={errors.contactEmail}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />
              </Box>

              <TextField
                fullWidth
                required
                name="address"
                placeholder="123 Main St, City, State"
                multiline
                rows={2}
                value={formData.address}
                onChange={handleInputChange}
                error={!!errors.address}
                helperText={errors.address}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                      <LocationOn sx={{ color: '#64748b' }} />
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
                {isLoading ? 'Registering...' : 'Register as Operator'}
              </Button>
            </Box>

            <Typography variant="caption" sx={{ textAlign: 'center', mt: 4, color: '#64748b', display: 'block' }}>
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

export default MobileOperatorLayout;