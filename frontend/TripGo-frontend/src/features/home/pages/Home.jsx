import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import Header from '../../../shared/components/layout/Header';
import HeroSection from './HeroSection';
import WhyChooseUs from './WhyChooseUs';
import ExploreSection from './ExploreSection';
import Footer from '../../../shared/components/layout/Footer';

const Home = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuth, user, loading } = useAuth();
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refresh');

      if (token && refreshToken) {
        setIsProcessingOAuth(true);
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        await checkAuth();
        setIsProcessingOAuth(false);
      }
    };

    handleOAuthCallback();
  }, [searchParams, checkAuth]);

  useEffect(() => {
    if (user?.role) {
      if (user.role === 'OPERATOR') {
        navigate('/operator/dashboard');
      } else if (user.role === 'ADMIN') {
        navigate(ROUTES.ADMIN_DASHBOARD);
      } else if (user.role === 'USER') {
        navigate('/dashboard');
      }
    } else if (user && !loading && !isProcessingOAuth) {
      navigate('/dashboard');
    }
  }, [user, navigate, loading, isProcessingOAuth]);

  if (isProcessingOAuth || (loading && searchParams.get('token'))) {
    return (
      <div className="bg-deep-black min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Completing sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg">
      <Header />
      <HeroSection />
      <WhyChooseUs />
      <ExploreSection />
      <Footer />
    </div>
  );
};

export default Home;