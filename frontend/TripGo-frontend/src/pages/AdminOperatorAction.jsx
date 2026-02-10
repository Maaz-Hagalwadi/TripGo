import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Container, Typography, CircularProgress } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import TripGoIcon from '../assets/icons/TripGoIcon';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const AdminOperatorAction = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const processAction = async () => {
      // Handle both parameter formats
      const action = searchParams.get('action') || searchParams.get('status');
      const operatorId = searchParams.get('operatorId') || searchParams.get('operator');

      if (!action || !operatorId) {
        setStatus('error');
        setMessage('Invalid request parameters');
        return;
      }

      // If status is already processed (approved/rejected), just show success
      if (action === 'approved' || action === 'rejected') {
        setStatus('success');
        setMessage(`Operator ${action} successfully!`);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/admin/operator/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operatorId })
        });

        if (response.ok) {
          setStatus('success');
          setMessage(action === 'approve' ? 'Operator approved successfully!' : 'Operator rejected successfully!');
        } else {
          setStatus('error');
          setMessage('Failed to process request');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Network error occurred');
      }
    };

    processAction();
  }, [searchParams]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <TripGoIcon style={{ width: 48, height: 48, color: '#00d4ff' }} />
          </Box>
          
          {status === 'loading' && (
            <>
              <CircularProgress sx={{ color: '#00d4ff', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                Processing Request...
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle sx={{ fontSize: 64, color: '#4caf50', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                Success!
              </Typography>
              <Typography variant="body1" sx={{ color: '#94a3b8' }}>
                {message}
              </Typography>
            </>
          )}

          {status === 'error' && (
            <>
              <Cancel sx={{ fontSize: 64, color: '#f44336', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                Error
              </Typography>
              <Typography variant="body1" sx={{ color: '#94a3b8' }}>
                {message}
              </Typography>
            </>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default AdminOperatorAction;