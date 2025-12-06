-- payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider VARCHAR(100), -- 'STRIPE', 'RAZORPAY', 'MOCK'
  provider_transaction_id VARCHAR(200),
  amount NUMERIC(12,2),
  status VARCHAR(50), -- INITIATED, SUCCESS, FAILED, REFUNDED
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  ticket_no VARCHAR(100) UNIQUE,
  pdf_url VARCHAR(1000),
  qr_code BYTEA,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- notifications (audit of emails/sms/push)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  booking_id UUID REFERENCES bookings(id),
  type VARCHAR(50), -- EMAIL, SMS, WHATSAPP, PUSH
  channel VARCHAR(50),
  recipient VARCHAR(200),
  payload JSONB,
  status VARCHAR(50),
  sent_at TIMESTAMP WITH TIME ZONE
);
