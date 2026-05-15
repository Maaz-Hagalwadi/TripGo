import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';

const SUPPORT_EMAIL = 'support@tripgo.com';
const SUPPORT_PHONE = '+91 80 4567 1234';

const FAQS = [
  {
    id: 1,
    question: 'How do I fix duplicate fare errors?',
    answer:
      'Set only one fare per segment + seat type. Edit an existing fare instead of adding a duplicate entry for the same combination.',
  },
  {
    id: 2,
    question: "Why can't I assign a driver?",
    answer:
      'Add drivers first on the Drivers page. Then assign them from the schedule card using the Assign Driver option.',
  },
  {
    id: 3,
    question: 'Where can I view bookings and revenue?',
    answer:
      'Use the Bookings page for booking actions and the Earnings page for full revenue analytics.',
  },
  {
    id: 4,
    question: 'How do I cancel or modify a schedule?',
    answer:
      'Go to Routes, open the relevant route, and select the schedule you want to edit. Changes apply to future departures only.',
  },
  {
    id: 5,
    question: 'Why is my bus showing as pending approval?',
    answer:
      'All newly created buses require admin verification before going live. Approval typically takes 1–2 business days.',
  },
];

const OperatorSupport = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') {
      navigate(ROUTES.HOME);
    }
  }, [user, loading, navigate]);

  const copySupportEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      toast.success('Support email copied');
    } catch {
      toast.error('Could not copy email');
    }
  };

  const toggleFaq = (id) => setOpenFaq((prev) => (prev === id ? null : id));

  if (loading) {
    return (
      <OperatorLayout activeItem="support" title="Support">
        <div className="flex items-center justify-center py-20">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout activeItem="support" title="Support">
      <div className="space-y-5">

        {/* Page Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Support</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Get help with routes, schedules, bookings, and payouts.
            </p>
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="rounded-2xl bg-[#002046] text-white px-4 sm:px-5 py-2.5 text-sm font-bold hover:bg-[#003a80] transition-colors shadow-sm"
          >
            Email Us
          </a>
        </div>

        {/* Contact Card */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
          {/* Card Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#002046] text-lg">headset_mic</span>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Contact Support</p>
              <p className="text-xs text-slate-400 mt-0.5">Reach our operator support team</p>
            </div>
          </div>

          {/* Email row */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-slate-500 text-base">mail</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Support Email
              </p>
              <p className="text-sm font-bold text-slate-900 truncate">{SUPPORT_EMAIL}</p>
            </div>
            <button
              onClick={copySupportEmail}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span>
              Copy
            </button>
          </div>

          {/* Phone row */}
          <div className="flex items-center gap-3 px-5 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-slate-500 text-base">phone</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Support Phone
              </p>
              <p className="text-sm font-bold text-slate-900">{SUPPORT_PHONE}</p>
            </div>
            <a
              href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">call</span>
              Call
            </a>
          </div>
        </div>

        {/* Availability Card */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#002046] text-lg">schedule</span>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Support Hours</p>
              <p className="text-xs text-slate-400 mt-0.5">When we're available</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-slate-500 text-base">today</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Weekdays
              </p>
              <p className="text-sm font-bold text-slate-900">Mon – Fri, 9 AM – 7 PM IST</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Available
            </span>
          </div>

          <div className="flex items-center gap-3 px-5 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-slate-500 text-base">weekend</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Weekends
              </p>
              <p className="text-sm font-bold text-slate-900">Sat – Sun, 10 AM – 4 PM IST</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Limited
            </span>
          </div>
        </div>

        {/* FAQ Card */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#002046] text-lg">quiz</span>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Frequently Asked Questions</p>
              <p className="text-xs text-slate-400 mt-0.5">Common operator questions</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {FAQS.map((faq) => (
              <div key={faq.id}>
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors text-left"
                >
                  <span className="text-sm font-semibold text-slate-800 pr-4">{faq.question}</span>
                  <span className="material-symbols-outlined text-slate-400 text-base flex-shrink-0 transition-transform duration-200"
                    style={{ transform: openFaq === faq.id ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    expand_more
                  </span>
                </button>
                {openFaq === faq.id && (
                  <p className="px-5 pb-4 text-sm text-slate-500 leading-relaxed">{faq.answer}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#002046] text-lg">link</span>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Useful Links</p>
              <p className="text-xs text-slate-400 mt-0.5">Docs, policies, and resources</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 last:border-0">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-slate-500 text-base">description</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Documentation
              </p>
              <a
                href="#"
                className="text-sm font-bold text-[#002046] hover:underline"
              >
                Operator Handbook
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 last:border-0">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-slate-500 text-base">policy</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Policies
              </p>
              <a
                href="#"
                className="text-sm font-bold text-[#002046] hover:underline"
              >
                Cancellation &amp; Refund Policy
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-3.5 last:border-0">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-slate-500 text-base">gavel</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Terms
              </p>
              <a
                href="#"
                className="text-sm font-bold text-[#002046] hover:underline"
              >
                Operator Terms of Service
              </a>
            </div>
          </div>
        </div>

      </div>
    </OperatorLayout>
  );
};

export default OperatorSupport;
