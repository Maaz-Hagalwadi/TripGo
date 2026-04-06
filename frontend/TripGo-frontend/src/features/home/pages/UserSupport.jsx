import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';

const SUPPORT_EMAIL = 'support@tripgo.com';
const SUPPORT_PHONE = '+91 80 4567 1234';

const UserSupport = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'USER') {
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
    <UserLayout activeItem="support" title="Support">
      <div className="space-y-6">
        <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-1">Need Help?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Reach support for booking issues, refunds, payments, and account help.</p>

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
              <p className="font-semibold">How do I modify my trip search?</p>
              <p className="text-slate-500 dark:text-slate-400">Change From, To, and date on Search Results and click Modify.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <p className="font-semibold">Can I update my profile name?</p>
              <p className="text-slate-500 dark:text-slate-400">Yes, use the My Profile option from the top-right menu and save your new name.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <p className="font-semibold">Where can I get booking help?</p>
              <p className="text-slate-500 dark:text-slate-400">Use support email or phone above, and share your booking ID for quick resolution.</p>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default UserSupport;
