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
  const [betAmount, setBetAmount] = useState(10)
  const [error, setError] = useState('')
  const [betError, setBetError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [isTarget, setIsTarget] = useState(false)

  useEffect(() => {
    if (!id) return
    api(`/markets/${id}`)
      .then((res: { data: { market: Market; bets: Bet[]; isTarget: boolean } }) => {
        setMarket(res.data.market)
        setBets(res.data.bets)
        setIsTarget(res.data.isTarget)
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
      }) as { data: { bet: Bet; updatedMarket: Market } }
      setMarket(res.data.updatedMarket)
      setBets((prev) => [...prev, res.data.bet])
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
    <div className="mx-auto max-w-2xl py-6">
      <Card padding="lg" className="mb-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm text-text-secondary">
              Will <span className="font-semibold text-text-primary">{market.target_display_name}</span> say...
            </p>
            <h2 className="mt-1 text-2xl font-bold text-text-primary" style={{ letterSpacing: '-0.02em' }}>
              {market.secret_word || 'REDACTED'}
            </h2>
          </div>
          <StatusBadge status={market.status} />
        </div>

        <div className="mb-4">
          <ProbabilityBar yesPool={market.yes_pool} totalPool={market.total_pool} />
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
          <span>Pool: <TokenAmount amount={market.total_pool} /></span>
          <span>Created by: {market.creator_display_name}</span>
          {(market.status === 'active' || market.status === 'pending_resolution') && (
            <CountdownTimer
              targetDate={market.window_end}
              label={market.status === 'active' ? 'Ends in' : undefined}
              expiredText="Window closed"
            />
          )}
        </div>

        {(market.status === 'active' || market.status === 'pending_resolution') && (
          <Link
            to={`/markets/${market.id}/resolve`}
            className="mt-4 inline-block text-sm text-text-tertiary hover:text-text-secondary"
          >
            Resolve market
          </Link>
        )}
      </Card>

      {canBet && (
        <Card padding="lg" className="mb-6">
          <h3 className="mb-4 text-lg font-semibold text-text-primary">Place Bet</h3>
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setBetSide('yes')}
              className={`flex-1 rounded-lg px-4 py-2 font-semibold transition-colors ${
                betSide === 'yes'
                  ? 'bg-accent-green text-white'
                  : 'border border-border bg-transparent text-text-secondary hover:bg-bg-hover'
              }`}
            >
              YES
            </button>
            <button
              onClick={() => setBetSide('no')}
              className={`flex-1 rounded-lg px-4 py-2 font-semibold transition-colors ${
                betSide === 'no'
                  ? 'bg-accent-red text-white'
                  : 'border border-border bg-transparent text-text-secondary hover:bg-bg-hover'
              }`}
            >
              NO
            </button>
          </div>
          <div className="mb-4">
            <label htmlFor="bet-amount" className="mb-1 block text-sm text-text-secondary">Amount</label>
            <input
              id="bet-amount"
              type="number"
              min="1"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2 font-mono text-text-primary focus:border-accent-green focus:outline-none"
            />
            {betError && <p className="mt-1 text-sm text-accent-red">{betError}</p>}
          </div>
          <p className="mb-4 text-sm text-text-secondary">
            Potential payout: <TokenAmount amount={previewPayout} /> tokens
          </p>
          {error && <p className="mb-4 text-sm text-accent-red">{error}</p>}
          <Button onClick={handlePlaceBet} disabled={placing || betAmount < 1} className="w-full">
            {placing ? 'Placing...' : `Place ${betSide.toUpperCase()} bet`}
          </Button>
        </Card>
      )}

      {isTarget && isActive && (
        <div className="mb-6 rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-4 text-sm text-accent-amber">
          You are the target of this market and cannot place bets.
        </div>
      )}

      <div>
        <h3 className="mb-3 text-lg font-semibold text-text-primary">Bets ({bets.length})</h3>
        {bets.length === 0 ? (
          <p className="text-sm text-text-tertiary">No bets yet.</p>
        ) : (
          <div className="space-y-2">
            {bets.map((bet) => (
              <div key={bet.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-surface px-4 py-3">
                <div>
                  <span className="text-text-primary">{bet.display_name}</span>
                  <StatusBadge status={bet.side} className="ml-2" />
                </div>
                <TokenAmount amount={bet.amount} className="text-sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
