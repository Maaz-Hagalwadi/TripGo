import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../../config/env';
import { ROUTES } from '../../../shared/constants/routes';
import { saveReturnToForOAuth } from '../../../shared/utils/returnTo';
import { isPasswordValid } from '../../../shared/utils/passwordRules';
import { isValidEmail, normalizePhone, useRegistration } from '../utils/registerForm';
import AuthSplitLayout from './AuthSplitLayout';
import {
  AccountTypeToggle, FormAlert, GoogleButton, PasswordFields, SignInPrompt,
  SubmitButton, TermsCheckbox, TextField, VerifyEmailSuccess,
} from './RegisterFormParts';

const FIELD_NAMES = ['firstName', 'lastName', 'email', 'phone', 'password'];

const DesktopForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '', agreeToTerms: false,
  });
  const [errors, setErrors] = useState({});
  const reg = useRegistration({ apiBaseUrl: API_BASE_URL, endpoint: '/auth/register', fieldNames: FIELD_NAMES, setErrors });

  const set = (key) => (e) => {
    let val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (key === 'phone') val = normalizePhone(val);
    setFormData((p) => ({ ...p, [key]: val }));
    setErrors((p) => ({ ...p, [key]: '' }));
    if (!reg.lockedFor) reg.setFormError('');
  };

  const validate = () => {
    const e = {};
    if (!formData.firstName.trim()) e.firstName = 'First name is required';
    if (!formData.lastName.trim()) e.lastName = 'Last name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!isValidEmail(formData.email)) e.email = 'Enter a valid email';
    if (!formData.phone) e.phone = 'Mobile number is required';
    else if (formData.phone.length !== 10) e.phone = 'Enter a 10-digit mobile number';
    if (!formData.password) e.password = 'Password is required';
    else if (!isPasswordValid(formData.password)) e.password = 'Password doesn’t meet all the requirements';
    if (!formData.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!formData.agreeToTerms) e.agreeToTerms = 'Please accept the Terms of Service and Privacy Policy';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    if (reg.lockedFor > 0 || !validate()) return;
    reg.submit({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone,
      password: formData.password,
    });
  };

  const handleGoogle = () => {
    saveReturnToForOAuth(location.state?.returnTo);
    window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
  };

  // Keep the "return to" page when hopping between login and register
  const goToLogin = () => navigate(ROUTES.LOGIN, { state: location.state });

  return (
    <AuthSplitLayout
      headline={['Book your first trip', 'in minutes.']}
      intro="Create a free account to book faster, keep every ticket in one place, and manage your trips anytime."
      cards={[
        { icon: 'event_seat', title: 'Pick your exact seat', sub: 'Choose from a live seat map — window or aisle, front or back.' },
        { icon: 'confirmation_number', title: 'Your tickets in one place', sub: 'QR e-tickets, boarding points and cancellations in My bookings.' },
      ]}
      stats={[['Free', 'account'], ['No', 'booking fees'], ['Stripe', 'secure payments']]}
    >
      {reg.registeredEmail ? (
        <VerifyEmailSuccess
          email={reg.registeredEmail}
          title="Check your inbox"
          steps={['Open the email and click the verification link.', 'Come back and sign in to start booking.']}
          onSignIn={goToLogin}
          onResend={reg.resend}
          resendIn={reg.resendIn}
          isResending={reg.isResending}
        />
      ) : (
        <>
          <div className="mb-7">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Create your account</h2>
            <p className="text-sm text-slate-500">It’s free and takes less than a minute.</p>
          </div>

          <AccountTypeToggle active="traveller" />
          <FormAlert message={reg.formError} lockedFor={reg.lockedFor} />

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <TextField id="reg-first" label="First name" icon="person" error={errors.firstName}
                name="given-name" autoComplete="given-name" placeholder="First name" type="text"
                value={formData.firstName} onChange={set('firstName')} />
              <TextField id="reg-last" label="Last name" icon="person" error={errors.lastName}
                name="family-name" autoComplete="family-name" placeholder="Last name" type="text"
                value={formData.lastName} onChange={set('lastName')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <TextField id="reg-email" label="Email" icon="mail" error={errors.email}
                name="email" autoComplete="email" placeholder="you@example.com" type="email"
                value={formData.email} onChange={set('email')} />
              <TextField id="reg-phone" label="Mobile number" icon="call" error={errors.phone}
                name="tel" autoComplete="tel-national" inputMode="numeric" placeholder="10-digit mobile" type="tel"
                value={formData.phone} onChange={set('phone')} />
            </div>

            <PasswordFields
              password={formData.password}
              confirmPassword={formData.confirmPassword}
              onPassword={set('password')}
              onConfirm={set('confirmPassword')}
              errors={errors}
            />

            <TermsCheckbox id="terms" checked={formData.agreeToTerms} onChange={set('agreeToTerms')} error={errors.agreeToTerms} />

            <SubmitButton isLoading={reg.isLoading} lockedFor={reg.lockedFor} label="Create Account" loadingLabel="Creating account..." />
          </form>

          <GoogleButton onClick={handleGoogle} />
          <SignInPrompt onClick={goToLogin} />
        </>
      )}
    </AuthSplitLayout>
  );
};

export default DesktopForm;
