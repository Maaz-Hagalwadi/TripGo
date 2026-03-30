import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { useBusWizard } from '../context/BusWizardContext';
import { ROUTES } from '../../../shared/constants/routes';
import './OperatorDashboard.css';

const BusSeatLayout = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { wizardData, updateWizard } = useBusWizard();
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState(wizardData.blockedSeats || []);
  const [activeDeck, setActiveDeck] = useState('lower');

  const busType = wizardData.busType || 'SEATER';
  const totalSeats = parseInt(wizardData.totalSeats) || 40;

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  useEffect(() => { generateSeats(busType, totalSeats); }, [busType, totalSeats]);

  const generateSeats = (type, total) => {
    const numTotal = parseInt(total);
    if (type.includes('SLEEPER') && !type.includes('SEMI')) {
      const generatedSeats = [];
      const lowerDeckSeats = Math.floor(numTotal / 2);
      const upperDeckSeats = numTotal - lowerDeckSeats;
      const addDeck = (prefix, count, deck) => {
        let row = 0, counter = 0;
        while (counter < count) {
          for (let col = 0; col < 3 && counter < count; col++) {
            generatedSeats.push({ id: `${prefix}${row}-${col}`, row, col, deck, number: `${prefix}${counter + 1}`, type: 'sleeper', status: 'available' });
            counter++;
          }
          row++;
        }
      };
      addDeck('L', lowerDeckSeats, 'lower');
      addDeck('U', upperDeckSeats, 'upper');
      setSeats(generatedSeats);
    } else {
      const generatedSeats = [];
      const seatsPerRow = 4;
      const rows = Math.ceil(numTotal / seatsPerRow);
      for (let i = 0; i < rows && generatedSeats.length < numTotal; i++) {
        for (let j = 0; j < seatsPerRow && generatedSeats.length < numTotal; j++) {
          generatedSeats.push({ id: `${i}-${j}`, row: i, col: j, number: generatedSeats.length + 1, type: type.includes('SEMI_SLEEPER') ? 'semi-sleeper' : 'seater', status: 'available' });
        }
      }
      setSeats(generatedSeats);
    }
  };

  const toggleSeat = (seatId) => setSelectedSeats(prev => prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]);

  const getSeatIcon = (seat) => {
    if (seat.type === 'sleeper') return 'bed';
    if (seat.type === 'semi-sleeper') return 'airline_seat_recline_extra';
    return 'event_seat';
  };

  const handleContinue = () => {
    updateWizard({ blockedSeats: selectedSeats });
    navigate(ROUTES.OPERATOR_BUS_REVIEW);
  };

  const isSleeper = busType.includes('SLEEPER') && !busType.includes('SEMI');

  const SeatButton = ({ seat, className = '' }) => (
    <button
      key={seat.id}
      onClick={() => toggleSeat(seat.id)}
      className={`rounded-lg border-2 flex flex-col items-center justify-center transition-all ${className} ${
        selectedSeats.includes(seat.id)
          ? 'border-red-500 bg-red-500/20 text-red-500'
          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary'
      }`}
    >
      <span className="material-symbols-outlined text-xl">{getSeatIcon(seat)}</span>
      <span className="text-[10px] font-bold">{seat.number}</span>
    </button>
  );

  const SleeperDeck = ({ deck }) => (
    <div className="space-y-2">
      {Array.from(new Set(seats.filter(s => s.deck === deck).map(s => s.row))).map(row => (
        <div key={`${deck}-${row}`} className="flex gap-2">
          {seats.filter(s => s.deck === deck && s.row === row && s.col === 0).map(seat => (
            <SeatButton key={seat.id} seat={seat} className="w-20 h-36" />
          ))}
          <div className="w-6 flex items-center justify-center">
            <div className="h-full w-0.5 bg-slate-300 dark:bg-slate-700"></div>
          </div>
          <div className="flex gap-2">
            {seats.filter(s => s.deck === deck && s.row === row && s.col > 0).map(seat => (
              <SeatButton key={seat.id} seat={seat} className="w-20 h-36" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <OperatorLayout activeItem="add-bus" title="Seat Layout">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className="hover:text-primary transition-colors">Add Bus</button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-200 dark:text-slate-100 font-medium">Seat Layout</span>
          </div>
          <h2 className="text-3xl font-extrabold">Configure Seat Layout</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Bus Type: {busType.replace(/_/g, ' ')}</p>
        </header>

        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
            <div className="absolute top-1/2 left-0 w-2/3 h-0.5 bg-primary -translate-y-1/2 z-0"></div>
            {[{ label: 'Bus Info', done: true }, { label: 'Layout', active: true }, { label: 'Review', done: false }].map(({ label, done, active }, i) => (
              <div key={label} className="relative z-10 flex flex-col items-center">
                <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm ring-4 ring-white dark:ring-op-bg ${done || active ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-op-card border-2 border-slate-300 dark:border-slate-700 text-slate-500'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={`mt-2 text-xs font-bold uppercase tracking-widest ${done || active ? 'text-primary' : 'text-slate-500'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-op-card rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">airline_seat_recline_normal</span>
              <h3 className="text-lg font-bold">Seat Configuration</h3>
              <span className="ml-auto text-sm text-slate-500">Total Seats: {seats.length}</span>
            </div>

            {isSleeper ? (
              <div className="bg-slate-50 dark:bg-black/40 rounded-xl p-8">
                <div className="mb-6 flex justify-center">
                  <div className="bg-slate-300 dark:bg-slate-700 px-6 py-2 rounded-t-full">
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">steering_wheel</span>
                  </div>
                </div>
                {/* Mobile deck toggle */}
                <div className="deck-toggle-mobile justify-center mb-6">
                  <div className="inline-flex rounded-lg border-2 border-slate-300 dark:border-slate-700 overflow-hidden">
                    {['lower', 'upper'].map(d => (
                      <button key={d} onClick={() => setActiveDeck(d)}
                        className={`px-6 py-2 font-semibold transition-colors ${activeDeck === d ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                        {d === 'lower' ? 'Lower Deck' : 'Upper Deck'}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Mobile single deck */}
                <div className="deck-view-mobile max-w-4xl mx-auto">
                  <SleeperDeck deck={activeDeck} />
                </div>
                {/* Desktop both decks */}
                <div className="deck-view-desktop grid-cols-2 gap-8">
                  <div><h4 className="text-center font-bold mb-4 text-slate-700 dark:text-slate-300">Lower Deck</h4><SleeperDeck deck="lower" /></div>
                  <div><h4 className="text-center font-bold mb-4 text-slate-700 dark:text-slate-300">Upper Deck</h4><SleeperDeck deck="upper" /></div>
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
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${seats.length ? Math.max(...seats.map(s => s.col)) + 1 : 4}, minmax(0, 1fr))` }}>
                    {seats.map(seat => <SeatButton key={seat.id} seat={seat} className="w-16 h-16" />)}
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
            <button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className="px-6 py-2.5 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-colors">
              Back
            </button>
            <button onClick={handleContinue} className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
              Save & Continue
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default BusSeatLayout;
