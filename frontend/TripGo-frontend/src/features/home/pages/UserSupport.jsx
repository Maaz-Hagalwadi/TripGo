import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { submitSupportTicket } from '../../../api/userService';

const SUPPORT_EMAIL = 'support@tripgo.com';
const SUPPORT_PHONE = '+91 80 4567 1234';

const FAQS = [
  {
    q: 'How do I cancel a booking and get a refund?',
    a: 'Go to My Bookings, select your booking, and click Cancel. Refund eligibility depends on how far in advance you cancel: 75% refund for 24h+, 50% for 12–24h, 25% for 4–12h, and no refund within 4 hours of departure.',
  },
  {
    q: 'How do I download or view my ticket?',
    a: 'Open My Bookings, find your confirmed booking, and use the View Ticket or Download Ticket button. Tickets are available as PDF. If the PDF isn\'t ready yet, a text summary will be provided.',
  },
  {
    q: 'Why is my seat showing as unavailable?',
    a: 'Seats can be temporarily locked by other passengers during the booking process. If seats appear unavailable, refresh the page and try again. Contact support if the issue persists.',
  },
  {
    q: 'How do I modify my trip search?',
    a: 'On the Search Results page, you can update the From, To, and Date fields at the top and click Search to run a new query. You cannot modify a confirmed booking — you would need to cancel and rebook.',
  },
  {
    q: 'Can I update my profile name or phone number?',
    a: 'Yes — go to Settings and click Edit Profile. You can update your first name, last name, and phone number. Email changes are not supported currently.',
  },
  {
    q: 'My payment was deducted but booking shows pending — what should I do?',
    a: 'Payments are confirmed within a few minutes. If your booking still shows Pending after 15 minutes, please contact support with your booking ID and payment reference for manual verification.',
  },
  {
    q: 'How do I rate a completed trip?',
    a: 'Navigate to Ratings & Reviews from the sidebar. Completed trips that haven\'t been rated will appear under the Pending tab. Click the trip card and use the Give Review button to submit your rating.',
  },
];

const CATEGORIES = ['Booking Issue', 'Payment & Refund', 'Cancellation', 'Ticket Download', 'Account & Profile', 'Technical Issue', 'Other'];

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-900">{q}</span>
        <span className={`material-symbols-outlined text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
};

const UserSupport = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [form, setForm] = useState({ subject: '', category: '', message: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'USER') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      toast.success('Email copied to clipboard');
    } catch {
      toast.error('Could not copy email');
    }
  };

  const handleSend = async () => {
    if (!form.subject.trim()) return toast.error('Please enter a subject');
    if (!form.category) return toast.error('Please select a category');
    if (!form.message.trim() || form.message.trim().length < 20) return toast.error('Message must be at least 20 characters');

    setSending(true);
    const t = toast.loading('Sending your message...');
    try {
      await submitSupportTicket({ subject: form.subject.trim(), category: form.category, message: form.message.trim() });
      toast.success("Message sent! We'll reply within 24 hours.", { id: t });
      setForm({ subject: '', category: '', message: '' });
    } catch (e) {
      toast.error(e.message || 'Failed to send message. Please try again.', { id: t });
    } finally {
      setSending(false);
    }
  };

  return (
    <UserLayout activeItem="support" title="Support">
      <div className="space-y-5">

        <div>
          <h1 className="text-2xl font-black text-slate-900">Support</h1>
          <p className="text-sm text-slate-500 mt-0.5">Get help with bookings, payments, and your account</p>
        </div>

        {/* Contact channels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-2">Email Support</p>
            <p className="text-base font-bold">{SUPPORT_EMAIL}</p>
            <p className="text-xs opacity-50 mt-1 mb-4">Typical response within 24 hours</p>
            <button
              onClick={copyEmail}
              className="flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-xs font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span>
              Copy Email
            </button>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-2">Phone Support</p>
            <p className="text-base font-bold">{SUPPORT_PHONE}</p>
            <p className="text-xs opacity-50 mt-1 mb-4">Mon–Sat, 9 AM – 8 PM IST</p>
            <a
              href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-xs font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-sm">call</span>
              Call Now
            </a>
          </div>
        </div>

        {/* Send a message */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Send a Message</h2>
            <p className="text-xs text-slate-500 mt-0.5">Describe your issue and we'll get back to you</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="Brief summary of your issue"
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40 appearance-none"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Message *</label>
              <textarea
                rows={5}
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="Describe your issue in detail. Include your booking ID if relevant."
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40 resize-none"
              />
              <p className="text-[10px] text-slate-400 mt-1 ml-1">{form.message.length} / 1000</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 rounded-2xl bg-[#002046] px-6 py-3 text-sm font-bold text-white hover:bg-[#003a80] disabled:opacity-60 transition-colors"
              >
                <span className="material-symbols-outlined text-base">send</span>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>

        {/* FAQ accordion */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Quick answers to common questions</p>
          </div>
          <div>
            {FAQS.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>

      </div>
    </UserLayout>
  );
};

export default UserSupport;
