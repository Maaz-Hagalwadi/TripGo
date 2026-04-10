import { apiPost } from './apiClient';

const isDuplicateBookingCodeError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('booking_code') || message.includes('booking code') || message.includes('duplicate key value');
};

export const createPaymentIntent = async (payload) => {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await apiPost('/payments/create-intent', payload);
    } catch (error) {
      lastError = error;
      if (!isDuplicateBookingCodeError(error) || attempt === 2) {
        throw error;
      }
    }
  }
  throw lastError;
};

export const confirmBookingPayment = async (bookingId, paymentIntentId) => {
  return apiPost(
    `/payments/confirm-booking/${encodeURIComponent(bookingId)}?paymentIntentId=${encodeURIComponent(paymentIntentId)}`
  );
};
