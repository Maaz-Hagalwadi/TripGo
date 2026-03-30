import { useState, useEffect } from 'react';
import DesktopForm from '../components/DesktopForm';
import MobileLayout from '../components/MobileLayout';

const Register = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile ? <MobileLayout /> : <DesktopForm />;
};

export default Register;
