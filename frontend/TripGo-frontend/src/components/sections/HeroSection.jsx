import SearchBar from '../ui/SearchBar';

const HeroSection = () => {
  return (
    <section className="relative w-full h-[700px] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center" 
        style={{
          backgroundImage: "linear-gradient(rgba(5, 5, 5, 0.7), rgba(5, 5, 5, 0.9)), url('https://lh3.googleusercontent.com/aida-public/AB6AXuBaWdLvirFLq9gQIzc79yRfhZecULRAzSPQ-Eev3IdORsc2x4lKQEngg0b6iKpxyeUMQ3F3ndbAaochZqTN2xApDbxj_p_cT4_9gOtcKGLnxNMztUuDqUAxUgkV3wbpWpD8twOaCcLb8D_afIznu8gxsBjvhKgjQjMYKn5mpo-cqf4sRm8EXrrYZ9PM2LGiIp1wpostxaih0VJ2ZAvymjAewnAa1CusAzdfLA84hhKCwvxAteOK4ie_JUSDj4zUqp_62VUoc0FM7qvk')"
        }}
      />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 tracking-tight leading-tight">
          Your Journey, <span className="text-primary">Simplified.</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto font-medium">
          Book premium bus tickets across 500+ cities. Experience comfort at every mile.
        </p>
        
        <SearchBar />
      </div>
    </section>
  );
};

export default HeroSection;