import { useState, useEffect } from 'react';
import TripGoIcon from '../../assets/icons/TripGoIcon';

const Footer = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  const footerLinks = {
    company: [
      { name: "About Us", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Press", href: "#" }
    ],
    support: [
      { name: "Help Center", href: "#" },
      { name: "FAQs", href: "#" },
      { name: "Safety", href: "#" },
      { name: "Contact Us", href: "#" }
    ],
    legal: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
      { name: "Cookie Policy", href: "#" }
    ]
  };

  return (
    <footer className="bg-deep-black border-t border-white/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={isMobile ? "grid grid-cols-1 gap-8 mb-12" : "grid grid-cols-4 gap-12 mb-20"}>
          {/* Brand Section */}
          <div className={isMobile ? "text-center" : "col-span-1"}>
            <div className={isMobile ? "flex items-center gap-2 mb-6 justify-center" : "flex items-center gap-2 mb-8"}>
              <div className="text-primary">
                <TripGoIcon className="w-8 h-8" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">TripGo</span>
            </div>
            <p className={isMobile ? "text-slate-400 text-base leading-relaxed mb-6" : "text-slate-400 text-base leading-relaxed mb-8"}>
              The gold standard in bus travel. We bridge cities with comfort, safety, and reliability.
            </p>
            <div className={isMobile ? "flex gap-5 justify-center" : "flex gap-5"}>
              <a className="w-12 h-12 rounded-full bg-charcoal flex items-center justify-center hover:bg-primary hover:text-black transition-all border border-white/5" href="#">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
              </a>
              <a className="w-12 h-12 rounded-full bg-charcoal flex items-center justify-center hover:bg-primary hover:text-black transition-all border border-white/5" href="#">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
          
          {/* Company Links */}
          <div className={isMobile ? "text-center" : ""}>
            <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-sm">Company</h4>
            <div className="flex flex-col gap-y-2 text-slate-400">
              {footerLinks.company.map((link, index) => (
                <a key={index} className="hover:text-primary transition-colors" href={link.href}>
                  {link.name}
                </a>
              ))}
            </div>
          </div>
          
          {/* Support Links */}
          <div className={isMobile ? "text-center" : ""}>
            <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-sm">Support</h4>
            <div className="flex flex-col gap-y-2 text-slate-400">
              {footerLinks.support.map((link, index) => (
                <a key={index} className="hover:text-primary transition-colors" href={link.href}>
                  {link.name}
                </a>
              ))}
            </div>
          </div>
          
          {/* Legal Links */}
          <div className={isMobile ? "text-center" : ""}>
            <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-sm">Legal</h4>
            <div className="flex flex-col gap-y-2 text-slate-400">
              {footerLinks.legal.map((link, index) => (
                <a key={index} className="hover:text-primary transition-colors" href={link.href}>
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer Bottom */}
        <div className={isMobile ? "pt-8 border-t border-white/5 text-center text-slate-500 text-sm" : "pt-10 border-t border-white/5 text-center text-slate-500 text-sm"}>
          <p>© 2026 TripGo Inc. Engineered for the future of travel.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;