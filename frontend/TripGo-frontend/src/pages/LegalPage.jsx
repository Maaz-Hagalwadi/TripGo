import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../shared/components/layout/Header';
import Footer from '../shared/components/layout/Footer';
import { ROUTES } from '../shared/constants/routes';

/*
 * Template legal pages. Text in [square brackets] is a placeholder that must be replaced with
 * real business details before launch — have the final wording reviewed by a legal professional.
 * Statements about how the platform works reflect current backend behaviour.
 */

const COMPANY = '[Company legal name]';
const SUPPORT_EMAIL = '[support@yourdomain.com]';
const EFFECTIVE_DATE = '[Effective date]';

const PAGES = {
  terms: {
    title: 'Terms of Service',
    intro: `These Terms govern your use of TripGo, operated by ${COMPANY}. By creating an account or booking a ticket, you agree to these Terms.`,
    sections: [
      {
        h: 'Our role',
        p: [
          'TripGo is a booking platform. Bus services are provided by independent, verified bus operators. Each operator is responsible for operating the trip, including departure times, vehicle condition and onboard service.',
        ],
      },
      {
        h: 'Accounts',
        p: [
          'You must provide accurate information and keep your login details secure. You are responsible for activity on your account.',
          'We may suspend accounts that misuse the platform or violate these Terms.',
        ],
      },
      {
        h: 'Bookings and payment',
        p: [
          'A booking is confirmed only after payment succeeds and you receive a booking confirmation. Seats are held for a limited time (currently 15 minutes) while you complete payment.',
          'Fares shown include applicable GST. TripGo does not charge a separate booking fee. Payments are processed by Stripe.',
        ],
      },
      {
        h: 'Cancellations, refunds and date changes',
        p: ['These are governed by the operator’s policy for each trip and by our Refund & Cancellation Policy.'],
        link: { to: ROUTES.REFUND_POLICY, label: 'Read the Refund & Cancellation Policy' },
      },
      {
        h: 'Travel rules',
        p: [
          'Carry your ticket (on your phone or printed) and a valid photo ID. Follow the operator’s rules on luggage, children, pets, liquor and smoking, which are shown on each bus before booking.',
        ],
      },
      {
        h: 'Reviews',
        p: [
          'Only passengers who completed a trip can leave a review. We may hide reviews that are abusive, misleading or unrelated to the trip.',
        ],
      },
      {
        h: 'Liability',
        p: [`[Describe the limits of ${COMPANY}’s liability, e.g. for delays, cancellations or incidents caused by operators.]`],
      },
      {
        h: 'Governing law',
        p: ['[State the governing law and jurisdiction, e.g. the courts of your city, India.]'],
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    intro: `This policy explains what personal data ${COMPANY} collects when you use TripGo, how we use it, and your choices.`,
    sections: [
      {
        h: 'What we collect',
        p: [
          'Account details: your name, email address, phone number and, if you add one, a profile picture. If you sign in with Google, we receive your basic Google profile information.',
          'Booking details: routes, travel dates, seats, passenger information you enter, and booking history.',
          'Payment details are entered directly with Stripe. TripGo does not store your card number.',
          'Technical data such as IP address, used for security, fraud prevention and rate limiting.',
        ],
      },
      {
        h: 'How we use it',
        p: [
          'To create and manage your bookings, send confirmations, reminders and refund updates, provide support, prevent fraud, and improve the service.',
        ],
      },
      {
        h: 'Who we share it with',
        p: [
          'The bus operator for your trip (passenger and booking details needed to run the trip), Stripe (payments), and service providers that help us run TripGo, such as email delivery and secure file storage for tickets. We do not sell your personal data.',
        ],
      },
      {
        h: 'Data retention',
        p: ['[State how long you keep account and booking data, and why.]'],
      },
      {
        h: 'Your rights',
        p: [
          `You can view and update your profile in Settings. To request a copy or deletion of your data, contact us at ${SUPPORT_EMAIL}.`,
        ],
      },
      {
        h: 'Cookies and local storage',
        p: [
          'We use your browser’s storage to keep you signed in and to remember preferences such as your recent searches.',
          'To understand how TripGo is used, we record the pages you visit, the site or link that brought you here, and your screen size. This is tied to a random visitor ID stored in your browser and, when you’re signed in, to your account. We don’t store your IP address. We skip this if your browser sends “Do Not Track”, and we delete visit records after 180 days.',
        ],
      },
    ],
  },

  refund: {
    title: 'Refund & Cancellation Policy',
    intro: 'This policy explains how cancellations, refunds and date changes work on TripGo.',
    sections: [
      {
        h: 'Cancelling a booking',
        p: [
          'You can cancel a confirmed booking from My bookings before departure.',
          'The refund amount depends on the cancellation policy set by the bus operator for that trip. The policy is shown on each bus before you pay — generally, the earlier you cancel, the larger the refund.',
        ],
      },
      {
        h: 'If the operator cancels',
        p: ['If the operator or TripGo cancels your trip, you receive a full refund of the amount you paid.'],
      },
      {
        h: 'How refunds are paid',
        p: [
          'Refunds are made to your original payment method through Stripe. Once initiated, they usually reach your account within 5–7 business days, depending on your bank. You can track refund status in My bookings.',
        ],
      },
      {
        h: 'Changing your travel date',
        p: [
          'If the operator allows date changes for a trip, you can reschedule online before the operator’s cutoff (often 12 hours before departure). A date-change fee set by the operator may apply. These rules are shown in the bus policies before booking.',
        ],
      },
      {
        h: 'Missed buses and no-shows',
        p: ['[State your policy for passengers who miss the bus or do not show up.]'],
      },
      {
        h: 'Contact',
        p: [`Questions about a refund? Contact us at ${SUPPORT_EMAIL} with your booking code.`],
      },
    ],
  },
};

const LegalPage = ({ type }) => {
  const page = PAGES[type];

  useEffect(() => {
    document.title = `${page.title} - TripGo`;
    window.scrollTo(0, 0);
  }, [page.title]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        {import.meta.env.DEV && (
          <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Template:</strong> replace every <code>[placeholder]</code> with your real business details and have
            the final text reviewed before launch. This notice only shows in development.
          </div>
        )}

        <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Legal</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-black text-slate-900">{page.title}</h1>
        <p className="mt-2 text-sm text-slate-400">Effective {EFFECTIVE_DATE}</p>
        <p className="mt-6 text-base text-slate-600 leading-relaxed">{page.intro}</p>

        <div className="mt-10 space-y-8">
          {page.sections.map((section) => (
            <section key={section.h}>
              <h2 className="text-lg font-black text-slate-900">{section.h}</h2>
              {section.p.map((para) => (
                <p key={para} className="mt-2 text-sm text-slate-600 leading-relaxed">{para}</p>
              ))}
              {section.link && (
                <Link to={section.link.to} className="mt-2 inline-block text-sm font-semibold text-primary hover:text-[#FF8A65] transition-colors">
                  {section.link.label} →
                </Link>
              )}
            </section>
          ))}
        </div>

        <p className="mt-12 pt-6 border-t border-slate-100 text-sm text-slate-500">
          Questions? Email {SUPPORT_EMAIL}.
        </p>
      </main>

      <Footer />
    </div>
  );
};

export default LegalPage;
