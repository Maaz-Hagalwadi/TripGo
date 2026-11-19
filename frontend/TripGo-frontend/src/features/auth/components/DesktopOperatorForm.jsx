import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../../config/env';
import { ROUTES } from '../../../shared/constants/routes';
import { isPasswordValid } from '../../../shared/utils/passwordRules';
import { inputCls, isValidEmail, normalizePhone, useRegistration } from '../utils/registerForm';
import AuthSplitLayout from './AuthSplitLayout';
import {
  AccountTypeToggle, Field, FormAlert, PasswordFields, SectionLabel, SignInPrompt,
  SubmitButton, TermsCheckbox, TextField, VerifyEmailSuccess,
} from './RegisterFormParts';

const FIELD_NAMES = [
  'firstName', 'lastName', 'email', 'phone', 'password',
  'operatorName', 'shortName', 'contactPhone', 'contactEmail', 'address',
];

// No Google sign-up here: Google OAuth creates traveller accounts, not operator applications.
const DesktopOperatorForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '',
    operatorName: '', shortName: '', contactPhone: '', contactEmail: '', address: '',
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState({});
  const reg = useRegistration({ apiBaseUrl: API_BASE_URL, endpoint: '/operators/register', fieldNames: FIELD_NAMES, setErrors });

  const set = (key) => (e) => {
    let val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (key === 'phone' || key === 'contactPhone') val = normalizePhone(val);
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
    if (!formData.operatorName.trim()) e.operatorName = 'Company name is required';
    if (!formData.shortName.trim()) e.shortName = 'Short name is required';
    if (!formData.contactPhone) e.contactPhone = 'Contact phone is required';
    else if (formData.contactPhone.length !== 10) e.contactPhone = 'Enter a 10-digit phone number';
    if (!formData.contactEmail.trim()) e.contactEmail = 'Contact email is required';
    else if (!isValidEmail(formData.contactEmail)) e.contactEmail = 'Enter a valid email';
    if (!formData.address.trim()) e.address = 'Address is required';
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
      operatorName: formData.operatorName.trim(),
      shortName: formData.shortName.trim(),
      contactPhone: formData.contactPhone,
      contactEmail: formData.contactEmail.trim(),
      address: formData.address.trim(),
    });
  };

  const goToLogin = () => navigate(ROUTES.LOGIN, { state: location.state });

  return (
    <AuthSplitLayout
      headline={['Bring your buses', 'onto TripGo.']}
      intro="Register your company and start selling seats online. Every operator is reviewed by our team before going live."
      cards={[
        { icon: 'route', title: 'Routes, schedules & seats', sub: 'Set up your fleet, seat layouts, fares and boarding points.' },
        { icon: 'verified_user', title: 'Reviewed before going live', sub: 'Our team approves each operator — travellers book with confidence.' },
      ]}
      stats={[['Free', 'to register'], ['1', 'dashboard'], ['Stripe', 'payments']]}
    >
      {reg.registeredEmail ? (
        <VerifyEmailSuccess
          email={reg.registeredEmail}
          title="Application submitted"
          steps={[
            'Open the email and click the verification link.',
            'Our team reviews your application.',
            'Once approved, sign in to set up your fleet.',
          ]}
          onSignIn={goToLogin}
          onResend={reg.resend}
          resendIn={reg.resendIn}
          isResending={reg.isResending}
        />
      ) : (
        <>
          <div className="mb-7">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Become an operator</h2>
            <p className="text-sm text-slate-500">Tell us about you and your company — we’ll review it and get you live.</p>
          </div>

          <AccountTypeToggle active="operator" />
          <FormAlert message={reg.formError} lockedFor={reg.lockedFor} />

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <SectionLabel>Your details</SectionLabel>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <TextField id="op-first" label="First name" icon="person" error={errors.firstName}
                name="given-name" autoComplete="given-name" placeholder="First name" type="text"
                value={formData.firstName} onChange={set('firstName')} />
              <TextField id="op-last" label="Last name" icon="person" error={errors.lastName}
                name="family-name" autoComplete="family-name" placeholder="Last name" type="text"
                value={formData.lastName} onChange={set('lastName')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <TextField id="op-email" label="Email" icon="mail" error={errors.email}
                name="email" autoComplete="email" placeholder="you@company.com" type="email"
                value={formData.email} onChange={set('email')} />
              <TextField id="op-phone" label="Mobile number" icon="call" error={errors.phone}
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

            <div className="pt-2">
              <SectionLabel>Company details</SectionLabel>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <TextField id="op-company" label="Company name" icon="business" error={errors.operatorName}
                name="organization" autoComplete="organization" placeholder="e.g. Sharma Travels Pvt Ltd" type="text"
                value={formData.operatorName} onChange={set('operatorName')} />
              <TextField id="op-short" label="Short name" icon="badge" error={errors.shortName}
                placeholder="Shown to travellers, e.g. Sharma" type="text"
                value={formData.shortName} onChange={set('shortName')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <TextField id="op-contact-phone" label="Business phone" icon="support_agent" error={errors.contactPhone}
                inputMode="numeric" placeholder="10-digit number" type="tel"
                value={formData.contactPhone} onChange={set('contactPhone')} />
              <TextField id="op-contact-email" label="Business email" icon="alternate_email" error={errors.contactEmail}
                placeholder="bookings@company.com" type="email"
                value={formData.contactEmail} onChange={set('contactEmail')} />
            </div>

            <Field id="op-address" label="Company address" icon="location_on" error={errors.address}>
              <textarea
                id="op-address"
                name="street-address"
                autoComplete="street-address"
                rows={2}
                className={`${inputCls(errors.address)} resize-none`}
                placeholder="Office address, city, state, PIN"
                value={formData.address}
                onChange={set('address')}
              />
            </Field>

            <TermsCheckbox id="operator-terms" checked={formData.agreeToTerms} onChange={set('agreeToTerms')} error={errors.agreeToTerms} />

            <SubmitButton isLoading={reg.isLoading} lockedFor={reg.lockedFor} label="Submit Application" loadingLabel="Submitting application..." />
          </form>

          <SignInPrompt onClick={goToLogin} />
        </>
      )}
    </AuthSplitLayout>
  );
};

export default DesktopOperatorForm;
