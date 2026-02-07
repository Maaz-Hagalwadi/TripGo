import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/HeaderAuth';
import HeroSection from '../components/sections/HeroSection';
import WhyChooseUs from '../components/sections/WhyChooseUs';
import ExploreSection from '../components/sections/ExploreSection';
import Footer from '../components/layout/Footer';

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