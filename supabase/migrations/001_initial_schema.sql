-- Custom ENUM types
CREATE TYPE market_status AS ENUM (
  'active',
  'pending_resolution',
  'resolved_yes',
  'resolved_no',
  'cancelled'
);

CREATE TYPE bet_side AS ENUM ('yes', 'no');

-- Tables

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_clerk_id ON users (clerk_id);

CREATE TABLE groups (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  invite_code             TEXT NOT NULL UNIQUE,
  admin_user_id           UUID NOT NULL REFERENCES users(id),
  weekly_token_amount     INTEGER NOT NULL DEFAULT 1000,
  token_distribution_day  INTEGER NOT NULL DEFAULT 1 CHECK (token_distribution_day BETWEEN 0 AND 6),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_invite_code ON groups (invite_code);

CREATE TABLE group_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_balance INTEGER NOT NULL DEFAULT 0,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON group_members (group_id);
CREATE INDEX idx_group_members_user_id ON group_members (user_id);

CREATE TABLE markets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES users(id),
  target_user_id  UUID NOT NULL REFERENCES users(id),
  secret_word     TEXT NOT NULL,
  window_start    TIMESTAMPTZ NOT NULL,
  window_end      TIMESTAMPTZ NOT NULL,
  status          market_status NOT NULL DEFAULT 'active',
  resolved_at     TIMESTAMPTZ,
  total_pool      INTEGER NOT NULL DEFAULT 0,
  yes_pool        INTEGER NOT NULL DEFAULT 0,
  no_pool         INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (window_end > window_start),
  CHECK (total_pool >= 0),
  CHECK (yes_pool >= 0),
  CHECK (no_pool >= 0),
  CHECK (yes_pool + no_pool = total_pool)
);

CREATE INDEX idx_markets_group_id ON markets (group_id);
CREATE INDEX idx_markets_status ON markets (status);
CREATE INDEX idx_markets_group_status ON markets (group_id, status);
CREATE INDEX idx_markets_target_user_id ON markets (target_user_id);
CREATE INDEX idx_markets_creator_id ON markets (creator_id);

CREATE TABLE bets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id   UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  side        bet_side NOT NULL,
  amount      INTEGER NOT NULL CHECK (amount > 0),
  payout      INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bets_market_id ON bets (market_id);
CREATE INDEX idx_bets_user_id ON bets (user_id);
CREATE INDEX idx_bets_market_user ON bets (market_id, user_id);

CREATE TABLE token_distributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  amount          INTEGER NOT NULL,
  distributed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_token_distributions_group_id ON token_distributions (group_id);
CREATE INDEX idx_token_distributions_distributed_at ON token_distributions (distributed_at);

-- RPC function for atomic balance increment (used by resolve, cancel, distribute, and bet placement)
CREATE OR REPLACE FUNCTION increment_balance(p_user_id UUID, p_group_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE group_members
  SET token_balance = token_balance + p_amount
  WHERE user_id = p_user_id AND group_id = p_group_id;
END;
$$ LANGUAGE plpgsql;

-- RPC function for atomic bet placement
CREATE OR REPLACE FUNCTION place_bet(
  p_market_id UUID,
  p_user_id UUID,
  p_group_id UUID,
  p_side bet_side,
  p_amount INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_bet_id UUID;
  v_balance INTEGER;
BEGIN
  -- Lock the member row to prevent double-spend
  SELECT token_balance INTO v_balance
  FROM group_members
  WHERE user_id = p_user_id AND group_id = p_group_id
  FOR UPDATE;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct balance
  UPDATE group_members
  SET token_balance = token_balance - p_amount
  WHERE user_id = p_user_id AND group_id = p_group_id;

  -- Insert bet
  INSERT INTO bets (market_id, user_id, side, amount)
  VALUES (p_market_id, p_user_id, p_side, p_amount)
  RETURNING id INTO v_bet_id;

  -- Update market pools
  IF p_side = 'yes' THEN
    UPDATE markets
    SET yes_pool = yes_pool + p_amount,
        total_pool = total_pool + p_amount
    WHERE id = p_market_id;
  ELSE
    UPDATE markets
    SET no_pool = no_pool + p_amount,
        total_pool = total_pool + p_amount
    WHERE id = p_market_id;
  END IF;

  RETURN v_bet_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_distributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (defense-in-depth, service role bypasses these)
CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Members can read group memberships"
  ON group_members FOR SELECT
  USING (
    group_id IN (
      SELECT gm.group_id FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE u.clerk_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Members can read group markets"
  ON markets FOR SELECT
  USING (
    group_id IN (
      SELECT gm.group_id FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE u.clerk_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can read own bets"
  ON bets FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can read own distributions"
  ON token_distributions FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
  );
