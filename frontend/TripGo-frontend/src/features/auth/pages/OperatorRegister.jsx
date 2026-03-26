import { useState, useEffect } from 'react';
import DesktopOperatorForm from '../components/DesktopOperatorForm';
import MobileOperatorLayout from '../components/MobileOperatorLayout';

const OperatorRegister = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return isMobile ? <MobileOperatorLayout /> : <DesktopOperatorForm />;
};

export default OperatorRegister;
