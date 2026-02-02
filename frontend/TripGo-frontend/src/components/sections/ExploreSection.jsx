import { useState, useEffect } from 'react';

const ExploreSection = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  return (
    <section className="py-20 bg-dark-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={isMobile ? "flex flex-col items-center gap-8 rounded-[2.5rem] bg-charcoal border border-white/5 p-6 shadow-2xl relative overflow-hidden" : "flex flex-row items-center gap-12 rounded-[2.5rem] bg-charcoal border border-white/5 p-12 shadow-2xl relative overflow-hidden"}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          
          <div className="flex-1 space-y-8 relative z-10">
            <span className="inline-block px-4 py-1.5 bg-primary/20 text-primary text-sm font-bold uppercase tracking-widest rounded-full">
              Explore New Frontiers
            </span>
            <h2 className={isMobile ? "text-3xl font-extrabold text-white leading-tight" : "text-4xl md:text-5xl font-extrabold text-white leading-tight"}>
              Pacific Coastline: The Scenic Expedition
            </h2>
            <p className={isMobile ? "text-slate-400 text-lg leading-relaxed" : "text-slate-400 text-xl leading-relaxed"}>
              Book our new exclusive routes through the Pacific Northwest. Experience breathtaking mountain vistas and coastal roads in absolute luxury.
            </p>
            <button className={isMobile ? "bg-primary hover:bg-primary/90 text-black px-6 py-3 rounded-xl font-bold flex items-center gap-3 transition-all transform hover:translate-x-2" : "bg-primary hover:bg-primary/90 text-black px-10 py-4 rounded-xl font-bold flex items-center gap-3 transition-all transform hover:translate-x-2"}>
              View Exclusive Offers
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
          
          <div className="flex-1 w-full relative">
            <div 
              className="w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-white/10" 
              style={{
                backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCUUQehNglV6D_9xBVLoBUIx9IvKu51t5Abq-b2dc6vVnhz2tTcaoYW3wqmHNogfBkQE_2xuaU5H_4XoKrMQuLYm3TnMHHARjWkZVD16kpP31ifbIWaHjudkmY2YY8m5xXRqf8vJzjuYk8HrIPxPz5lCVyn-dCDs6E7gSXxJZTr9UKm5ZiGM86f7C3uhPC5Y6RYIy209LnRHsnkYAcB2jBQ5BRFnlCy49j8bt6uF761WPRiOItVWRGvYSsLDMtL3ai2-qujnO8nPWnP')",
                backgroundSize: "cover",
                backgroundPosition: "center"
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-deep-black/60 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreSection;