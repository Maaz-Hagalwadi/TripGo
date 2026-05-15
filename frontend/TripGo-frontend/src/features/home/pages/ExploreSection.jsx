import { useNavigate } from 'react-router-dom';

const routes = [
  { from: 'Mumbai', to: 'Pune', duration: '3h', buses: '120+ buses' },
  { from: 'Delhi', to: 'Jaipur', duration: '5h', buses: '80+ buses' },
  { from: 'Bangalore', to: 'Chennai', duration: '6h', buses: '100+ buses' },
  { from: 'Hyderabad', to: 'Bangalore', duration: '10h', buses: '75+ buses' },
  { from: 'Ahmedabad', to: 'Mumbai', duration: '8h', buses: '60+ buses' },
  { from: 'Kolkata', to: 'Bhubaneswar', duration: '7h', buses: '45+ buses' },
];

const RouteCard = ({ from, to, duration, buses, onBook }) => (
  <button
    onClick={onBook}
    className="group flex items-center justify-between bg-white border border-slate-100 rounded-xl px-5 py-4 shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 text-left w-full"
  >
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-slate-600 !text-xl">directions_bus</span>
      </div>
      <div>
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <span>{from}</span>
          <span className="material-symbols-outlined !text-base text-slate-400">arrow_forward</span>
          <span>{to}</span>
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{buses} &middot; {duration}</div>
      </div>
    </div>
    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors !text-xl">chevron_right</span>
  </button>
);

const ExploreSection = () => {
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  const handleBook = (from, to) => {
    navigate('/search-results', { state: { from, to, date: today } });
  };

  return (
    <section className="py-16 md:py-20 bg-slate-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">

        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quick Access</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">Popular Routes</h2>
          </div>
          <button
            onClick={() => navigate('/search-results')}
            className="text-sm font-semibold text-slate-500 hover:text-slate-800 hover:underline hidden md:block"
          >
            View all routes →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map((r) => (
            <RouteCard
              key={`${r.from}-${r.to}`}
              {...r}
              onBook={() => handleBook(r.from.toLowerCase(), r.to.toLowerCase())}
            />
          ))}
        </div>

      </div>
    </section>
  );
};

export default ExploreSection;
