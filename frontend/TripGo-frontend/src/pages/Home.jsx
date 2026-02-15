import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import HeroSection from '../components/sections/HeroSection';
import WhyChooseUs from '../components/sections/WhyChooseUs';
import ExploreSection from '../components/sections/ExploreSection';
import Footer from '../components/layout/Footer';

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
        console.log('OAuth tokens found, processing...');
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
    console.log('User data:', user);
    if (user?.role) {
      console.log('Redirecting to dashboard for role:', user.role);
      if (user.role === 'OPERATOR') {
        navigate('/operator/dashboard');
      } else if (user.role === 'USER') {
        navigate('/dashboard');
      }
    } else if (user && !loading && !isProcessingOAuth) {
      console.log('User exists but no role, redirecting to dashboard');
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
    <div className="min-h-screen bg-deep-black">
      <Header />
      <HeroSection />
      <WhyChooseUs />
      <ExploreSection />
      <Footer />
    </div>
  );
};

export default Home;