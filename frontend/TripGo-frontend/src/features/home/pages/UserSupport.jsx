import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { submitSupportTicket } from '../../../api/userService';

// Must match the backend's SUPPORT_EMAIL (where tickets from this form are delivered)
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@tripgo.com';
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 1000;

const FAQS = [
  {
    q: 'How do I cancel a booking and get a refund?',
    a: 'Go to My bookings and click Cancel on the trip. Your refund follows that bus’s cancellation policy — the earlier you cancel, the more you get back. You’ll see the exact rules and your estimated refund before you confirm. Refunds go back to your original payment method within 5–7 business days.',
  },
  {
    q: 'Can I change my travel date?',
    a: 'If the operator allows it, use Change date on the booking in My bookings — no need to cancel and rebook. Date changes close a set number of hours before departure (shown on the button), and the operator may charge a fee.',
  },
  {
    q: 'How do I download or view my ticket?',
    a: 'Open My bookings and use Download ticket or View on your booking. Just show the QR code on your phone when boarding — no printout needed.',
  },
  {
    q: 'Why is a seat showing as unavailable?',
    a: 'Seats are held for 15 minutes while another traveller completes payment. If the seat you want is held, try again in a few minutes or pick another seat.',
  },
  {
    q: 'My payment was deducted but the booking shows pending — what should I do?',
    a: 'Payments usually confirm within a minute or two. If your booking still shows Payment pending after 15 minutes, send us a message below with your booking ID so we can check it.',
  },
  {
    q: 'Can I update my name or phone number?',
    a: 'Yes — go to Settings and click Edit profile. Your email address can’t be changed.',
  },
  {
    q: 'How do I rate a completed trip?',
    a: 'Open Ratings from the sidebar. Trips waiting for your review appear under To rate — tap the stars to leave a rating and an optional review.',
  },
];

const CATEGORIES = ['Booking issue', 'Payment & refund', 'Cancellation', 'Date change', 'Ticket', 'Account & profile', 'Technical problem', 'Other'];

const QUICK_LINKS = [
  { icon: 'confirmation_number', title: 'Manage a booking', sub: 'Download tickets, change date or cancel', to: ROUTES.USER_BOOKINGS },
  { icon: 'currency_exchange', title: 'Refund & cancellation policy', sub: 'How refunds are calculated', to: ROUTES.REFUND_POLICY },
  { icon: 'manage_accounts', title: 'Account settings', sub: 'Profile, password and saved travellers', to: ROUTES.USER_SETTINGS },
];

const inputCls = 'w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-[#FF8A65] focus:ring-4 focus:ring-[#FDBA74]/25 transition-all';

const FaqItem = ({ q, a, open, onToggle, id }) => (
  <div className={`border-b border-slate-100 last:border-0 transition-colors ${open ? 'bg-[#FFF7F2]' : ''}`}>
    <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-panel`}
      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
      <span className={`text-sm font-semibold ${open ? 'text-primary' : 'text-slate-800'}`}>{q}</span>
      <span className={`material-symbols-outlined flex-shrink-0 ${open ? 'text-[#FF8A65]' : 'text-slate-400'}`}>{open ? 'remove' : 'add'}</span>
    </button>
    {open && <p id={`${id}-panel`} className="px-5 pb-4 pr-12 text-sm text-slate-600 leading-relaxed">{a}</p>}
  </div>
);

const UserSupport = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ subject: '', category: '', message: '' });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'USER') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  const set = (key) => (e) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
    setErrors((p) => ({ ...p, [key]: '' }));
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      toast.success('Email address copied');
    } catch {
      toast.error(`Couldn’t copy — the address is ${SUPPORT_EMAIL}`);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.subject.trim()) next.subject = 'Add a short subject';
    if (!form.category) next.category = 'Choose a category';
    if (form.message.trim().length < MESSAGE_MIN) next.message = `Please describe the issue in at least ${MESSAGE_MIN} characters`;
    setErrors(next);
    if (Object.keys(next).length) return;

    setSending(true);
    try {
      await submitSupportTicket({ subject: form.subject.trim(), category: form.category, message: form.message.trim() });
      setSent(true);
      setForm({ subject: '', category: '', message: '' });
    } catch (err) {
      toast.error(err.message || 'We couldn’t send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <UserLayout activeItem="support" title="Support" showHeaderTitle={false} showHeaderSearch={false}>
      <div className="space-y-6">

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">How can we help?</h1>
          <p className="text-sm text-slate-500 mt-1">Most questions are answered below. If not, send us a message and we’ll reply by email.</p>
        </div>

        {/* Quick links */}
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map((l) => (
            <Link key={l.title} to={l.to} className="group flex items-center gap-3 rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm hover:border-[#FDBA74] transition-colors">
              <span className="w-10 h-10 flex-shrink-0 rounded-xl bg-[#FDBA74]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-orange-600">{l.icon}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{l.title}</p>
                <p className="text-xs text-slate-500 truncate">{l.sub}</p>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-[#FF8A65]">chevron_right</span>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] items-start">

          {/* FAQ */}
          <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900">Frequently asked questions</h2>
            </div>
            {FAQS.map((faq, i) => (
              <FaqItem key={faq.q} id={`support-faq-${i}`} q={faq.q} a={faq.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </section>

          <div className="space-y-6">
            {/* Message form */}
            <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-base font-black text-slate-900">Send us a message</h2>
                <p className="text-xs text-slate-500 mt-0.5">We’ll reply to {user?.email || 'your email'}, usually within 24 hours.</p>
              </div>

              {sent ? (
                <div className="p-8 text-center">
                  <span className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-green-600">mark_email_read</span>
                  </span>
                  <p className="font-black text-slate-900">Message sent</p>
                  <p className="mt-1 text-sm text-slate-500">Thanks — we’ll get back to you by email.</p>
                  <button onClick={() => setSent(false)} className="mt-5 text-sm font-bold text-primary hover:text-[#FF8A65] transition-colors">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSend} className="p-5 space-y-4" noValidate>
                  <div>
                    <label htmlFor="support-category" className="block text-sm font-semibold text-slate-900 mb-1.5">Topic</label>
                    <select id="support-category" value={form.category} onChange={set('category')} className={`${inputCls} ${errors.category ? 'border-red-500' : ''}`}>
                      <option value="">Choose a topic</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
                  </div>
                  <div>
                    <label htmlFor="support-subject" className="block text-sm font-semibold text-slate-900 mb-1.5">Subject</label>
                    <input id="support-subject" type="text" maxLength={120} value={form.subject} onChange={set('subject')}
                      placeholder="e.g. Refund not received for TG-8F3K2Q" className={`${inputCls} ${errors.subject ? 'border-red-500' : ''}`} />
                    {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject}</p>}
                  </div>
                  <div>
                    <label htmlFor="support-message" className="block text-sm font-semibold text-slate-900 mb-1.5">Message</label>
                    <textarea id="support-message" rows={5} maxLength={MESSAGE_MAX} value={form.message} onChange={set('message')}
                      placeholder="What happened? Include your booking ID if it’s about a trip."
                      className={`${inputCls} resize-none ${errors.message ? 'border-red-500' : ''}`} />
                    <div className="mt-1 flex justify-between gap-2">
                      <p className="text-xs text-red-600">{errors.message}</p>
                      <p className="text-xs text-slate-400 flex-shrink-0">{form.message.length} / {MESSAGE_MAX}</p>
                    </div>
                  </div>
                  <button type="submit" disabled={sending}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-60 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    {sending ? 'Sending...' : 'Send message'}
                  </button>
                </form>
              )}
            </section>

            {/* Email */}
            <section className="rounded-2xl bg-primary p-5 text-white relative overflow-hidden">
              <div className="absolute -bottom-16 -right-10 w-48 h-48 rounded-full bg-[#FF8A65]/20 blur-3xl" aria-hidden="true" />
              <div className="relative flex items-center gap-4">
                <span className="w-11 h-11 flex-shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#FDBA74]">mail</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-300">Prefer email?</p>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="block font-bold truncate hover:text-[#FDBA74] transition-colors">{SUPPORT_EMAIL}</a>
                </div>
                <button onClick={copyEmail} aria-label="Copy email address" className="w-9 h-9 flex-shrink-0 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default UserSupport;
