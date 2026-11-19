import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../../config/env';
import { ROUTES } from '../../../shared/constants/routes';
import { RESEND_SECONDS, isValidEmail, linkCls, useCountdown } from '../utils/registerForm';
import AuthSplitLayout from './AuthSplitLayout';
import { FormAlert, SubmitButton, TextField } from './RegisterFormParts';

const RATE_LIMIT_WAIT_SECONDS = 60; // backend /auth/forgot-password allows 3 requests per minute
const RATE_LIMIT_MESSAGE = 'Too many requests. Please wait a minute and try again.';

const BackToLogin = ({ onClick }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary transition-colors"
  >
    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
    Back to sign in
  </button>
);

const DesktopForgotPasswordForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [lockedFor, setLockedFor] = useCountdown();
  const [resendIn, setResendIn] = useCountdown();

  // Rate-limit message clears itself when the countdown ends
  const visibleFormError = formError === RATE_LIMIT_MESSAGE && lockedFor === 0 ? '' : formError;

  const requestReset = async (address) => {
    setFormError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `email=${encodeURIComponent(address)}`,
      });
      if (response.ok) {
        setSentTo(address);
        setResendIn(RESEND_SECONDS);
      } else if (response.status === 429) {
        setLockedFor(RATE_LIMIT_WAIT_SECONDS);
        setFormError(RATE_LIMIT_MESSAGE);
      } else {
        const data = await response.json().catch(() => ({}));
        setFormError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setFormError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (lockedFor > 0) return;
    if (!email.trim()) { setError('Email is required'); return; }
    if (!isValidEmail(email)) { setError('Enter a valid email address'); return; }
    requestReset(email.trim());
  };

  const goToLogin = () => navigate(ROUTES.LOGIN, { state: location.state });

  return (
    <AuthSplitLayout
      narrow
      headline={['Locked out?', 'We’ll get you back.']}
      intro="Enter the email on your account and we’ll send you a secure link to set a new password."
      cards={[
        { icon: 'timer', title: 'Link valid for 15 minutes', sub: 'For your security, each reset link works once and expires quickly.' },
        { icon: 'devices', title: 'Signed out everywhere', sub: 'After a reset, other devices are signed out so only you have access.' },
      ]}
    >
      {sentTo ? (
        <div className="text-center py-2">
          <span className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-[#FDBA74]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-orange-600">mark_email_unread</span>
          </span>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Check your email</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            If an account exists for<br />
            <span className="font-bold text-slate-900">{sentTo}</span>,<br />
            we’ve sent a link to reset your password. It expires in 15 minutes.
          </p>

          <FormAlert message={visibleFormError} lockedFor={lockedFor} />

          <p className="mt-6 text-xs text-slate-500">
            Didn&apos;t get it? Check your spam folder, or{' '}
            {resendIn > 0 || lockedFor > 0 ? (
              <span className="font-semibold text-slate-400">resend in {Math.max(resendIn, lockedFor)}s</span>
            ) : (
              <button onClick={() => requestReset(sentTo)} disabled={isLoading} className={`${linkCls} disabled:opacity-60`}>
                {isLoading ? 'sending...' : 'resend the link'}
              </button>
            )}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Wrong email?{' '}
            <button onClick={() => { setSentTo(''); setFormError(''); }} className={linkCls}>Use a different one</button>
          </p>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <BackToLogin onClick={goToLogin} />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-7">
            <span className="mb-5 w-12 h-12 rounded-xl bg-[#FDBA74]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px] text-orange-600">lock_reset</span>
            </span>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Forgot password?</h2>
            <p className="text-sm text-slate-500">No worries — we’ll email you a link to reset it.</p>
          </div>

          <FormAlert message={visibleFormError} lockedFor={lockedFor} />

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <TextField
              id="forgot-email"
              label="Email"
              icon="mail"
              error={error}
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); if (!lockedFor) setFormError(''); }}
            />
            <SubmitButton isLoading={isLoading} lockedFor={lockedFor} label="Send reset link" loadingLabel="Sending..." />
          </form>

          <p className="mt-5 text-xs text-slate-400 text-center">
            Signed up with Google? You don&apos;t have a password — just use “Sign in with Google”.
          </p>

          <div className="mt-7 pt-6 border-t border-slate-100 text-center">
            <BackToLogin onClick={goToLogin} />
          </div>
        </>
      )}
    </AuthSplitLayout>
  );
};

export default DesktopForgotPasswordForm;
