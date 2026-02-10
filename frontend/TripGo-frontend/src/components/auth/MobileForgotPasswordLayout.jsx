const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  TextField, 
  Button, 
  Typography, 
  InputAdornment,
  ThemeProvider
} from '@mui/material';
import { 
  Email,
  ArrowBack,
  Key
} from '@mui/icons-material';
import TripGoIcon from '../../assets/icons/TripGoIcon';
import { darkTheme } from '../../theme/darkTheme';

const MobileForgotPasswordLayout = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const forgotPassword = async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `email=${email}`
      });

      if (response.ok) {
        setErrors({ success: 'Reset email sent! Check your inbox.' });
      } else {
        const errorText = await response.text();
        if (errorText.includes('User not found')) {
          setErrors({ email: 'No account found with this email address' });
        } else {
          setErrors({ general: errorText || 'Failed to send reset email. Please try again.' });
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    if (!email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }
    
    setIsLoading(true);
    await forgotPassword(email);
    setIsLoading(false);
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
                Travel with Peace of Mind.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3, pb: 5 }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Box sx={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: 64, 
                height: 64, 
                bgcolor: 'rgba(0, 212, 255, 0.1)', 
                borderRadius: 2, 
                mb: 3 
              }}>
                <Key sx={{ color: '#00d4ff', fontSize: 32 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>
                Forgot Password?
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                No worries, we'll send you reset instructions.
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

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                fullWidth
                required
                name="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                error={!!errors.email}
                helperText={errors.email}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: '#64748b' }} />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />

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
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </Box>

            <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
              <Button
                onClick={() => navigate('/login')}
                sx={{
                  color: '#94a3b8',
                  fontWeight: 700,
                  '&:hover': {
                    color: 'white',
                    bgcolor: 'transparent'
                  },
                }}
                startIcon={<ArrowBack />}
              >
                Back to Log In
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default MobileForgotPasswordLayout;