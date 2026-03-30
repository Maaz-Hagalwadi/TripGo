import { useState, useEffect } from 'react';
import DesktopLoginForm from '../components/DesktopLoginForm';
import MobileLoginLayout from '../components/MobileLoginLayout';

const Login = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile ? <MobileLoginLayout /> : <DesktopLoginForm />;
};

export default Login;
