import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '₹299',
    per: 'per month',
    savings: null,
    popular: false,
  },
  {
    id: 'quarterly',
    label: 'Quarterly',
    price: '₹749',
    per: 'per 3 months',
    savings: 'Save ₹148',
    popular: true,
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '₹2,499',
    per: 'per year',
    savings: 'Save ₹1,089',
    popular: false,
  },
];

const FEATURES = [
  { icon: 'priority_high', label: 'Priority Seat Selection', desc: 'Get first pick on seats before general booking opens' },
  { icon: 'cancel', label: 'Zero Cancellation Fees', desc: 'Cancel any booking for free, up to 2 hours before departure' },
  { icon: 'download', label: 'Instant Ticket Downloads', desc: 'PDF tickets generated immediately after booking confirmation' },
  { icon: 'support_agent', label: 'Priority Support', desc: 'Dedicated support queue with response under 2 hours' },
  { icon: 'discount', label: 'Exclusive Discounts', desc: 'Up to 15% off on select routes and operators' },
  { icon: 'notifications_active', label: 'Smart Trip Alerts', desc: 'Real-time notifications for delays, platform changes, and offers' },
];

const UserPremium = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('quarterly');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'USER') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  const handleSubscribe = async () => {
    setSubscribing(true);
    const t = toast.loading('Processing your subscription...');
    await new Promise((r) => setTimeout(r, 1500));
    toast.success('TripGo Premium activated! Enjoy your benefits.', { id: t });
    setSubscribing(false);
  };

  const plan = PLANS.find((p) => p.id === selectedPlan);

  return (
    <UserLayout activeItem="premium" title="TripGo Premium">
      <div className="space-y-6 max-w-3xl">

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-8 text-white shadow-sm relative overflow-hidden">
          <div className="absolute -top-4 -right-4 text-[120px] opacity-[0.06] select-none leading-none">★</div>
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/[0.03] -translate-x-1/2 translate-y-1/2" />
          <p className="text-[10px] font-semibold opacity-60 uppercase tracking-[0.2em] mb-3">TripGo Premium</p>
          <h1 className="text-3xl font-black leading-tight">Travel smarter.<br />Travel priority.</h1>
          <p className="text-sm opacity-60 mt-3 max-w-md">
            Unlock priority seats, zero cancellation fees, and exclusive perks on every trip with TripGo Premium.
          </p>
        </div>

        {/* Features */}
        <div>
          <h2 className="text-lg font-black text-slate-900 mb-3">What's included</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 flex items-start gap-3 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-base text-[#002046]">{f.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{f.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan selection */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Choose your plan</h2>
            <p className="text-xs text-slate-500 mt-0.5">All plans include full access to Premium features</p>
          </div>

          <div className="p-5 space-y-3">
            {PLANS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlan(p.id)}
                className={`w-full flex items-center justify-between gap-4 rounded-2xl px-5 py-4 ring-2 transition-all text-left ${
                  selectedPlan === p.id
                    ? 'ring-[#002046] bg-[#002046]/[0.04]'
                    : 'ring-slate-200 hover:ring-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedPlan === p.id ? 'border-[#002046]' : 'border-slate-300'}`}>
                    {selectedPlan === p.id && <div className="w-2.5 h-2.5 rounded-full bg-[#002046]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{p.label}</span>
                      {p.popular && (
                        <span className="rounded-full bg-[#002046] text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">Most Popular</span>
                      )}
                    </div>
                    {p.savings && <p className="text-xs text-emerald-600 font-semibold mt-0.5">{p.savings}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-900">{p.price}</p>
                  <p className="text-xs text-slate-400">{p.per}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="px-5 pb-5">
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="w-full rounded-2xl bg-gradient-to-r from-[#002046] to-[#003a80] px-6 py-4 text-sm font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {subscribing ? 'Processing...' : `Subscribe to ${plan?.label} — ${plan?.price}`}
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-2">Cancel anytime. No hidden charges.</p>
          </div>
        </div>

        {/* Compare free vs premium */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Free vs Premium</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { feature: 'Seat selection', free: 'Standard', premium: 'Priority access' },
              { feature: 'Cancellation fee', free: 'Up to 75% charge', premium: 'Zero fees' },
              { feature: 'Ticket download', free: 'Within 30 min', premium: 'Instant' },
              { feature: 'Support response', free: '24–48 hours', premium: 'Under 2 hours' },
              { feature: 'Route discounts', free: 'None', premium: 'Up to 15%' },
              { feature: 'Trip alerts', free: 'Basic', premium: 'Real-time' },
            ].map((row) => (
              <div key={row.feature} className="grid grid-cols-3 px-5 py-3 text-sm">
                <span className="text-slate-600 font-medium">{row.feature}</span>
                <span className="text-slate-400">{row.free}</span>
                <span className="text-[#002046] font-semibold">{row.premium}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </UserLayout>
  );
};

export default UserPremium;
