import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OperatorSidebar from '../components/operator/OperatorSidebar';
import './OperatorDashboard.css';

const BusSeatLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, logout } = useAuth();
  const [activeView, setActiveView] = useState('add-bus');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [activeDeck, setActiveDeck] = useState('lower');
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  const busData = location.state || {};
  const busType = busData.busType || 'SEATER';
  const totalSeats = parseInt(busData.totalSeats) || 40;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/');
      return;
    }
    if (user.role && user.role !== 'OPERATOR') {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    generateSeats(busType, totalSeats);
  }, [busType, totalSeats]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const generateSeats = (type, total) => {
    const numTotal = parseInt(total);
    console.log('Total seats input:', total, 'Parsed:', numTotal);
    
    if (type.includes('SLEEPER')) {
      const generatedSeats = [];
      
      // Lower deck - split evenly
      const lowerDeckSeats = Math.floor(numTotal / 2);
      const upperDeckSeats = numTotal - lowerDeckSeats;
      
      console.log('Lower deck target:', lowerDeckSeats, 'Upper deck target:', upperDeckSeats);
      
      let row = 0;
      let seatCounter = 0;
      
      while (seatCounter < lowerDeckSeats) {
        // Left single seat
        generatedSeats.push({
          id: `L${row}-0`,
          row: row,
          col: 0,
          deck: 'lower',
          number: `L${seatCounter + 1}`,
          type: 'sleeper',
          status: 'available'
        });
        seatCounter++;
        
        // Right first seat
        if (seatCounter < lowerDeckSeats) {
          generatedSeats.push({
            id: `L${row}-1`,
            row: row,
            col: 1,
            deck: 'lower',
            number: `L${seatCounter + 1}`,
            type: 'sleeper',
            status: 'available'
          });
          seatCounter++;
        }
        
        // Right second seat
        if (seatCounter < lowerDeckSeats) {
          generatedSeats.push({
            id: `L${row}-2`,
            row: row,
            col: 2,
            deck: 'lower',
            number: `L${seatCounter + 1}`,
            type: 'sleeper',
            status: 'available'
          });
          seatCounter++;
        }
        
        row++;
      }
      
      // Upper deck
      row = 0;
      seatCounter = 0;
      
      while (seatCounter < upperDeckSeats) {
        // Left single seat
        generatedSeats.push({
          id: `U${row}-0`,
          row: row,
          col: 0,
          deck: 'upper',
          number: `U${seatCounter + 1}`,
          type: 'sleeper',
          status: 'available'
        });
        seatCounter++;
        
        // Right first seat
        if (seatCounter < upperDeckSeats) {
          generatedSeats.push({
            id: `U${row}-1`,
            row: row,
            col: 1,
            deck: 'upper',
            number: `U${seatCounter + 1}`,
            type: 'sleeper',
            status: 'available'
          });
          seatCounter++;
        }
        
        // Right second seat
        if (seatCounter < upperDeckSeats) {
          generatedSeats.push({
            id: `U${row}-2`,
            row: row,
            col: 2,
            deck: 'upper',
            number: `U${seatCounter + 1}`,
            type: 'sleeper',
            status: 'available'
          });
          seatCounter++;
        }
        
        row++;
      }
      
      console.log('Generated seats:', generatedSeats.length, 'Lower:', generatedSeats.filter(s => s.deck === 'lower').length, 'Upper:', generatedSeats.filter(s => s.deck === 'upper').length);
      setSeats(generatedSeats);
    } else {
      const generatedSeats = [];
      const seatsPerRow = 4;
      const rows = Math.ceil(numTotal / seatsPerRow);
      
      for (let i = 0; i < rows && generatedSeats.length < numTotal; i++) {
        for (let j = 0; j < seatsPerRow && generatedSeats.length < numTotal; j++) {
          generatedSeats.push({
            id: `${i}-${j}`,
            row: i,
            col: j,
            number: generatedSeats.length + 1,
            type: type.includes('SEMI_SLEEPER') ? 'semi-sleeper' : 'seater',
            status: 'available'
          });
        }
      }
      setSeats(generatedSeats);
    }
  };

  const notifications = [
    { id: 1, message: "New booking received for Route TRP-102", time: "10 min ago", unread: true },
    { id: 2, message: "Bus TRP-088 maintenance scheduled", time: "1 hour ago", unread: true },
    { id: 3, message: "Monthly revenue report available", time: "2 hours ago", unread: false }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const toggleSeat = (seatId) => {
    setSelectedSeats(prev =>
      prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]
    );
  };

  const getSeatIcon = (seat) => {
    if (seat.type === 'sleeper') return 'bed';
    if (seat.type === 'semi-sleeper') return 'airline_seat_recline_extra';
    return 'event_seat';
  };

  return (
    <div className="bg-background-light dark:bg-[#101e22] text-slate-900 dark:text-slate-100 min-h-screen flex">
      <div className="operator-sidebar">
        <OperatorSidebar activeItem={activeView} onNavigate={setActiveView} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      <main className={`operator-main flex-1 flex flex-col min-w-0 overflow-hidden transition-all ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101e22] flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-lg font-semibold capitalize">Seat Layout</h2>
            <div className="operator-search relative max-w-md w-full ml-4">
              <span className="material-symbols-outlined absolute left-3 top-[11px] text-slate-400 text-[18px]">search</span>
              <input className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Search buses, routes, or bookings..." type="text"/>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="notification-dropdown absolute right-0 mt-2 w-80 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-sm">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className={`p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        notification.unread ? 'bg-primary/5' : ''
                      }`}>
                        <p className="text-sm mb-1">{notification.message}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-800 relative" ref={profileRef}>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-slate-500">Fleet Manager</p>
              </div>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">person</span>
              </button>
              {showProfileDropdown && (
                <div className="profile-dropdown absolute right-0 top-12 w-64 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-300 text-xl">person</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{user?.firstName} {user?.lastName}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <button className="w-full px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg">person</span>
                      My Profile
                    </button>
                    <button className="w-full px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg">settings</span>
                      Settings
                    </button>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 p-2">
                    <button 
                      onClick={async () => {
                        await logout();
                        navigate('/');
                      }}
                      className="w-full px-4 py-3 text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-3 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <header className="mb-8">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <button onClick={() => navigate('/operator/add-bus')} className="hover:text-primary transition-colors">Add Bus</button>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="text-slate-200 dark:text-slate-100 font-medium">Seat Layout</span>
              </div>
              <h2 className="text-3xl font-extrabold">Configure Seat Layout</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Bus Type: {busType.replace(/_/g, ' ')}</p>
            </header>

            <div className="mb-10">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
                <div className="absolute top-1/2 left-0 w-2/3 h-0.5 bg-primary -translate-y-1/2 z-0 shadow-[0_0_10px_rgba(19,127,236,0.5)]"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm ring-4 ring-white dark:ring-[#101e22]">✓</div>
                  <span className="mt-2 text-xs font-bold text-primary uppercase tracking-widest">Bus Info</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm ring-4 ring-white dark:ring-[#101e22]">2</div>
                  <span className="mt-2 text-xs font-bold text-primary uppercase tracking-widest">Layout</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="size-10 rounded-full bg-slate-200 dark:bg-[#1a1a1a] border-2 border-slate-300 dark:border-slate-700 text-slate-500 flex items-center justify-center font-bold text-sm ring-4 ring-white dark:ring-[#101e22]">3</div>
                  <span className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Review</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6 lg:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-primary">airline_seat_recline_normal</span>
                  <h3 className="text-lg font-bold">Seat Configuration</h3>
                  <span className="ml-auto text-sm text-slate-500">Total Seats: {seats.length}</span>
                </div>

                {busType.includes('SLEEPER') ? (
                  <div className="bg-slate-50 dark:bg-black/40 rounded-xl p-8">
                    <div className="mb-6 flex justify-center">
                      <div className="bg-slate-300 dark:bg-slate-700 px-6 py-2 rounded-t-full">
                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">steering_wheel</span>
                      </div>
                    </div>
                    
                    {/* Mobile: Deck Toggle */}
                    <div className="deck-toggle-mobile justify-center mb-6">
                      <div className="inline-flex rounded-lg border-2 border-slate-300 dark:border-slate-700 overflow-hidden">
                        <button
                          onClick={() => setActiveDeck('lower')}
                          className={`px-6 py-2 font-semibold transition-colors ${
                            activeDeck === 'lower'
                              ? 'bg-primary text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          Lower Deck
                        </button>
                        <button
                          onClick={() => setActiveDeck('upper')}
                          className={`px-6 py-2 font-semibold transition-colors ${
                            activeDeck === 'upper'
                              ? 'bg-primary text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          Upper Deck
                        </button>
                      </div>
                    </div>

                    {/* Mobile: Single Deck View */}
                    <div className="deck-view-mobile max-w-4xl mx-auto">
                      <div className="space-y-2">
                        {Array.from(new Set(seats.filter(s => s.deck === activeDeck).map(s => s.row))).map(row => (
                          <div key={`${activeDeck}-${row}`} className="flex gap-2 justify-center">
                            {seats.filter(s => s.deck === activeDeck && s.row === row && s.col === 0).map((seat) => (
                              <button
                                key={seat.id}
                                onClick={() => toggleSeat(seat.id)}
                                className={`!w-24 !h-24 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                  selectedSeats.includes(seat.id)
                                    ? 'border-red-500 bg-red-500/20 text-red-500'
                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary'
                                }`}
                              >
                                <span className="material-symbols-outlined text-2xl">bed</span>
                                <span className="text-xs font-bold">{seat.number}</span>
                              </button>
                            ))}
                            <div className="w-4 flex items-center justify-center">
                              <div className="h-full w-0.5 bg-slate-300 dark:bg-slate-700"></div>
                            </div>
                            <div className="flex gap-2">
                              {seats.filter(s => s.deck === activeDeck && s.row === row && s.col > 0).map((seat) => (
                                <button
                                  key={seat.id}
                                  onClick={() => toggleSeat(seat.id)}
                                  className={`!w-24 !h-24 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                    selectedSeats.includes(seat.id)
                                      ? 'border-red-500 bg-red-500/20 text-red-500'
                                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-2xl">bed</span>
                                  <span className="text-xs font-bold">{seat.number}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Desktop: Both Decks Side-by-Side */}
                    <div className="deck-view-desktop grid-cols-2 gap-8">
                      {/* Lower Deck */}
                      <div>
                        <h4 className="text-center font-bold mb-4 text-slate-700 dark:text-slate-300">Lower Deck</h4>
                        <div className="space-y-2">
                          {Array.from(new Set(seats.filter(s => s.deck === 'lower').map(s => s.row))).map(row => (
                            <div key={`lower-${row}`} className="flex gap-2">
                              {seats.filter(s => s.deck === 'lower' && s.row === row && s.col === 0).map((seat) => (
                                <button
                                  key={seat.id}
                                  onClick={() => toggleSeat(seat.id)}
                                  className={`w-20 h-36 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                    selectedSeats.includes(seat.id)
                                      ? 'border-red-500 bg-red-500/20 text-red-500'
                                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-lg">bed</span>
                                  <span className="text-[10px] font-bold">{seat.number}</span>
                                </button>
                              ))}
                              <div className="w-6 flex items-center justify-center">
                                <div className="h-full w-0.5 bg-slate-300 dark:bg-slate-700"></div>
                              </div>
                              <div className="flex gap-2">
                                {seats.filter(s => s.deck === 'lower' && s.row === row && s.col > 0).map((seat) => (
                                  <button
                                    key={seat.id}
                                    onClick={() => toggleSeat(seat.id)}
                                    className={`w-20 h-36 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                      selectedSeats.includes(seat.id)
                                        ? 'border-red-500 bg-red-500/20 text-red-500'
                                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-lg">bed</span>
                                    <span className="text-[10px] font-bold">{seat.number}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Upper Deck */}
                      <div>
                        <h4 className="text-center font-bold mb-4 text-slate-700 dark:text-slate-300">Upper Deck</h4>
                        <div className="space-y-2">
                          {Array.from(new Set(seats.filter(s => s.deck === 'upper').map(s => s.row))).map(row => (
                            <div key={`upper-${row}`} className="flex gap-2">
                              {seats.filter(s => s.deck === 'upper' && s.row === row && s.col === 0).map((seat) => (
                                <button
                                  key={seat.id}
                                  onClick={() => toggleSeat(seat.id)}
                                  className={`w-20 h-36 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                    selectedSeats.includes(seat.id)
                                      ? 'border-red-500 bg-red-500/20 text-red-500'
                                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-lg">bed</span>
                                  <span className="text-[10px] font-bold">{seat.number}</span>
                                </button>
                              ))}
                              <div className="w-6 flex items-center justify-center">
                                <div className="h-full w-0.5 bg-slate-300 dark:bg-slate-700"></div>
                              </div>
                              <div className="flex gap-2">
                                {seats.filter(s => s.deck === 'upper' && s.row === row && s.col > 0).map((seat) => (
                                  <button
                                    key={seat.id}
                                    onClick={() => toggleSeat(seat.id)}
                                    className={`w-20 h-36 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                      selectedSeats.includes(seat.id)
                                        ? 'border-red-500 bg-red-500/20 text-red-500'
                                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-lg">bed</span>
                                    <span className="text-[10px] font-bold">{seat.number}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-black/40 rounded-xl p-8 flex justify-center">
                    <div className="inline-block">
                      <div className="mb-6 flex justify-center">
                        <div className="bg-slate-300 dark:bg-slate-700 px-6 py-2 rounded-t-full">
                          <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">steering_wheel</span>
                        </div>
                      </div>
                      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(...seats.map(s => s.col)) + 1}, minmax(0, 1fr))` }}>
                        {seats.map((seat) => (
                          <button
                            key={seat.id}
                            onClick={() => toggleSeat(seat.id)}
                            className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                              selectedSeats.includes(seat.id)
                                ? 'border-red-500 bg-red-500/20 text-red-500'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary'
                            }`}
                          >
                            <span className="material-symbols-outlined text-xl">{getSeatIcon(seat)}</span>
                            <span className="text-[10px] font-bold">{seat.number}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-red-500 bg-red-500/20 rounded"></div>
                    <span>Blocked</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-black/30 p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <button onClick={() => navigate('/operator/add-bus')} className="px-6 py-2.5 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-colors">
                  Back
                </button>
                <button className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
                  Save & Continue
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-slate-800 z-50">
        <div className="grid grid-cols-5 h-16">
          <button onClick={() => navigate('/operator/dashboard')} className="flex flex-col items-center justify-center gap-1 transition-colors text-slate-400">
            <span className="material-symbols-outlined text-xl">dashboard</span>
            <span className="text-[10px] font-medium">Overview</span>
          </button>
          <button onClick={() => navigate('/operator/dashboard')} className="flex flex-col items-center justify-center gap-1 transition-colors text-slate-400">
            <span className="material-symbols-outlined text-xl">directions_bus</span>
            <span className="text-[10px] font-medium">Buses</span>
          </button>
          <button onClick={() => navigate('/operator/add-bus')} className="flex flex-col items-center justify-center gap-1 transition-colors text-primary">
            <span className="material-symbols-outlined text-xl">add_circle</span>
            <span className="text-[10px] font-medium">Add Bus</span>
          </button>
          <button onClick={() => navigate('/operator/dashboard')} className="flex flex-col items-center justify-center gap-1 transition-colors text-slate-400">
            <span className="material-symbols-outlined text-xl">confirmation_number</span>
            <span className="text-[10px] font-medium">Bookings</span>
          </button>
          <button onClick={() => navigate('/operator/dashboard')} className="flex flex-col items-center justify-center gap-1 transition-colors text-slate-400">
            <span className="material-symbols-outlined text-xl">settings</span>
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default BusSeatLayout;
