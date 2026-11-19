import { Link, useNavigate } from 'react-router-dom';
import TripGoIcon from '../../../assets/icons/TripGoIcon';
import loginBusImg from '../../../assets/images/login-bus.jpg';
import { ROUTES } from '../../../shared/constants/routes';

/**
 * Two-panel auth page: navy brand panel on the left (desktop only), form card on the right.
 * `headline` is [line1, highlightedLine2]; `cards` are { icon, title, sub }; `stats` are [value, label].
 */
const AuthSplitLayout = ({ headline, intro, cards, stats = [], narrow = false, children }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">

      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex lg:w-[42%] lg:sticky lg:top-0 lg:h-screen relative bg-primary items-center overflow-hidden">
        <img src={loginBusImg} className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-50" alt="" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,31,58,0.97)_0%,rgba(11,31,58,0.85)_48%,rgba(11,31,58,0.35)_100%)]" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-[#FF8A65]/15 blur-3xl" aria-hidden="true" />

        <button onClick={() => navigate('/')} className="absolute top-8 left-14 xl:left-16 z-20 flex items-center gap-3">
          <span className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
            <TripGoIcon className="w-7 h-6 text-white" />
          </span>
          <span className="font-black text-2xl tracking-tight text-white">TripGo</span>
        </button>

        <div className="relative z-10 p-14 xl:p-16 max-w-xl text-white">
          <h1 className="text-[2.75rem] xl:text-5xl font-black leading-[1.1] tracking-tight mb-5 text-white">
            {headline[0]}<br />
            <span className="bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] bg-clip-text text-transparent">{headline[1]}</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-9">{intro}</p>

          <div className="grid gap-3">
            {cards.map(({ icon, title, sub }) => (
              <div key={title} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm">
                <span className="w-10 h-10 flex-shrink-0 rounded-lg bg-[#FDBA74]/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#FDBA74]">{icon}</span>
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {stats.length > 0 && (
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {stats.map(([value, label]) => (
              <div key={label}>
                <p className="text-xl font-black text-[#FDBA74]">{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="w-full lg:w-[58%] flex flex-col bg-slate-50">
        {/* Logo for mobile/tablet — desktop shows it in the brand panel */}
        <div className="p-6 sm:p-8 lg:hidden">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <TripGoIcon className="w-6 h-5 text-white" />
            </span>
            <span className="font-black text-xl tracking-tight text-primary">TripGo</span>
          </button>
        </div>

        <div className="flex-grow flex items-center justify-center px-5 pb-6 sm:px-8 lg:px-12 lg:py-10">
          <div className={`w-full ${narrow ? 'max-w-[460px]' : 'max-w-[600px]'} bg-white border border-slate-200/70 rounded-2xl shadow-[0_24px_70px_rgba(11,31,58,0.10)] p-6 sm:p-9`}>
            {children}
          </div>
        </div>

        <footer className="px-8 pb-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} TripGo. All rights reserved.</p>
          <div className="flex gap-6">
            {[
              ['Privacy', ROUTES.PRIVACY],
              ['Terms', ROUTES.TERMS],
            ].map(([label, to]) => (
              <Link key={label} to={to} className="text-xs text-slate-400 hover:text-slate-900 transition-colors">{label}</Link>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AuthSplitLayout;
