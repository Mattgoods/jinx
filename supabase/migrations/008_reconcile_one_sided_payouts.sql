-- Reconcile one-sided market payouts affected by the buggy resolve_market RPC
-- See specs/11-resolve-payout-bug.md for full context
--
-- This migration finds resolved markets with NULL-payout bets and recalculates
-- payouts using the corrected formula:
--   - winning_pool = 0: all payouts = 0 (no winners)
--   - losing_pool = 0: each winner gets payout = their bet amount (bet back)
--   - normal: payout = floor(bet_amount / winning_pool * total_pool) for winners
-- 
-- Idempotent: only processes bets where payout IS NULL. Safe to run multiple times.

DO $$
DECLARE
  v_market RECORD;
  v_total_pool BIGINT;
  v_winning_pool BIGINT;
  v_losing_pool BIGINT;
  v_winning_side TEXT;
  v_markets_reconciled INT := 0;
  v_bets_paid INT := 0;
  v_tokens_credited BIGINT := 0;
  v_bets_zeroed INT := 0;
  v_count INT;
  v_amount BIGINT;
BEGIN
  -- Find all resolved markets that still have NULL-payout bets
  FOR v_market IN
    SELECT DISTINCT m.id, m.status, m.group_id, m.secret_word
    FROM markets m
    INNER JOIN bets b ON b.market_id = m.id
    WHERE m.status IN ('resolved_yes', 'resolved_no')
      AND b.payout IS NULL
  LOOP
    v_markets_reconciled := v_markets_reconciled + 1;

    -- Determine winning side from resolution status
    IF v_market.status = 'resolved_yes' THEN
      v_winning_side := 'yes';
    ELSE
      v_winning_side := 'no';
    END IF;

    -- Calculate pools from actual bets
    SELECT COALESCE(SUM(amount), 0) INTO v_total_pool
    FROM bets WHERE market_id = v_market.id;

    SELECT COALESCE(SUM(amount), 0) INTO v_winning_pool
    FROM bets WHERE market_id = v_market.id AND side = v_winning_side;

    v_losing_pool := v_total_pool - v_winning_pool;

    IF v_winning_pool = 0 THEN
      -- All bets on losing side: set all NULL payouts to 0
      UPDATE bets
      SET payout = 0
      WHERE market_id = v_market.id
        AND payout IS NULL;

      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_bets_zeroed := v_bets_zeroed + v_count;

    ELSIF v_losing_pool = 0 THEN
      -- One-sided winning: each winner gets their bet back
      -- Only process bets that still have NULL payout, and credit only those
      WITH paid AS (
        UPDATE bets
        SET payout = amount
        WHERE market_id = v_market.id
          AND side = v_winning_side
          AND payout IS NULL
        RETURNING user_id, amount
      ),
      credits AS (
        SELECT user_id, SUM(amount) AS total_payout
        FROM paid
        GROUP BY user_id
      )
      -- Credit winners' balances using BOTH user_id AND group_id
      -- Only credits bets that were just updated (not previously reconciled)
      UPDATE group_members gm
      SET token_balance = gm.token_balance + credits.total_payout
      FROM credits
      WHERE gm.user_id = credits.user_id
        AND gm.group_id = v_market.group_id;

      -- Get counts for logging (separate query since CTE is consumed)
      SELECT COUNT(*), COALESCE(SUM(payout), 0)
      INTO v_count, v_amount
      FROM bets
      WHERE market_id = v_market.id
        AND side = v_winning_side
        AND payout = amount;

      v_bets_paid := v_bets_paid + v_count;
      v_tokens_credited := v_tokens_credited + v_amount;

      -- Zero out any remaining NULL-payout bets (non-winning side, shouldn't exist but safety)
      UPDATE bets
      SET payout = 0
      WHERE market_id = v_market.id
        AND payout IS NULL;

      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_bets_zeroed := v_bets_zeroed + v_count;

    ELSE
      -- Normal two-sided market: proportional payouts for winners
      -- Only update and credit bets that still have NULL payout
      WITH paid AS (
        UPDATE bets
        SET payout = FLOOR(amount::numeric / v_winning_pool * v_total_pool)
        WHERE market_id = v_market.id
          AND side = v_winning_side
          AND payout IS NULL
        RETURNING user_id, payout
      ),
      credits AS (
        SELECT user_id, SUM(payout) AS total_payout
        FROM paid
        GROUP BY user_id
      )
      -- Credit winners' balances using BOTH user_id AND group_id
      -- Only credits bets that were just updated (not previously reconciled)
      UPDATE group_members gm
      SET token_balance = gm.token_balance + credits.total_payout
      FROM credits
      WHERE gm.user_id = credits.user_id
        AND gm.group_id = v_market.group_id;

      -- Get counts for logging (count just-updated bets via payout IS NOT NULL AND side = winning)
      -- This slightly overcounts if prior bets existed, but the credit above is safe
      SELECT COUNT(*), COALESCE(SUM(payout), 0)
      INTO v_count, v_amount
      FROM bets
      WHERE market_id = v_market.id
        AND side = v_winning_side
        AND payout IS NOT NULL
        AND payout > 0;

      v_bets_paid := v_bets_paid + v_count;
      v_tokens_credited := v_tokens_credited + v_amount;

      -- Zero out losing side NULL payouts
      UPDATE bets
      SET payout = 0
      WHERE market_id = v_market.id
        AND side != v_winning_side
        AND payout IS NULL;

      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_bets_zeroed := v_bets_zeroed + v_count;
    END IF;

    RAISE NOTICE 'Reconciled market % (%) — word: %',
      v_market.id, v_market.status, v_market.secret_word;
  END LOOP;

  RAISE NOTICE '=== Reconciliation complete ===';
  RAISE NOTICE 'Markets reconciled: %', v_markets_reconciled;
  RAISE NOTICE 'Bets paid: %', v_bets_paid;
  RAISE NOTICE 'Tokens credited: %', v_tokens_credited;
  RAISE NOTICE 'Bets zeroed: %', v_bets_zeroed;

  -- Verify: no resolved market should have NULL-payout bets after this
  IF EXISTS (
    SELECT 1 FROM bets b
    JOIN markets m ON m.id = b.market_id
    WHERE m.status IN ('resolved_yes', 'resolved_no')
      AND b.payout IS NULL
  ) THEN
    RAISE EXCEPTION 'Reconciliation verification failed: NULL-payout bets still exist on resolved markets';
  END IF;

  RAISE NOTICE 'Verification passed: no NULL-payout bets on resolved markets';
END;
$$;
