import Header from '../components/layout/Header';
import HeroSection from '../components/sections/HeroSection';
import WhyChooseUs from '../components/sections/WhyChooseUs';
import ExploreSection from '../components/sections/ExploreSection';
import Footer from '../components/layout/Footer';

const Home = () => {
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