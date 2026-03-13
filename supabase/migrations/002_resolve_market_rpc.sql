-- Atomic market resolution RPC
-- Resolves a market and distributes payouts in a single transaction.
-- Auth and authorization (Clerk token, creator check) are handled by the API layer.
-- This RPC handles DB-level validation to prevent double-resolution races.
CREATE OR REPLACE FUNCTION resolve_market(
  p_market_id UUID,
  p_outcome TEXT  -- 'yes' or 'no'
)
RETURNS JSON AS $$
DECLARE
  v_market RECORD;
  v_winning_pool INTEGER;
  v_total_pool INTEGER;
  v_new_status market_status;
  v_bet RECORD;
  v_payout INTEGER;
BEGIN
  -- Lock the market row to prevent race conditions (double-resolution)
  SELECT * INTO v_market
  FROM markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market not found';
  END IF;

  IF v_market.status NOT IN ('active', 'pending_resolution') THEN
    RAISE EXCEPTION 'Market is not resolvable';
  END IF;

  IF v_market.window_end > now() THEN
    RAISE EXCEPTION 'Cannot resolve before the time window closes';
  END IF;

  -- Determine winning pool and new status
  IF p_outcome = 'yes' THEN
    v_winning_pool := v_market.yes_pool;
    v_new_status := 'resolved_yes';
  ELSIF p_outcome = 'no' THEN
    v_winning_pool := v_market.no_pool;
    v_new_status := 'resolved_no';
  ELSE
    RAISE EXCEPTION 'Invalid outcome: must be yes or no';
  END IF;

  v_total_pool := v_market.total_pool;

  -- Update market status atomically
  UPDATE markets
  SET status = v_new_status,
      resolved_at = now()
  WHERE id = p_market_id;

  -- Set ALL bets on the losing side to payout = 0
  UPDATE bets
  SET payout = 0
  WHERE market_id = p_market_id
    AND side != p_outcome::bet_side;

  -- Calculate and distribute payouts to winning bets
  IF v_winning_pool > 0 THEN
    FOR v_bet IN
      SELECT id, user_id, amount
      FROM bets
      WHERE market_id = p_market_id
        AND side = p_outcome::bet_side
    LOOP
      v_payout := floor(v_bet.amount::numeric / v_winning_pool * v_total_pool);

      -- Set the winning bet's payout
      UPDATE bets
      SET payout = v_payout
      WHERE id = v_bet.id;

      -- Credit the winner's balance
      UPDATE group_members
      SET token_balance = token_balance + v_payout
      WHERE user_id = v_bet.user_id
        AND group_id = v_market.group_id;
    END LOOP;
  ELSE
    -- Winning pool is 0 (no bets on winning side) — ensure any remaining bets get payout = 0
    UPDATE bets
    SET payout = 0
    WHERE market_id = p_market_id
      AND payout IS NULL;
  END IF;

  RETURN json_build_object(
    'market_id', p_market_id,
    'status', v_new_status::text,
    'total_pool', v_total_pool,
    'winning_pool', v_winning_pool
  );
END;
$$ LANGUAGE plpgsql;
