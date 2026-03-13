import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'
import { validateAmount } from '../lib/validation.ts'
import { Card, Button, StatusBadge, TokenAmount, ProbabilityBar, LoadingState, CountdownTimer, useToast } from '../components/ui'

interface Market {
  id: string
  group_id: string
  creator_id: string
  target_user_id: string
  secret_word: string | null
  window_start: string
  window_end: string
  status: string
  total_pool: number
  yes_pool: number
  no_pool: number
  target_display_name: string
  creator_display_name: string
}

interface Bet {
  id: string
  user_id: string
  side: 'yes' | 'no'
  amount: number
  payout: number | null
  display_name: string
}

export function MarketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const api = useApiClient()
  const { addToast } = useToast()
  const [market, setMarket] = useState<Market | null>(null)
  const [bets, setBets] = useState<Bet[]>([])
  const [betSide, setBetSide] = useState<'yes' | 'no'>('yes')
  const [betAmountStr, setBetAmountStr] = useState('')
  const [error, setError] = useState('')
  const [betError, setBetError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [isTarget, setIsTarget] = useState(false)
  const [userBalance, setUserBalance] = useState<number | null>(null)

  const betAmount = Number(betAmountStr) || 0

  useEffect(() => {
    if (!id) return
    api(`/markets/detail?marketId=${id}`)
      .then((res: { data: { market: Market; bets: Bet[]; isTarget: boolean; userBalance: number } }) => {
        setMarket(res.data.market)
        setBets(res.data.bets)
        setIsTarget(res.data.isTarget)
        setUserBalance(res.data.userBalance)
      })
      .catch(console.error)
  }, [id, api])

  async function handlePlaceBet() {
    if (!market) return
    const amountError = validateAmount(betAmount, 'Bet amount')
    if (amountError) {
      setBetError(amountError)
      return
    }
    setBetError('')
    setPlacing(true)
    setError('')
    try {
      const res = await api('/bets/place', {
        method: 'POST',
        body: JSON.stringify({
          marketId: market.id,
          side: betSide,
          amount: betAmount,
        }),
      }) as { data: { bet: Bet; updatedMarket: Market; newBalance?: number } }
      setMarket(res.data.updatedMarket)
      setBets((prev) => [...prev, res.data.bet])
      if (res.data.newBalance !== undefined) {
        setUserBalance(res.data.newBalance)
      }
      setBetAmountStr('')
      addToast(`Bet placed! ${betAmount} tokens on ${betSide.toUpperCase()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bet')
    } finally {
      setPlacing(false)
    }
  }

  if (!market) {
    return <LoadingState />
  }

  const isActive = market.status === 'active'
  const canBet = isActive && !isTarget && new Date(market.window_end) > new Date()

  const sidePool = betSide === 'yes' ? market.yes_pool : market.no_pool
  const previewPayout = canBet
    ? Math.floor((betAmount / (sidePool + betAmount)) * (market.total_pool + betAmount))
    : 0

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to={`/group/${market.group_id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-accent-green"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Group
      </Link>

      {/* Main market card */}
      <Card
        padding="lg"
        glow={market.status === 'active' ? 'green' : market.status === 'pending_resolution' ? 'amber' : undefined}
        className="mb-6"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-sm text-text-secondary">
              Will <span className="font-semibold text-text-primary">{market.target_display_name}</span> say...
            </p>
            <h2 className="mt-1 text-3xl font-bold text-text-primary" style={{ letterSpacing: '-0.02em' }}>
              {market.secret_word || 'REDACTED'}
            </h2>
          </div>
          <StatusBadge status={market.status} />
        </div>

        <div className="mb-5">
          <ProbabilityBar yesPool={market.yes_pool} totalPool={market.total_pool} />
        </div>

        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-accent-amber" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16z"/>
            </svg>
            <span className="text-text-secondary">Pool:</span>
            <TokenAmount amount={market.total_pool} animate />
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-text-secondary">{market.creator_display_name}</span>
          </div>
          {(market.status === 'active' || market.status === 'pending_resolution') && (
            <CountdownTimer
              targetDate={market.window_end}
              label={market.status === 'active' ? 'Ends in' : undefined}
              expiredText="Window closed"
            />
          )}
        </div>

        {market.status === 'pending_resolution' && isTarget && (
          <p className="mt-4 inline-flex items-center gap-1 text-sm text-accent-green">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            You will be prompted to resolve this market
          </p>
        )}

        {market.status === 'pending_resolution' && !isTarget && (
          <p className="mt-4 inline-flex items-center gap-1 text-sm text-text-tertiary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Waiting for {market.target_display_name} to resolve
          </p>
        )}
      </Card>

      {/* Resolution outcome banner */}
      {(market.status === 'resolved_yes' || market.status === 'resolved_no') && (
        <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${
          market.status === 'resolved_yes'
            ? 'border-accent-green/30 bg-accent-green/5'
            : 'border-accent-red/30 bg-accent-red/5'
        }`}>
          <svg className={`h-5 w-5 flex-shrink-0 ${market.status === 'resolved_yes' ? 'text-accent-green' : 'text-accent-red'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className={`font-bold ${market.status === 'resolved_yes' ? 'text-accent-green' : 'text-accent-red'}`}>
              Resolved: {market.status === 'resolved_yes' ? 'YES' : 'NO'}
            </p>
            <p className="text-sm text-text-secondary">
              {market.target_display_name} {market.status === 'resolved_yes' ? 'said' : 'did not say'} the secret word. {market.status === 'resolved_yes' ? 'YES' : 'NO'} bets win.
            </p>
          </div>
        </div>
      )}

      {/* Cancelled market banner */}
      {market.status === 'cancelled' && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-bg-surface p-4">
          <svg className="h-5 w-5 flex-shrink-0 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <div>
            <p className="font-bold text-text-primary">Market Cancelled</p>
            <p className="text-sm text-text-secondary">All bets have been refunded to their original bettors.</p>
          </div>
        </div>
      )}

      {/* Bet placement card */}
      {canBet && (
        <Card padding="lg" className="mb-6">
          <h3 className="mb-5 text-lg font-bold text-text-primary">Place Your Bet</h3>

          {/* Side selector */}
          <div className="mb-5 flex gap-3">
            <button
              onClick={() => setBetSide('yes')}
              className={`flex-1 rounded-xl px-4 py-3 font-bold text-lg transition-all ${
                betSide === 'yes'
                  ? 'bg-accent-green text-bg-primary shadow-[0_0_16px_rgba(0,231,1,0.3)]'
                  : 'border border-border bg-bg-primary text-text-secondary hover:bg-bg-hover hover:border-accent-green/40'
              }`}
            >
              YES
            </button>
            <button
              onClick={() => setBetSide('no')}
              className={`flex-1 rounded-xl px-4 py-3 font-bold text-lg transition-all ${
                betSide === 'no'
                  ? 'bg-accent-red text-white shadow-[0_0_16px_rgba(237,65,99,0.3)]'
                  : 'border border-border bg-bg-primary text-text-secondary hover:bg-bg-hover hover:border-accent-red/40'
              }`}
            >
              NO
            </button>
          </div>

          {/* Amount input */}
          <div className="mb-5">
            <label htmlFor="bet-amount" className="mb-2 block text-sm font-medium text-text-secondary">Bet Amount</label>
            <div className="relative">
              <input
                id="bet-amount"
                type="number"
                min="1"
                value={betAmountStr}
                onChange={(e) => setBetAmountStr(e.target.value)}
                placeholder="Enter amount"
                className="w-full rounded-xl border border-border bg-bg-input px-4 py-3 font-mono text-lg text-text-primary focus:border-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green/30"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="h-5 w-5 text-accent-amber" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16z"/>
                </svg>
              </div>
            </div>
            {betError && <p className="mt-1.5 text-sm text-accent-red">{betError}</p>}
          </div>

          {/* Payout preview */}
          <div className="mb-5 rounded-xl border border-border bg-bg-primary p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Potential payout</span>
              <TokenAmount amount={previewPayout} className="text-lg" animate />
            </div>
            {userBalance !== null && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-text-secondary">Your balance</span>
                <TokenAmount amount={userBalance} animate />
              </div>
            )}
          </div>

          {error && <p className="mb-4 text-sm text-accent-red">{error}</p>}
          <Button onClick={handlePlaceBet} disabled={placing || betAmount < 1} className="w-full" size="lg">
            {placing ? 'Placing...' : `Place ${betSide.toUpperCase()} Bet`}
          </Button>
        </Card>
      )}

      {isTarget && isActive && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-4">
          <svg className="h-5 w-5 flex-shrink-0 text-accent-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm text-accent-amber">You are the target of this market and cannot place bets.</span>
        </div>
      )}

      {/* Bets list */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-text-primary">
          <svg className="h-5 w-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Bets ({bets.length})
        </h3>
        {bets.length === 0 ? (
          <Card className="text-center">
            <p className="py-4 text-sm text-text-tertiary">No bets yet. Be the first!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {bets.map((bet) => {
              const isResolved = market.status === 'resolved_yes' || market.status === 'resolved_no' || market.status === 'cancelled'
              const pl = bet.payout !== null ? bet.payout - bet.amount : null
              return (
                <div key={bet.id} className="flex items-center justify-between rounded-xl border border-border bg-bg-surface px-5 py-3.5 transition-colors hover:bg-bg-hover">
                  <div className="flex items-center gap-3">
                    <span className="text-text-primary font-medium">{bet.display_name}</span>
                    <StatusBadge status={bet.side} />
                  </div>
                  <div className="flex items-center gap-4">
                    <TokenAmount amount={bet.amount} />
                    {isResolved && pl !== null && (
                      <span className={`font-mono text-sm font-semibold ${pl > 0 ? 'text-accent-green' : pl < 0 ? 'text-accent-red' : 'text-text-tertiary'}`}>
                        {pl > 0 ? '+' : ''}{pl.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
