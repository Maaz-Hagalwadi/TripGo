import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, Container } from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';
import TripGoIcon from '../assets/icons/TripGoIcon';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    const token = searchParams.get('token');
    console.log('Status from URL:', urlStatus);
    console.log('Token from URL:', token);
    
    if (urlStatus) {
      // Backend already processed verification and redirected with status
      setTimeout(() => {
        setLoading(false);
        setStatus(urlStatus);
      }, 1000);
    } else if (token) {
      // Direct token verification (fallback)
      console.log('Calling verification endpoint...');
      fetch(`${API_BASE_URL}/auth/verify-email?token=${token}`)
        .then(response => {
          console.log('Response status:', response.status);
          if (response.ok) {
            setStatus('success');
          } else {
            setStatus('error');
          }
        })
        .catch((error) => {
          console.error('Verification error:', error);
          setStatus('error');
        })
        .finally(() => {
          setTimeout(() => setLoading(false), 1000);
        });
    } else {
      console.log('No status or token found in URL');
      setStatus('error');
      setTimeout(() => setLoading(false), 1000);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#050505',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <Box sx={{
          position: 'fixed',
          top: '20%',
          right: '-10%',
          width: '60%',
          height: '40%',
          background: 'radial-gradient(circle at center, rgba(0, 212, 255, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }} />
        
        <Container maxWidth="sm">
          <Box sx={{ 
            textAlign: 'center',
            bgcolor: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            p: 6
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
              <Box sx={{ color: '#00d4ff' }}>
                <TripGoIcon style={{ width: 32, height: 32 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'white' }}>
                TripGo
              </Typography>
            </Box>
            
            <CircularProgress sx={{ color: '#00d4ff', mb: 3 }} size={60} />
            <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
              Verifying your email...
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Please wait while we confirm your account
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#050505',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      <Box sx={{
        position: 'fixed',
        top: '20%',
        right: '-10%',
        width: '60%',
        height: '40%',
        background: 'radial-gradient(circle at center, rgba(0, 212, 255, 0.12) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />
      
      <Container maxWidth="sm">
        <Box sx={{ 
          textAlign: 'center',
          bgcolor: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4,
          p: 6
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 4 }}>
            <Box sx={{ color: '#00d4ff' }}>
              <TripGoIcon style={{ width: 32, height: 32 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'white' }}>
              TripGo
            </Typography>
          </Box>
          
          {status === 'success' ? (
            <>
              <CheckCircle sx={{ color: '#4caf50', fontSize: 80, mb: 3 }} />
              <Typography variant="h4" sx={{ color: 'white', mb: 2, fontWeight: 700 }}>
                Email Verified!
              </Typography>
              <Typography variant="body1" sx={{ color: '#94a3b8', mb: 4 }}>
                Your account is now active. You can start using TripGo.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                sx={{
                  bgcolor: '#00d4ff',
                  color: 'black',
                  py: 1.5,
                  px: 4,
                  fontWeight: 800,
                  fontSize: '1rem',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(0,212,255,0.25)',
                  '&:hover': {
                    bgcolor: '#00b8e6',
                  }
                }}
              >
                Go to Login
              </Button>
            </>
          ) : (
            <>
              <Error sx={{ color: '#f44336', fontSize: 80, mb: 3 }} />
              <Typography variant="h4" sx={{ color: 'white', mb: 2, fontWeight: 700 }}>
                Verification Failed
              </Typography>
              <Typography variant="body1" sx={{ color: '#94a3b8', mb: 4 }}>
                The verification link is invalid or has expired. Please try registering again.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate('/register')}
                sx={{
                  borderColor: '#00d4ff',
                  color: '#00d4ff',
                  py: 1.5,
                  px: 4,
                  fontWeight: 800,
                  fontSize: '1rem',
                  borderRadius: 3,
                  '&:hover': {
                    borderColor: '#00b8e6',
                    color: '#00b8e6',
                    bgcolor: 'rgba(0,212,255,0.1)'
                  }
                }}
              >
                Register Again
              </Button>
            </>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default VerifyEmail;