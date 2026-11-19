import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../../config/env';
import { ROUTES } from '../../../shared/constants/routes';
import { isPasswordValid } from '../../../shared/utils/passwordRules';
import { parseServerErrors, primaryBtnCls } from '../utils/registerForm';
import AuthSplitLayout from './AuthSplitLayout';
import { FormAlert, PasswordFields, SubmitButton } from './RegisterFormParts';

const StatusCard = ({ icon, iconCls, title, children, action }) => (
  <div className="text-center py-2">
    <span className={`mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center ${iconCls}`}>
      <span className="material-symbols-outlined text-3xl">{icon}</span>
    </span>
    <h2 className="text-2xl font-black text-slate-900 mb-2">{title}</h2>
    <p className="text-sm text-slate-500 leading-relaxed">{children}</p>
    <button onClick={action.onClick} className={`${primaryBtnCls} mt-8`}>
      <span>{action.label}</span><span className="material-symbols-outlined text-[20px]">arrow_forward</span>
    </button>
  </div>
);

const DesktopResetPasswordForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // 'form' | 'done' | 'invalid' (missing/expired/used link) | 'oauth' (Google-only account)
  const [status, setStatus] = useState(token ? 'form' : 'invalid');

  const set = (key) => (e) => {
    setFormData((p) => ({ ...p, [key]: e.target.value }));
    setErrors((p) => ({ ...p, [key === 'newPassword' ? 'password' : key]: '' }));
    setFormError('');
  };

  const validate = () => {
    const e = {};
    if (!formData.newPassword) e.password = 'New password is required';
    else if (!isPasswordValid(formData.newPassword)) e.password = 'Password doesn’t meet all the requirements';
    if (!formData.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (formData.newPassword !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setFormError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: formData.newPassword }),
      });

      if (response.ok) {
        setStatus('done');
        return;
      }
      const data = await response.json().catch(() => ({}));
      const msg = data.message || '';
      if (/oauth/i.test(msg)) setStatus('oauth');
      else if (/invalid|expired|used|token/i.test(msg)) setStatus('invalid');
      else {
        // Backend validation: "newPassword: ..." → show under the password field
        const fieldErrors = parseServerErrors(msg, ['newPassword']);
        if (fieldErrors.newPassword) setErrors({ password: fieldErrors.newPassword });
        else setFormError(msg || 'Password reset failed. Please try again.');
      }
    } catch {
      setFormError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      narrow
      headline={['New password,', 'fresh start.']}
      intro="Choose a strong password you haven’t used before. You’ll use it to sign in from now on."
      cards={[
        { icon: 'devices', title: 'Signed out everywhere', sub: 'Other sessions are signed out once your password changes.' },
        { icon: 'shield_lock', title: 'Strong by design', sub: 'Mix upper and lower case, numbers and a symbol.' },
      ]}
    >
      {status === 'done' && (
        <StatusCard
          icon="check_circle"
          iconCls="bg-green-50 text-green-600"
          title="Password updated"
          action={{ label: 'Sign in', onClick: () => navigate(ROUTES.LOGIN, { replace: true }) }}
        >
          Your password has been changed. Sign in with your new password to continue.
        </StatusCard>
      )}

      {status === 'invalid' && (
        <StatusCard
          icon="link_off"
          iconCls="bg-red-50 text-red-500"
          title="This link doesn’t work"
          action={{ label: 'Request a new link', onClick: () => navigate(ROUTES.FORGOT_PASSWORD) }}
        >
          Reset links expire after 15 minutes and can only be used once. Request a new one and use it right away.
        </StatusCard>
      )}

      {status === 'oauth' && (
        <StatusCard
          icon="account_circle"
          iconCls="bg-[#FDBA74]/20 text-orange-600"
          title="You sign in with Google"
          action={{ label: 'Go to sign in', onClick: () => navigate(ROUTES.LOGIN, { replace: true }) }}
        >
          This account doesn’t have a password. Use “Sign in with Google” on the sign-in page instead.
        </StatusCard>
      )}

      {status === 'form' && (
        <>
          <div className="mb-7">
            <span className="mb-5 w-12 h-12 rounded-xl bg-[#FDBA74]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px] text-orange-600">password</span>
            </span>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Set new password</h2>
            <p className="text-sm text-slate-500">Your new password must be different from before.</p>
          </div>

          <FormAlert message={formError} lockedFor={0} />

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <PasswordFields
              stacked
              password={formData.newPassword}
              confirmPassword={formData.confirmPassword}
              onPassword={set('newPassword')}
              onConfirm={set('confirmPassword')}
              errors={errors}
              passwordLabel="New password"
              confirmLabel="Confirm new password"
              placeholder="Create a new password"
            />
            <SubmitButton isLoading={isLoading} lockedFor={0} label="Reset password" loadingLabel="Updating..." />
          </form>
        </>
      )}
    </AuthSplitLayout>
  );
};

export default DesktopResetPasswordForm;
