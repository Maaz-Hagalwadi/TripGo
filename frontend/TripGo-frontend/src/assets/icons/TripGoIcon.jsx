const TripGoIcon = ({ className = 'w-10 h-8', ...props }) => (
  <svg
    className={className}
    viewBox="0 0 48 38"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    {/* Bus body */}
    <rect x="2" y="4" width="44" height="22" rx="4.5" stroke="currentColor" strokeWidth="2.5"/>
    {/* Windshield */}
    <rect x="5" y="8" width="11" height="9" rx="2" stroke="currentColor" strokeWidth="2"/>
    {/* Window 1 */}
    <rect x="20" y="8" width="7" height="9" rx="2" stroke="currentColor" strokeWidth="2"/>
    {/* Window 2 */}
    <rect x="31" y="8" width="7" height="9" rx="2" stroke="currentColor" strokeWidth="2"/>
    {/* Door line */}
    <line x1="42" y1="14" x2="42" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    {/* Ground bar */}
    <line x1="2" y1="22" x2="46" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.35"/>
    {/* Left wheel */}
    <circle cx="12" cy="31" r="5.5" stroke="currentColor" strokeWidth="2.5"/>
    <circle cx="12" cy="31" r="2" fill="currentColor"/>
    {/* Right wheel */}
    <circle cx="36" cy="31" r="5.5" stroke="currentColor" strokeWidth="2.5"/>
    <circle cx="36" cy="31" r="2" fill="currentColor"/>
  </svg>
);

export default TripGoIcon;
