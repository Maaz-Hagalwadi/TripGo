import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import Header from '../../../shared/components/layout/HeaderAuth';
import HeroSection from './HeroSection';
import WhyChooseUs from './WhyChooseUs';
import ExploreSection from './ExploreSection';
import Footer from '../../../shared/components/layout/Footer';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(ROUTES.HOME); return; }
    if (!user.phone) { navigate(ROUTES.COMPLETE_PROFILE, { replace: true }); return; }
    if (user.role === 'OPERATOR') { navigate(ROUTES.OPERATOR_DASHBOARD); return; }
    if (user.role === 'ADMIN') { navigate(ROUTES.ADMIN_DASHBOARD); return; }
    if (user.role && user.role !== 'USER') { navigate(ROUTES.HOME); }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-deep-black">
      <Header />
      <HeroSection />
      <WhyChooseUs />
      <ExploreSection />
      <Footer />
    </div>
  );
};

export default Dashboard;