import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import Header from '../../../shared/components/layout/Header';
import Footer from '../../../shared/components/layout/Footer';
import HeroSection from './HeroSection';
import OffersSection from './OffersSection';
import WhyChooseUs from './WhyChooseUs';
import ExploreSection from './ExploreSection';
import ReviewsSection from './ReviewsSection';
import FAQSection from './FAQSection';

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Arriving from another page via a header/footer section link
  useEffect(() => {
    const id = location.state?.scrollTo;
    if (!id) return;
    const timer = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
    return () => clearTimeout(timer);
  }, [location.state]);

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
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-700 text-lg font-medium">Completing sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <HeroSection />
      <OffersSection />
      <WhyChooseUs />
      <ExploreSection />
      <ReviewsSection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Home;