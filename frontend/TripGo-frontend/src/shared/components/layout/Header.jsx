import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TripGoIcon from '../../../assets/icons/TripGoIcon';

const NAV_LINKS = [
  { id: 'offers',     label: 'Offers' },
  { id: 'why-tripgo', label: 'Why TripGo' },
  { id: 'explore',    label: 'Destinations' },
  { id: 'faq',        label: 'FAQ' },
];

const Header = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  // Blend into the hero at the top of the page, turn solid once scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the nav link whose section crosses the middle of the viewport
  useEffect(() => {
    const sections = NAV_LINKS.map(({ id }) => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
          else setActiveSection((current) => (current === entry.target.id ? null : current));
        });
      },
      { rootMargin: '-50% 0px -50% 0px' }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    setMenuOpen(false);
    const el = document.getElementById(id);
    // Not on the landing page (e.g. legal pages) — go there and let Home scroll to the section
    if (!el) { navigate('/', { state: { scrollTo: id } }); return; }
    el.scrollIntoView({ behavior: 'smooth' });
    window.history.replaceState(null, '', `#${id}`);
  };

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const solid = scrolled || menuOpen;

  const navLinkCls = (id) =>
    `text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${
      activeSection === id
        ? solid ? 'text-brand bg-slate-100' : 'text-white bg-white/10'
        : solid ? 'text-slate-600 hover:text-brand hover:bg-slate-50' : 'text-white/80 hover:text-white hover:bg-white/10'
    }`;

  const textBtnCls = `text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${
    solid ? 'text-slate-600 hover:text-brand hover:bg-slate-50' : 'text-white/80 hover:text-white hover:bg-white/10'
  }`;

  const signUpCls = `text-sm font-bold px-4 py-2 rounded-lg transition-all shadow-sm ${
    solid ? 'bg-brand text-white hover:bg-brand-dark' : 'bg-white text-brand hover:bg-slate-100'
  }`;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        solid ? 'bg-white border-slate-200 shadow-sm' : 'bg-primary border-transparent'
      }`}
    >
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <button onClick={() => goTo('/')} className="flex items-center gap-2.5 flex-shrink-0 group">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-colors ${
                solid ? 'bg-brand group-hover:bg-brand-dark' : 'bg-white/10 group-hover:bg-white/20'
              }`}
            >
              <TripGoIcon className="w-6 h-5 text-white" />
            </div>
            <span className={`text-base font-black tracking-tight transition-colors ${solid ? 'text-brand' : 'text-white'}`}>
              TripGo
            </span>
          </button>

          {/* Section links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => scrollToSection(e, id)}
                className={navLinkCls(id)}
                aria-current={activeSection === id ? 'true' : undefined}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Right */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => goTo('/operator-register')} className={textBtnCls}>
              For Operators
            </button>
            <button onClick={() => goTo('/login')} className={textBtnCls}>
              Log In
            </button>
            <button onClick={() => goTo('/register')} className={signUpCls}>
              Sign Up
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className={`md:hidden w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
              solid ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'
            }`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
          </button>

        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-slate-200 bg-white shadow-lg">
          <nav className="max-w-screen-xl mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => scrollToSection(e, id)}
                className={`${navLinkCls(id)} py-3`}
                aria-current={activeSection === id ? 'true' : undefined}
              >
                {label}
              </a>
            ))}
            <button onClick={() => goTo('/operator-register')} className={`${textBtnCls} py-3 text-left`}>
              For Operators
            </button>
            <div className="grid grid-cols-2 gap-2 pt-3 mt-2 border-t border-slate-100">
              <button
                onClick={() => goTo('/login')}
                className="text-sm font-semibold text-slate-700 border border-slate-200 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Log In
              </button>
              <button onClick={() => goTo('/register')} className={`${signUpCls} py-2.5`}>
                Sign Up
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
