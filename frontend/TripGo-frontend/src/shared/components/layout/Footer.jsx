import { Link, useNavigate } from 'react-router-dom';
import TripGoIcon from '../../../assets/icons/TripGoIcon';
import { ROUTES } from '../../constants/routes';

// Only real destinations: in-page sections (href) or app routes (to)
const footerLinks = {
  Travellers: [
    { label: 'Search buses', href: '#top' },
    { label: 'Offers', href: '#offers' },
    { label: 'Why TripGo', href: '#why-tripgo' },
    { label: 'FAQ', href: '#faq' },
    { label: 'My bookings', to: ROUTES.USER_BOOKINGS },
  ],
  Operators: [
    { label: 'Become an operator', to: ROUTES.OPERATOR_REGISTER },
    { label: 'How it works', to: ROUTES.OPERATOR_HOW_IT_WORKS },
    { label: 'Operator login', to: ROUTES.LOGIN },
  ],
  Account: [
    { label: 'Sign up', to: ROUTES.REGISTER },
    { label: 'Log in', to: ROUTES.LOGIN },
    { label: 'Help & support', to: ROUTES.USER_SUPPORT },
  ],
  Legal: [
    { label: 'Terms of Service', to: ROUTES.TERMS },
    { label: 'Privacy Policy', to: ROUTES.PRIVACY },
    { label: 'Refund & Cancellation', to: ROUTES.REFUND_POLICY },
  ],
};

const linkCls = 'text-slate-400 text-sm hover:text-[#FDBA74] transition-colors';

const Footer = () => {
  const navigate = useNavigate();

  const scrollTo = (e, href) => {
    e.preventDefault();
    const onLanding = Boolean(document.getElementById('why-tripgo'));
    // Section links from other pages (e.g. legal pages) go back to the landing page first
    if (!onLanding) { navigate('/', { state: href === '#top' ? undefined : { scrollTo: href.slice(1) } }); return; }
    if (href === '#top') window.scrollTo({ top: 0, behavior: 'smooth' });
    else document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
  <footer className="bg-primary">

    {/* Top CTA strip */}
    <div className="border-b border-white/10 bg-white/5 py-8">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div>
          <p className="text-white font-bold text-lg">Ready to start your journey?</p>
          <p className="text-slate-400 text-sm mt-0.5">Create a free account to keep all your bookings and tickets in one place.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to={ROUTES.REGISTER}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] text-primary font-bold text-sm hover:brightness-105 transition-all"
          >
            Get Started Free
          </Link>
          <Link
            to={ROUTES.LOGIN}
            className="px-6 py-2.5 border border-white/30 rounded-lg text-white/80 font-semibold text-sm hover:border-white/60 hover:text-white transition-all"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>

    {/* Main footer grid */}
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-10">

        {/* Brand column */}
        <div className="col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <TripGoIcon className="w-6 h-5 text-white" />
            </div>
            <span className="text-white font-black text-lg">TripGo</span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Bus tickets across India from verified operators — search, pick your seat, and board with a QR ticket.
          </p>
        </div>

        {/* Link columns */}
        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <h4 className="text-white/90 text-xs font-bold uppercase tracking-widest mb-4">{title}</h4>
            <ul className="space-y-3">
              {links.map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link to={link.to} className={linkCls}>{link.label}</Link>
                  ) : (
                    <a href={link.href} onClick={(e) => scrollTo(e, link.href)} className={linkCls}>{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

      </div>
    </div>

    {/* Bottom bar */}
    <div className="border-t border-white/10">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-white/40 text-xs">
        <p>© {new Date().getFullYear()} TripGo. All rights reserved.</p>
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined !text-sm text-[#FDBA74]">lock</span>
          <span>Payments secured by Stripe</span>
        </div>
      </div>
    </div>

  </footer>
  );
};

export default Footer;
