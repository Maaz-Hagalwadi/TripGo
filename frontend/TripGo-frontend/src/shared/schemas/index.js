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
  busName: z.string().min(1, 'Bus name is required'),
  busCode: z.string().min(1, 'Bus code is required'),
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  model: z.string().min(1, 'Model is required'),
  busType: z.string().min(1, 'Bus type is required'),
  totalSeats: z.coerce.number({ invalid_type_error: 'Total seats is required' }).min(1, 'Must be at least 1 seat'),
});
