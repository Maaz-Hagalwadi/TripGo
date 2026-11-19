import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import { PASSWORD_RULES } from '../../../shared/utils/passwordRules';
import { inputCls, linkCls, primaryBtnCls } from '../utils/registerForm';

// Building blocks shared by the traveller (DesktopForm) and operator (DesktopOperatorForm) signups.

export const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export const Field = ({ id, label, icon, error, children }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="text-sm font-semibold text-slate-900">{label}</label>
    <div className="relative">
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">{icon}</span>
      {children}
    </div>
    {error && <p className="text-red-600 text-xs">{error}</p>}
  </div>
);

export const TextField = ({ id, label, icon, error, className = '', ...inputProps }) => (
  <Field id={id} label={label} icon={icon} error={error}>
    <input id={id} className={`${inputCls(error)} ${className}`} {...inputProps} />
  </Field>
);

export const SectionLabel = ({ children }) => (
  <p className="pt-1 text-xs font-bold text-slate-400 uppercase tracking-widest">{children}</p>
);

export const FormAlert = ({ message, lockedFor }) =>
  message ? (
    <div role="alert" className="mb-7 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
      <span className="material-symbols-outlined text-red-500 text-[20px] mt-0.5">{lockedFor > 0 ? 'timer' : 'error'}</span>
      <div className="text-sm text-red-700">
        <p className="font-semibold">{message}</p>
        {lockedFor > 0 && <p className="mt-0.5 text-red-600">You can try again in {lockedFor}s.</p>}
      </div>
    </div>
  ) : null;

export const AccountTypeToggle = ({ active }) => {
  const navigate = useNavigate();
  const options = [
    { id: 'traveller', label: 'Traveller', icon: 'person', to: ROUTES.REGISTER },
    { id: 'operator', label: 'Operator', icon: 'directions_bus', to: ROUTES.OPERATOR_REGISTER },
  ];
  return (
    <div className="flex p-1 bg-slate-100 rounded-xl mb-7 gap-1">
      {options.map((o) => {
        const isActive = o.id === active;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => !isActive && navigate(o.to)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              isActive ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'
            }`}
          >
            <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[#FF8A65]' : ''}`}>{o.icon}</span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

/** Password + confirm side by side; the requirements list appears while typing until all rules pass. */
export const PasswordFields = ({
  password, confirmPassword, onPassword, onConfirm, errors,
  passwordLabel = 'Password', confirmLabel = 'Confirm password', placeholder = 'Create a password',
  stacked = false, // one column, for narrow cards
}) => {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const started = password.length > 0;
  const allMet = PASSWORD_RULES.every((r) => r.test(password));
  const showRules = focused || (started && !allMet) || Boolean(errors.password);

  return (
    <>
      <div className={`grid grid-cols-1 gap-5 ${stacked ? '' : 'sm:grid-cols-2'}`}>
        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="text-sm font-semibold text-slate-900">{passwordLabel}</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">lock</span>
            <input
              id="reg-password"
              name="new-password"
              autoComplete="new-password"
              aria-describedby="reg-password-rules"
              className={`${inputCls(errors.password)} pr-12`}
              placeholder={placeholder}
              type={show ? 'text' : 'password'}
              value={password}
              onChange={onPassword}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide passwords' : 'Show passwords'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">{show ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          {errors.password && <p className="text-red-600 text-xs">{errors.password}</p>}
          {started && allMet && !focused && (
            <p className="flex items-center gap-1 text-xs text-green-700">
              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Strong password
            </p>
          )}
        </div>
        <TextField
          id="reg-confirm"
          label={confirmLabel}
          icon="lock"
          error={errors.confirmPassword}
          name="confirm-password"
          autoComplete="new-password"
          placeholder="Re-enter password"
          type={show ? 'text' : 'password'}
          value={confirmPassword}
          onChange={onConfirm}
        />
      </div>

      {/* Live requirements — same rules as the backend */}
      <div className={`grid transition-all duration-300 ${showRules ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 !mt-0'}`}>
        {/* min-h-0 wrapper lets the 0fr row collapse fully — padding/border live on the inner list */}
        <div className="overflow-hidden min-h-0">
        <ul id="reg-password-rules" className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
          {PASSWORD_RULES.map((rule) => {
            const ok = started && rule.test(password);
            return (
              <li key={rule.id} className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? 'text-green-700' : 'text-slate-500'}`}>
                <span className="material-symbols-outlined text-[15px]" style={ok ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {ok ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                {rule.label}
              </li>
            );
          })}
        </ul>
        </div>
      </div>
    </>
  );
};

export const TermsCheckbox = ({ id, checked, onChange, error }) => (
  <div>
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 w-5 h-5 rounded border-slate-300 cursor-pointer text-primary focus:ring-[#FDBA74]"
      />
      <label htmlFor={id} className="text-sm text-slate-500 leading-relaxed select-none cursor-pointer">
        I agree to the{' '}
        <Link to={ROUTES.TERMS} target="_blank" rel="noopener noreferrer" className={linkCls}>Terms of Service</Link>
        {' '}and{' '}
        <Link to={ROUTES.PRIVACY} target="_blank" rel="noopener noreferrer" className={linkCls}>Privacy Policy</Link>.
      </label>
    </div>
    {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
  </div>
);

export const SubmitButton = ({ isLoading, lockedFor, label, loadingLabel }) => (
  <button type="submit" disabled={isLoading || lockedFor > 0} className={primaryBtnCls}>
    {lockedFor > 0 ? (
      <span>Try again in {lockedFor}s</span>
    ) : isLoading ? (
      <><Spinner />{loadingLabel}</>
    ) : (
      <><span>{label}</span><span className="material-symbols-outlined text-[20px]">arrow_forward</span></>
    )}
  </button>
);

export const GoogleButton = ({ onClick }) => (
  <>
    <div className="relative my-7">
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
      <div className="relative flex justify-center">
        <span className="px-4 bg-white text-slate-400 text-xs font-medium">Or continue with</span>
      </div>
    </div>
    <button
      onClick={onClick}
      className="w-full bg-white border border-slate-200 text-slate-900 py-3.5 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all flex justify-center items-center gap-3"
    >
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      Continue with Google
    </button>
  </>
);

export const SignInPrompt = ({ onClick }) => (
  <p className="mt-7 text-center text-sm text-slate-500">
    Already have an account?{' '}
    <button onClick={onClick} className={`ml-1 ${linkCls}`}>Sign in</button>
  </p>
);

/** Shown after a successful signup: verify email (and, for operators, wait for approval). */
export const VerifyEmailSuccess = ({ email, title, steps, onSignIn, onResend, resendIn, isResending }) => (
  <div className="text-center py-4">
    <span className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-[#FDBA74]/20 flex items-center justify-center">
      <span className="material-symbols-outlined text-3xl text-orange-600">mark_email_unread</span>
    </span>
    <h2 className="text-2xl font-black text-slate-900 mb-2">{title}</h2>
    <p className="text-sm text-slate-500 leading-relaxed">
      We sent a verification link to<br />
      <span className="font-bold text-slate-900">{email}</span>
    </p>

    <ol className="mt-6 space-y-3 text-left max-w-sm mx-auto">
      {steps.map((step, i) => (
        <li key={step} className="flex items-start gap-3 text-sm text-slate-600">
          <span className="w-6 h-6 flex-shrink-0 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
          {step}
        </li>
      ))}
    </ol>

    <button onClick={onSignIn} className={`${primaryBtnCls} mt-8`}>
      <span>Go to sign in</span><span className="material-symbols-outlined text-[20px]">arrow_forward</span>
    </button>

    <p className="mt-5 text-xs text-slate-500">
      Didn&apos;t get it? Check your spam folder, or{' '}
      {resendIn > 0 ? (
        <span className="font-semibold text-slate-400">resend in {resendIn}s</span>
      ) : (
        <button onClick={onResend} disabled={isResending} className={`${linkCls} disabled:opacity-60`}>
          {isResending ? 'sending...' : 'resend the email'}
        </button>
      )}
    </p>
  </div>
);
