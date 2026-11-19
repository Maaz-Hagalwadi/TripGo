import { useEffect, useState } from 'react';

// Shared by the traveller and operator registration forms.

export const RATE_LIMIT_WAIT_SECONDS = 60; // backend /auth/register bucket refills over one minute
export const RESEND_SECONDS = 30;
const RATE_LIMIT_MESSAGE = 'Too many attempts. Please wait a minute and try again.';

export const inputCls = (err) =>
  `w-full pl-12 pr-4 py-3.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-[#FDBA74]/25 focus:border-[#FF8A65] transition-all outline-none ${
    err ? 'border-red-500' : 'border-slate-200'
  }`;

export const primaryBtnCls =
  'w-full py-4 px-6 bg-[#0B1F3A] text-white text-sm font-bold rounded-xl hover:bg-[#102A4C] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_14px_30px_rgba(11,31,58,0.22)]';

export const linkCls = 'font-bold text-primary hover:text-[#FF8A65] transition-colors';

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Backend expects exactly 10 digits — accept pasted formats like "+91 98765 43210" or "098765 43210". */
export const normalizePhone = (value) => {
  let digits = value.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
};

/**
 * Backend validation errors arrive as "field: message, field: message";
 * duplicate checks arrive as "Email already in use" / "Phone already in use".
 */
export const parseServerErrors = (message = '', fieldNames = []) => {
  const fieldErrors = {};
  message.split(/,\s(?=\w+:)/).forEach((part) => {
    const match = part.match(/^(\w+):\s*(.+)$/);
    if (match && fieldNames.includes(match[1])) fieldErrors[match[1]] = match[2];
  });
  if (/email already (in use|used)/i.test(message)) fieldErrors.email = 'An account with this email already exists';
  if (/phone already (in use|used)/i.test(message)) fieldErrors.phone = 'An account with this phone number already exists';
  return fieldErrors;
};

/** Seconds-remaining countdown: [secondsLeft, start(seconds)]. */
export const useCountdown = () => {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft];
};

/**
 * Submit / error / lockout / resend flow shared by both signup forms.
 * `endpoint` is the API path; `fieldNames` are the form fields backend errors can map to.
 */
export const useRegistration = ({ apiBaseUrl, endpoint, fieldNames, setErrors }) => {
  const [formError, setFormError] = useState('');
  const [lockedFor, setLockedFor] = useCountdown();
  const [isLoading, setIsLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendIn, setResendIn] = useCountdown();
  const [isResending, setIsResending] = useState(false);

  const submit = async (payload) => {
    setFormError('');
    setIsLoading(true);
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 90000);
      const res = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(tid);

      if (res.ok) {
        setRegisteredEmail(payload.email);
        setResendIn(RESEND_SECONDS);
        return;
      }
      if (res.status === 429) {
        setLockedFor(RATE_LIMIT_WAIT_SECONDS);
        setFormError(RATE_LIMIT_MESSAGE);
        return;
      }

      const txt = await res.text();
      let message = txt;
      try { message = JSON.parse(txt).message || txt; } catch { /* plain-text body */ }
      const fieldErrors = parseServerErrors(message, fieldNames);
      if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
      else setFormError(message || 'Registration failed. Please try again.');
    } catch (err) {
      setFormError(err.name === 'AbortError' ? 'Request timed out. Please try again.' : 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0 || isResending) return;
    setIsResending(true);
    try {
      await fetch(`${apiBaseUrl}/auth/resend-verification?email=${encodeURIComponent(registeredEmail)}`, { method: 'POST' });
    } catch {
      // success screen stays; user can retry after the cooldown
    } finally {
      setIsResending(false);
      setResendIn(RESEND_SECONDS);
    }
  };

  // The rate-limit message disappears by itself once the lockout countdown ends
  const visibleError = formError === RATE_LIMIT_MESSAGE && lockedFor === 0 ? '' : formError;

  return { submit, resend, formError: visibleError, setFormError, lockedFor, isLoading, registeredEmail, resendIn, isResending };
};
