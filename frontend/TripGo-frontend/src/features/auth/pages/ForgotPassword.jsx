import { useState, useEffect } from 'react';
import DesktopForgotPasswordForm from '../components/DesktopForgotPasswordForm';
import MobileForgotPasswordLayout from '../components/MobileForgotPasswordLayout';

const ForgotPassword = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile ? <MobileForgotPasswordLayout /> : <DesktopForgotPasswordForm />;
};

export default ForgotPassword;
