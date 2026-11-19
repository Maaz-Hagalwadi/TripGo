import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import Reveal from '../../../shared/components/ui/Reveal';

// Answers mirror backend behaviour: 15-min seat lock, per-operator cancellation slabs and
// date-change rules (cutoff + fee), full refund on operator cancellation, Stripe payments.
const CATEGORIES = [
  {
    id: 'booking',
    label: 'Booking',
    icon: 'confirmation_number',
    faqs: [
      {
        q: 'How do I book a bus ticket on TripGo?',
        a: 'Search your route and date, choose a bus, pick your seat on the seat map, and pay securely. Your seat is held for 15 minutes while you complete payment.',
      },
      {
        q: 'Can I choose my seat?',
        a: 'Yes. Every bus shows a live seat map — pick any available seat, window or aisle, front or back.',
      },
      {
        q: 'Can I change my travel date?',
        a: 'If the operator allows date changes, you can reschedule online before their cutoff time (often 12 hours before departure). A date-change fee set by the operator may apply — you can see these rules in the bus policies before booking.',
      },
      {
        q: 'Are there any booking fees?',
        a: 'No. The price you see is the fare including GST — TripGo does not add a booking or convenience fee.',
      },
    ],
  },
  {
    id: 'tickets',
    label: 'Tickets',
    icon: 'qr_code_2',
    faqs: [
      {
        q: 'How will I get my ticket?',
        a: 'We email you a booking confirmation as soon as payment succeeds. Your QR-coded PDF ticket is also ready to download anytime from My bookings.',
      },
      {
        q: 'Do I need to print my ticket?',
        a: 'No. Just show the QR code on your phone when you board.',
      },
      {
        q: 'Can I track my bus?',
        a: 'Yes. Once your trip is underway, you can follow your bus live from My bookings.',
      },
    ],
  },
  {
    id: 'refunds',
    label: 'Cancellation & Refunds',
    icon: 'currency_exchange',
    faqs: [
      {
        q: 'Can I cancel my booking?',
        a: 'Yes, you can cancel a confirmed booking from My bookings before departure.',
      },
      {
        q: 'How much refund will I get?',
        a: 'It depends on the operator’s cancellation policy, which is shown on every bus before you pay — generally, the earlier you cancel, the more you get back.',
      },
      {
        q: 'What if the operator cancels my trip?',
        a: 'You get a full refund of the amount you paid.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Refunds go back to your original payment method. Once initiated, they usually reach your account within 5–7 business days, depending on your bank. You can track the status in My bookings.',
      },
    ],
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: 'credit_card',
    faqs: [
      {
        q: 'Is my payment secure?',
        a: 'Yes. Payments are processed by Stripe, and TripGo never stores your card details.',
      },
      {
        q: 'Can I use a promo code?',
        a: 'Yes. Copy a code from the Offers section and apply it at the payment step. One code can be used per booking.',
      },
      {
        q: 'My payment failed but money was deducted. What now?',
        a: 'If your booking was not confirmed, the amount is not kept — it is usually reversed by your bank automatically. If it hasn’t appeared after a few business days, contact support with your payment details.',
      },
    ],
  },
];

const FAQItem = ({ item, open, onToggle, id }) => (
  <div className={`border-b border-slate-200 last:border-0 transition-colors ${open ? 'bg-[#FFF7F2]' : 'bg-white'}`}>
    <h3>
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        id={`${id}-button`}
        className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left"
      >
        <span className={`text-sm sm:text-base font-semibold transition-colors ${open ? 'text-primary' : 'text-slate-800'}`}>
          {item.q}
        </span>
        <span
          className={`material-symbols-outlined flex-shrink-0 text-xl transition-colors ${open ? 'text-[#FF8A65]' : 'text-slate-400'}`}
        >
          {open ? 'remove' : 'add'}
        </span>
      </button>
    </h3>
    <div
      id={`${id}-panel`}
      role="region"
      aria-labelledby={`${id}-button`}
      className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
    >
      <div className="overflow-hidden">
        <p className="px-5 sm:px-6 pb-5 pr-12 text-sm text-slate-600 leading-relaxed">{item.a}</p>
      </div>
    </div>
  </div>
);

const FAQSection = () => {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [openIndex, setOpenIndex] = useState(0);
  const category = CATEGORIES.find((c) => c.id === activeCategory);

  const selectCategory = (id) => {
    setActiveCategory(id);
    setOpenIndex(0);
  };

  return (
    <section id="faq" className="py-12 md:py-16 bg-white border-t border-slate-100">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">

        <Reveal className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">Frequently asked questions</h2>
          <p className="text-slate-500 text-sm mt-2">Everything you need to know before you book</p>
        </Reveal>

        {/* Category tabs */}
        <Reveal delay={80} className="flex gap-2 overflow-x-auto pb-1 mb-6 md:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => {
            const active = c.id === activeCategory;
            return (
              <button
                key={c.id}
                onClick={() => selectCategory(c.id)}
                aria-pressed={active}
                className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold border transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] border-transparent text-primary shadow-[0_6px_16px_rgba(255,138,101,0.3)]'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-[#FDBA74] hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{c.icon}</span>
                {c.label}
              </button>
            );
          })}
        </Reveal>

        {/* Questions */}
        <Reveal delay={140} className="max-w-4xl mx-auto rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {category.faqs.map((item, i) => (
            <FAQItem
              key={item.q}
              id={`faq-${category.id}-${i}`}
              item={item}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </Reveal>

        <p className="text-center text-sm text-slate-500 mt-6">
          Still have questions?{' '}
          <Link to={ROUTES.USER_SUPPORT} className="font-semibold text-primary hover:text-[#FF8A65] transition-colors">
            Contact support
          </Link>
          {' · '}
          <Link to={ROUTES.REFUND_POLICY} className="font-semibold text-primary hover:text-[#FF8A65] transition-colors">
            Refund &amp; Cancellation Policy
          </Link>
        </p>

      </div>
    </section>
  );
};

export default FAQSection;
