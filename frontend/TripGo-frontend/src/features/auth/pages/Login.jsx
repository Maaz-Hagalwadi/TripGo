import { useMediaQuery, useTheme } from '@mui/material';
import DesktopLoginForm from '../components/DesktopLoginForm';
import MobileLoginLayout from '../components/MobileLoginLayout';

const Login = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return <MobileLoginLayout />;
  }

  return <DesktopLoginForm />;
};

export default Login;
