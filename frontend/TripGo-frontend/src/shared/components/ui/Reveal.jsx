import { useEffect, useRef, useState } from 'react';

/**
 * Fades + slides its children up the first time they scroll into view.
 * Styles live in index.css (.reveal / .is-visible) and are disabled under prefers-reduced-motion.
 */
const Reveal = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // Trigger as soon as the top edge is a little inside the viewport — a ratio threshold
      // keeps tall elements hidden (blank) until most of them has been scrolled into view
      { threshold: 0, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
};

export default Reveal;
