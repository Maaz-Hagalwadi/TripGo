import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HeroSection from './components/sections/HeroSection';
import WhyChooseUs from './components/sections/WhyChooseUs';
import ExploreSection from './components/sections/ExploreSection';

function App() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <WhyChooseUs />
        <ExploreSection />
      </main>
      <Footer />
    </>
  );
}

export default App;