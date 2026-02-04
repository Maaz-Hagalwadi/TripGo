import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DesktopResetPasswordForm from '../components/auth/DesktopResetPasswordForm';
import MobileResetPasswordLayout from '../components/auth/MobileResetPasswordLayout';

const ResetPassword = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return isMobile ? <MobileResetPasswordLayout /> : <DesktopResetPasswordForm />;
};

export default ResetPassword;