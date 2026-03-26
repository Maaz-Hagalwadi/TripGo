import { useMediaQuery, useTheme } from '@mui/material';
import DesktopForm from '../components/DesktopForm';
import MobileLayout from '../components/MobileLayout';

const Register = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return <MobileLayout />;
  }

  return <DesktopForm />;
};

export default Register;
