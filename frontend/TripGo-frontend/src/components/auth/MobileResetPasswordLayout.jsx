const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Box, 
  Container, 
  TextField, 
  Button, 
  Typography, 
  InputAdornment, 
  IconButton,
  ThemeProvider
} from '@mui/material';
import { 
  Lock, 
  Visibility, 
  VisibilityOff 
} from '@mui/icons-material';
import TripGoIcon from '../../assets/icons/TripGoIcon';
import { darkTheme } from '../../theme/darkTheme';

const MobileResetPasswordLayout = () => {
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
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
                <Box sx={{ color: '#00d4ff' }}>
                  <TripGoIcon style={{ width: 32, height: 32 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'white' }}>
                  TripGo
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'white' }}>
                Secure Your Account
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3, pb: 5 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>
                Reset Password
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Enter your new password below.
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
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="New Password"
                value={formData.newPassword}
                onChange={handleInputChange}
                error={!!errors.newPassword}
                helperText={errors.newPassword}
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
                placeholder="Confirm Password"
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

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading || !token}
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
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </Box>

            <Typography variant="caption" sx={{ textAlign: 'center', mt: 4, color: '#64748b', display: 'block' }}>
              Remember your password?{' '}
              <span 
                style={{ color: '#00d4ff', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => navigate('/login')}
              >
                Sign In
              </span>
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default MobileResetPasswordLayout;