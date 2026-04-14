const TripGoIcon = ({ className = "w-9 h-9" }) => (
  <svg
    className={className}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Rounded square background */}
    <rect width="40" height="40" rx="10" fill="currentColor" />
    {/* T letter */}
    <rect x="10" y="10" width="20" height="4" rx="2" fill="#000" />
    <rect x="18" y="14" width="4" height="16" rx="2" fill="#000" />
  </svg>
);

export default TripGoIcon;
