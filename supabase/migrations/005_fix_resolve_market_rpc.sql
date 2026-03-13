-- Fix resolve_market RPC for one-sided market edge cases
-- Replaces the version from 002_resolve_market_rpc.sql which had three bugs:
--   1. Balance credit JOIN used only user_id, not user_id + group_id
--      → credited wrong group's balance for multi-group users
--   2. No explicit guard for winning_pool = 0 (all bets on losing side)
--      → potential division-by-zero or silent skip
--   3. Losing bets left with payout IS NULL instead of payout = 0
--
-- This version handles all edge cases per spec 11-resolve-payout-bug.md:
--   - One-sided winning (losing_pool = 0): each winner gets bet back
--   - One-sided losing (winning_pool = 0): all payouts = 0
--   - Sole bettor wins/loses
--   - 0 bets: status updates, no payout ops
--   - NO outcome identical to YES (parameterized winning_side)

CREATE OR REPLACE FUNCTION resolve_market(p_market_id UUID, p_outcome TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_market RECORD;
  v_total_pool BIGINT;
  v_winning_pool BIGINT;
  v_losing_pool BIGINT;
  v_winning_side TEXT;
  v_new_status TEXT;
BEGIN
  -- Lock the market row to prevent concurrent resolution
  SELECT * INTO v_market
  FROM markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market not found';
  END IF;

  -- Validate market is resolvable
  IF v_market.status NOT IN ('active', 'pending_resolution') THEN
    RAISE EXCEPTION 'Market is not resolvable (status: %)', v_market.status;
  END IF;

  -- Validate time window has closed
  IF v_market.window_end > NOW() THEN
    RAISE EXCEPTION 'Cannot resolve before the time window closes';
  END IF;

  -- Determine winning side and new status (YES and NO are symmetric)
  IF p_outcome = 'yes' THEN
    v_winning_side := 'yes';
    v_new_status := 'resolved_yes';
  ELSIF p_outcome = 'no' THEN
    v_winning_side := 'no';
    v_new_status := 'resolved_no';
  ELSE
    RAISE EXCEPTION 'Invalid outcome: %', p_outcome;
  END IF;

  -- Update market status and resolution timestamp
  UPDATE markets
  SET status = v_new_status,
      resolved_at = NOW()
  WHERE id = p_market_id;

  -- Calculate pools from actual bets
  SELECT COALESCE(SUM(amount), 0) INTO v_total_pool
  FROM bets WHERE market_id = p_market_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_winning_pool
  FROM bets WHERE market_id = p_market_id AND side = v_winning_side;

  v_losing_pool := v_total_pool - v_winning_pool;

  -- Handle payouts based on pool state
  IF v_total_pool = 0 THEN
    -- No bets at all: status updated above, nothing else to do
    NULL;

  ELSIF v_winning_pool = 0 THEN
    -- All bets on losing side: everyone loses, all payouts = 0
    UPDATE bets
    SET payout = 0
    WHERE market_id = p_market_id
      AND payout IS NULL;

  ELSIF v_losing_pool = 0 THEN
    -- One-sided winning: every winner gets exactly their bet back
    -- (No profit possible since there's no losing pool to distribute)
    UPDATE bets
    SET payout = amount
    WHERE market_id = p_market_id
      AND side = v_winning_side;

    -- Set any non-winning-side bets to 0 (shouldn't exist, but safety)
    UPDATE bets
    SET payout = 0
    WHERE market_id = p_market_id
      AND side != v_winning_side;

    -- Credit winners' balances using BOTH user_id AND group_id
    UPDATE group_members gm
    SET token_balance = gm.token_balance + b.amount
    FROM bets b
    WHERE b.market_id = p_market_id
      AND b.side = v_winning_side
      AND gm.user_id = b.user_id
      AND gm.group_id = v_market.group_id;

  ELSE
    -- Normal two-sided market: distribute total pool proportionally
    -- Winners get floor(bet_amount / winning_pool * total_pool)
    UPDATE bets
    SET payout = FLOOR(amount::numeric / v_winning_pool * v_total_pool)
    WHERE market_id = p_market_id
      AND side = v_winning_side;

    -- Losers get payout = 0
    UPDATE bets
    SET payout = 0
    WHERE market_id = p_market_id
      AND side != v_winning_side;

    -- Credit winners' balances using BOTH user_id AND group_id
    UPDATE group_members gm
    SET token_balance = gm.token_balance + b.payout
    FROM bets b
    WHERE b.market_id = p_market_id
      AND b.side = v_winning_side
      AND b.payout > 0
      AND gm.user_id = b.user_id
      AND gm.group_id = v_market.group_id;
  END IF;

  RETURN json_build_object(
    'market_id', p_market_id,
    'status', v_new_status,
    'total_pool', v_total_pool,
    'winning_pool', v_winning_pool
  );
END;
$$;
