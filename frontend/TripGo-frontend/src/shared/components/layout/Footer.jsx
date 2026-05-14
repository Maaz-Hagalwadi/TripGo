import TripGoIcon from '../../../assets/icons/TripGoIcon';

const NAVY = '#002046';

const footerLinks = {
  Company: ['About Us', 'Careers', 'Blog', 'Press'],
  Support: ['Help Center', 'FAQs', 'Safety', 'Contact Us'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
};

const Footer = () => (
  <footer style={{ backgroundColor: NAVY }}>

    {/* Top CTA strip */}
    <div className="border-b border-white/10 py-8" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-white font-bold text-lg">Ready to start your journey?</p>
          <p className="text-blue-200/60 text-sm mt-0.5">Join 50,000+ travelers who book with TripGo every month.</p>
        </div>
        <div className="flex gap-3">
          <a href="/register" className="px-6 py-2.5 bg-white rounded-lg text-slate-900 font-bold text-sm hover:bg-blue-50 transition-all">
            Get Started Free
          </a>
          <a href="/login" className="px-6 py-2.5 border border-white/30 rounded-lg text-white/80 font-semibold text-sm hover:border-white/60 hover:text-white transition-all">
            Log In
          </a>
        </div>
      </div>
    </div>

    {/* Main footer grid */}
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-14">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-10">

        {/* Brand column */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-white">
              <TripGoIcon className="w-5 h-7" />
            </div>
            <span className="text-white font-black text-lg">TripGo</span>
          </div>
          <p className="text-blue-200/60 text-sm leading-relaxed mb-6 max-w-xs">
            India's fastest-growing bus booking platform. Connecting cities with comfort, safety, and reliability.
          </p>
          <div className="flex gap-3">
            <a href="#" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="#" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <h4 className="text-white/90 text-xs font-bold uppercase tracking-widest mb-4">{title}</h4>
            <ul className="space-y-3">
              {links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-blue-200/60 text-sm hover:text-white transition-colors">{link}</a>
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
        <p>© {new Date().getFullYear()} TripGo Inc. All rights reserved.</p>
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined !text-sm" style={{ color: '#91d2d2' }}>lock</span>
          <span>Payments secured by Stripe</span>
        </div>
      </div>
    </div>

  </footer>
);

export default Footer;
