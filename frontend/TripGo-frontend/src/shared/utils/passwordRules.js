// Mirrors the backend RegisterRequest password @Pattern:
// ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$
// Keep these in sync — a mismatch lets the form submit a password the API then rejects.

export const PASSWORD_SPECIALS = '@$!%*?&#';

export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /\d/.test(p) },
  { id: 'special', label: `One of ${PASSWORD_SPECIALS.split('').join(' ')}`, test: (p) => /[@$!%*?&#]/.test(p) },
  { id: 'allowed', label: 'Only letters, numbers and those symbols', test: (p) => /^[A-Za-z\d@$!%*?&#]*$/.test(p) },
];

export const isPasswordValid = (password) => PASSWORD_RULES.every((rule) => rule.test(password));
