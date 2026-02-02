import { useMediaQuery, useTheme } from '@mui/material';
import DesktopForm from '../components/auth/DesktopForm';
import MobileLayout from '../components/auth/MobileLayout';

const Register = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return <MobileLayout />;
  }

  return <DesktopForm />;
};

export default Register;