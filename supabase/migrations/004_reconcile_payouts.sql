-- One-time reconciliation of missed payouts for markets resolved before
-- the atomic resolve_market RPC (migration 002) was deployed.
-- The old non-atomic resolution flow could fail partway through, leaving
-- resolved markets with winning bets that have NULL payouts.
--
-- This migration is idempotent — running it again produces no changes
-- because it only processes bets where payout IS NULL.
DO $$
DECLARE
  v_market RECORD;
  v_bet RECORD;
  v_winning_side TEXT;
  v_winning_pool INTEGER;
  v_total_pool INTEGER;
  v_payout INTEGER;
  v_markets_reconciled INTEGER := 0;
  v_bets_paid INTEGER := 0;
  v_bets_zeroed INTEGER := 0;
  v_total_credited INTEGER := 0;
  v_row_count INTEGER;
BEGIN
  -- Find all resolved markets that still have NULL-payout bets
  FOR v_market IN
    SELECT DISTINCT m.id, m.group_id, m.status, m.yes_pool, m.no_pool, m.total_pool
    FROM markets m
    INNER JOIN bets b ON b.market_id = m.id AND b.payout IS NULL
    WHERE m.status IN ('resolved_yes', 'resolved_no')
  LOOP
    v_markets_reconciled := v_markets_reconciled + 1;

    -- Determine the winning side and pool
    IF v_market.status = 'resolved_yes' THEN
      v_winning_side := 'yes';
      v_winning_pool := v_market.yes_pool;
    ELSE
      v_winning_side := 'no';
      v_winning_pool := v_market.no_pool;
    END IF;

    v_total_pool := v_market.total_pool;

    -- Calculate and distribute payouts to winning bets with NULL payout
    IF v_winning_pool > 0 THEN
      FOR v_bet IN
        SELECT id, user_id, amount
        FROM bets
        WHERE market_id = v_market.id
          AND side = v_winning_side::bet_side
          AND payout IS NULL
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

        v_bets_paid := v_bets_paid + 1;
        v_total_credited := v_total_credited + v_payout;
      END LOOP;
    END IF;

    -- Set all remaining NULL-payout bets on this market to 0 (losing side,
    -- or winning side with 0 pool where nobody wins)
    UPDATE bets
    SET payout = 0
    WHERE market_id = v_market.id
      AND payout IS NULL;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_bets_zeroed := v_bets_zeroed + v_row_count;
  END LOOP;

  RAISE NOTICE 'Reconciliation complete: % markets, % winning bets paid (% tokens credited), % losing/unwinnable bets set to 0',
    v_markets_reconciled, v_bets_paid, v_total_credited, v_bets_zeroed;
END;
$$;
