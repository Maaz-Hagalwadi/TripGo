import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import { useAuth } from '../shared/contexts/AuthContext';
import { ROUTES } from '../shared/constants/routes';

const SUPPORT_EMAIL = 'support@tripgo.com';
const SUPPORT_PHONE = '+91 80 4567 1234';

const InfoCard = ({ icon, title, children }) => (
  <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
      <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[#002046] text-lg">{icon}</span>
      </div>
      <p className="text-sm font-black text-slate-900">{title}</p>
    </div>
    <div className="px-5 py-5">{children}</div>
  </div>
);

const AdminSupport = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'ADMIN') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  const copySupportEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      toast.success('Support email copied');
    } catch {
      toast.error('Could not copy email');
    }
  };

  return (
    <AdminLayout activeItemOverride="support" title="Support">
      <div className="space-y-5">

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-5 py-5 text-white shadow-sm relative overflow-hidden">
          <div className="absolute -top-3 -right-3 text-7xl opacity-10 select-none">★</div>
          <p className="text-[10px] font-semibold opacity-60 uppercase tracking-widest mb-1">Admin</p>
          <h1 className="text-2xl font-black">Support</h1>
          <p className="text-sm opacity-70 mt-1">Reach support for moderation, operator approvals, platform incidents, and account help.</p>
        </div>

        {/* Contact info */}
        <div className="grid gap-5 md:grid-cols-2">
          <InfoCard icon="mail" title="Support Email">
            <p className="text-lg font-black text-slate-900">{SUPPORT_EMAIL}</p>
            <button
              onClick={copySupportEmail}
              className="mt-4 flex items-center gap-2 rounded-xl bg-[#002046] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003a80] transition-colors"
            >
              <span className="material-symbols-outlined text-base">content_copy</span>
              Copy Email
            </button>
          </InfoCard>

          <InfoCard icon="phone" title="Support Phone">
            <p className="text-lg font-black text-slate-900">{SUPPORT_PHONE}</p>
            <a
              href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <span className="material-symbols-outlined text-base">call</span>
              Call Support
            </a>
          </InfoCard>
        </div>

        {/* FAQs */}
        <InfoCard icon="help" title="Quick FAQs">
          <div className="space-y-3">
            {[
              {
                q: 'How do I review flagged content quickly?',
                a: 'Use the Reviews page filters to narrow by operator, bus, rating, or visibility before moderating.',
              },
              {
                q: 'Where do I approve pending operators and buses?',
                a: 'Open the admin dashboard overview or the dedicated Operators and Buses tabs for action controls.',
              },
              {
                q: 'What should I share when reporting a platform issue?',
                a: 'Include the affected user, operator, booking ID, and a short summary of what happened for faster resolution.',
              },
            ].map((faq) => (
              <div key={faq.q} className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
                <p className="font-bold text-slate-900 text-sm">{faq.q}</p>
                <p className="mt-1 text-sm text-slate-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </InfoCard>

      </div>
    </AdminLayout>
  );
};

export default AdminSupport;
