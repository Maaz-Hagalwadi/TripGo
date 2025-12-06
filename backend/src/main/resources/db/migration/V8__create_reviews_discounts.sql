-- discounts / promo codes
CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  type VARCHAR(50), -- 'PERCENT', 'FLAT'
  value NUMERIC(10,2), -- percent or flat
  max_discount NUMERIC(12,2),
  min_order_amount NUMERIC(12,2),
  usage_limit INT,
  used_count INT DEFAULT 0,
  valid_from DATE,
  valid_to DATE,
  active BOOLEAN DEFAULT TRUE
);

-- reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  route_id UUID REFERENCES routes(id),
  operator_id UUID REFERENCES operators(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
