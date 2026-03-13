-- Atomic market cancellation RPC
-- Cancels a market and refunds all bets in a single transaction.
-- Auth and authorization (Clerk token, creator check) are handled by the API layer.
-- This RPC handles DB-level validation to prevent race conditions.
CREATE OR REPLACE FUNCTION cancel_market(
  p_market_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_market RECORD;
  v_bet RECORD;
  v_refund_count INTEGER := 0;
  v_refund_total INTEGER := 0;
BEGIN
  -- Lock the market row to prevent concurrent cancellation/resolution races
  SELECT * INTO v_market
  FROM markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market not found';
  END IF;

  -- Cannot cancel resolved markets
  IF v_market.status IN ('resolved_yes', 'resolved_no') THEN
    RAISE EXCEPTION 'Cannot cancel a resolved market';
  END IF;

  -- Cannot cancel already-cancelled markets
  IF v_market.status = 'cancelled' THEN
    RAISE EXCEPTION 'Market is already cancelled';
  END IF;

  -- Update market status to cancelled
  UPDATE markets
  SET status = 'cancelled'
  WHERE id = p_market_id;

  -- Refund all bets: set payout = amount and credit balances
  FOR v_bet IN
    SELECT id, user_id, amount
    FROM bets
    WHERE market_id = p_market_id
      AND payout IS NULL
  LOOP
    -- Set payout = amount (P/L = 0 for cancelled markets)
    UPDATE bets
    SET payout = v_bet.amount
    WHERE id = v_bet.id;

    -- Credit the bettor's balance
    UPDATE group_members
    SET token_balance = token_balance + v_bet.amount
    WHERE user_id = v_bet.user_id
      AND group_id = v_market.group_id;

    v_refund_count := v_refund_count + 1;
    v_refund_total := v_refund_total + v_bet.amount;
  END LOOP;

  RETURN json_build_object(
    'market_id', p_market_id,
    'status', 'cancelled',
    'refund_count', v_refund_count,
    'refund_total', v_refund_total
  );
END;
$$ LANGUAGE plpgsql;
