import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
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
    
    console.log('Dashboard - loading:', loading, 'user:', user, 'role:', user?.role);
    
    if (!user) {
      console.log('Dashboard - No user, redirecting to home');
      navigate('/');
      return;
    }
    
    if (user.role === 'OPERATOR') {
      console.log('Dashboard - OPERATOR role, redirecting to operator dashboard');
      navigate('/operator/dashboard');
      return;
    }
    
    if (user.role && user.role !== 'USER') {
      console.log('Dashboard - Not USER role, redirecting to home');
      navigate('/');
    }
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