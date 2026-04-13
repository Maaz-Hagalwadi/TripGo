import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import { useAuth } from '../shared/contexts/AuthContext';
import { ROUTES } from '../shared/constants/routes';

const SUPPORT_EMAIL = 'support@tripgo.com';
const SUPPORT_PHONE = '+91 80 4567 1234';

const AdminSupport = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'ADMIN') {
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

  return (
    <AdminLayout activeItemOverride="support" title="Support">
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-op-card">
          <h3 className="mb-1 text-lg font-bold">Admin Support</h3>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Reach support for moderation, operator approvals, platform incidents, and account help.</p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <p className="mb-1 text-xs text-slate-500">Support Email</p>
              <p className="font-semibold">{SUPPORT_EMAIL}</p>
              <button
                onClick={copySupportEmail}
                className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Copy Email
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <p className="mb-1 text-xs text-slate-500">Support Phone</p>
              <p className="font-semibold">{SUPPORT_PHONE}</p>
              <a
                href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
                className="mt-3 inline-block rounded-lg border border-slate-200 px-3 py-1.5 text-xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Call Support
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-op-card">
          <h3 className="mb-3 text-lg font-bold">Quick FAQs</h3>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <p className="font-semibold">How do I review flagged content quickly?</p>
              <p className="text-slate-500 dark:text-slate-400">Use the Reviews page filters to narrow by operator, bus, rating, or visibility before moderating.</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <p className="font-semibold">Where do I approve pending operators and buses?</p>
              <p className="text-slate-500 dark:text-slate-400">Open the admin dashboard overview or the dedicated Operators and Buses tabs for action controls.</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <p className="font-semibold">What should I share when reporting a platform issue?</p>
              <p className="text-slate-500 dark:text-slate-400">Include the affected user, operator, booking ID, and a short summary of what happened for faster resolution.</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSupport;
