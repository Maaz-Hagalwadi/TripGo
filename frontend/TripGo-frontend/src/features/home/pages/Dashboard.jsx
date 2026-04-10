import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import UserLayout from '../../../shared/components/UserLayout';
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
    if (user.role === 'OPERATOR') { navigate(ROUTES.OPERATOR_DASHBOARD); return; }
    if (user.role === 'ADMIN') { navigate(ROUTES.ADMIN_DASHBOARD); return; }
    if (user.role && user.role !== 'USER') { navigate(ROUTES.HOME); }
  }, [user, loading, navigate]);

  return (
    <UserLayout activeItem="dashboard" title="" showHeaderTitle={false} showHeaderSearch={false}>
      <div className="min-h-screen bg-deep-black rounded-2xl overflow-hidden">
      <HeroSection />
      <WhyChooseUs />
      <ExploreSection />
      <Footer />
      </div>
    </UserLayout>
  );
};

export default Dashboard;
