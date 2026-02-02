import { useState, useEffect } from 'react';
import FeatureCard from '../ui/FeatureCard';

const WhyChooseUs = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  const features = [
    {
      icon: "shield",
      title: "Secure Payment",
      description: "Your transactions are protected with military-grade encryption and 2FA verification."
    },
    {
      icon: "support_agent",
      title: "24/7 VIP Support",
      description: "Concierge-level support available around the clock. Your satisfaction is our priority."
    },
    {
      icon: "airline_seat_recline_extra",
      title: "First-Class Comfort",
      description: "Ultra-modern fleet with reclining leather seats, high-speed WiFi, and onboard refreshments."
    }
  ];

  return (
    <section className="py-24 bg-deep-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-extrabold text-white mb-6">Why Choose TripGo</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-xl">
            Redefining the standards of bus travel with cutting-edge technology and premium service.
          </p>
        </div>
        
        <div className={isMobile ? "grid grid-cols-1 gap-8" : "grid grid-cols-3 gap-8"}>
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;