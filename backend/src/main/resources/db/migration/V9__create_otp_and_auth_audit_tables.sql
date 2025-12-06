-- OTP codes for phone-based login
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(30) NOT NULL,
  code VARCHAR(10) NOT NULL,
  purpose VARCHAR(50), -- LOGIN, FORGOT_PASSWORD, VERIFY_PHONE
  attempts INT DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- password reset tokens
CREATE TABLE password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- auth logs (login attempts)
CREATE TABLE auth_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  phone VARCHAR(30),
  ip_address VARCHAR(100),
  user_agent TEXT,
  event VARCHAR(50), -- LOGIN_SUCCESS, LOGIN_FAIL, OTP_SENT, PASSWORD_RESET
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
