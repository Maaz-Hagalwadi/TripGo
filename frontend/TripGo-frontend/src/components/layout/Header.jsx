import TripGoIcon from '../../assets/icons/TripGoIcon';

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-deep-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Left Corner */}
          <div className="flex items-center gap-2 -ml-2">
            <div className="text-primary">
              <TripGoIcon />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">TripGo</span>
          </div>
          
          {/* Navigation - Center */}
          <nav className="flex items-center gap-10">
            <a className="text-sm font-bold text-primary" href="#">Home</a>
            <a className="text-sm font-semibold text-slate-400 hover:text-white transition-colors" href="#">My Bookings</a>
            <a className="text-sm font-semibold text-slate-400 hover:text-white transition-colors" href="#">Support</a>
          </nav>
          
          {/* Auth Buttons - Right */}
          <div className="flex items-center gap-3">
            <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all">
              Login
            </button>
            <button className="bg-primary hover:bg-primary/90 text-black px-6 py-2.5 rounded-full text-sm font-bold transition-all">
              Register
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;