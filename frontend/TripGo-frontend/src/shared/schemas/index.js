import { z } from 'zod';

export const loginSchema = z.object({
  emailOrPhone: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Must include letters, numbers, and a symbol'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const completeProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Must include letters, numbers, and a symbol'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const addBusSchema = z.object({
  busName: z.string().trim().min(2, 'Enter the bus name').max(60, 'Keep it under 60 characters'),
  busCode: z.string().trim().min(2, 'Enter a short code').max(20, 'Keep it under 20 characters')
    .regex(/^[A-Za-z0-9-]+$/, 'Letters, numbers and hyphens only'),
  // Indian registration plates, e.g. KA 01 AB 1234 or 22 BH 1234 AA (spaces optional)
  vehicleNumber: z.string().trim().toUpperCase()
    .regex(/^([A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{4}|\d{2}\s?BH\s?\d{4}\s?[A-Z]{1,2})$/, 'Enter a valid number plate, e.g. KA 01 AB 1234'),
  model: z.string().trim().min(2, 'Enter the model, e.g. Volvo 9600').max(60),
  busType: z.string().min(1, 'Choose a bus type'),
  totalSeats: z.coerce.number({ error: 'Enter the number of seats' })
    .int('Use a whole number').min(10, 'At least 10 seats').max(60, 'At most 60 seats'),
});
