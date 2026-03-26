import { useMediaQuery, useTheme } from '@mui/material';
import DesktopForgotPasswordForm from '../components/DesktopForgotPasswordForm';
import MobileForgotPasswordLayout from '../components/MobileForgotPasswordLayout';

const ForgotPassword = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return <MobileForgotPasswordLayout />;
  }

  return <DesktopForgotPasswordForm />;
};

export default ForgotPassword;
