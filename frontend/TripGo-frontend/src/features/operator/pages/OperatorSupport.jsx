import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import './OperatorDashboard.css';

const SUPPORT_EMAIL = 'support@tripgo.com';
const SUPPORT_PHONE = '+91 80 4567 1234';

const OperatorSupport = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

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

  return (
    <OperatorLayout activeItem="support" title="Support">
      <div className="space-y-6">
        <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-1">Need Help?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Reach our operator support team for routes, schedules, bookings, and payouts.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Support Email</p>
              <p className="font-semibold">{SUPPORT_EMAIL}</p>
              <button
                onClick={copySupportEmail}
                className="mt-3 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Copy Email
              </button>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Support Phone</p>
              <p className="font-semibold">{SUPPORT_PHONE}</p>
              <a
                href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
                className="inline-block mt-3 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Call Support
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-3">Quick FAQs</h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <p className="font-semibold">How do I fix duplicate fare errors?</p>
              <p className="text-slate-500 dark:text-slate-400">Set only one fare per segment + seat type. Edit existing fare instead of adding duplicate.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <p className="font-semibold">Why can’t I assign a driver?</p>
              <p className="text-slate-500 dark:text-slate-400">Add drivers first in Drivers page. Then assign from schedule card using Assign Driver.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <p className="font-semibold">Where can I view bookings and revenue?</p>
              <p className="text-slate-500 dark:text-slate-400">Use Bookings page for booking actions and Earnings page for revenue analytics.</p>
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default OperatorSupport;
