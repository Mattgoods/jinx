import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'

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
  const [market, setMarket] = useState<Market | null>(null)
  const [bets, setBets] = useState<Bet[]>([])
  const [betSide, setBetSide] = useState<'yes' | 'no'>('yes')
  const [betAmount, setBetAmount] = useState(10)
  const [error, setError] = useState('')
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bet')
    } finally {
      setPlacing(false)
    }
  }

  if (!market) {
    return <div className="text-text-secondary">Loading...</div>
  }

  const yesPercent = market.total_pool > 0 ? (market.yes_pool / market.total_pool) * 100 : 50
  const isActive = market.status === 'active'
  const canBet = isActive && !isTarget && new Date(market.window_end) > new Date()

  // Payout preview
  const sidePool = betSide === 'yes' ? market.yes_pool : market.no_pool
  const previewPayout = canBet
    ? Math.floor((betAmount / (sidePool + betAmount)) * (market.total_pool + betAmount))
    : 0

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-6 rounded-xl border border-border bg-bg-surface p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm text-text-secondary">
              Will <span className="font-semibold text-text-primary">{market.target_display_name}</span> say...
            </p>
            <h2 className="mt-1 text-2xl font-bold text-text-primary" style={{ letterSpacing: '-0.02em' }}>
              {market.secret_word || 'REDACTED'}
            </h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            market.status === 'active' ? 'bg-accent-green/15 text-accent-green' :
            market.status === 'pending_resolution' ? 'bg-accent-amber/15 text-accent-amber' :
            market.status === 'resolved_yes' ? 'bg-accent-green/15 text-accent-green' :
            market.status === 'resolved_no' ? 'bg-accent-red/15 text-accent-red' :
            'bg-border text-text-tertiary'
          }`}>
            {market.status.replace('_', ' ')}
          </span>
        </div>

        {/* Probability bar */}
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-mono font-medium text-accent-green">YES {yesPercent.toFixed(0)}%</span>
            <span className="font-mono font-medium text-accent-red">NO {(100 - yesPercent).toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-accent-red/20">
            <div className="probability-fill h-full rounded-full bg-accent-green" style={{ width: `${yesPercent}%` }} />
          </div>
        </div>

        <div className="flex gap-4 text-sm text-text-secondary">
          <span>Pool: <span className="font-mono font-semibold text-accent-amber">{market.total_pool}</span></span>
          <span>Created by: {market.creator_display_name}</span>
        </div>

        {market.status === 'active' && (
          <Link
            to={`/markets/${market.id}/resolve`}
            className="mt-4 inline-block text-sm text-text-tertiary hover:text-text-secondary"
          >
            Resolve market
          </Link>
        )}
      </div>

      {/* Bet panel */}
      {canBet && (
        <div className="mb-6 rounded-xl border border-border bg-bg-surface p-6">
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
          </div>
          <p className="mb-4 text-sm text-text-secondary">
            Potential payout: <span className="font-mono font-semibold text-accent-amber">{previewPayout}</span> tokens
          </p>
          {error && <p className="mb-4 text-sm text-accent-red">{error}</p>}
          <button
            onClick={handlePlaceBet}
            disabled={placing || betAmount < 1}
            className="w-full rounded-lg bg-accent-green px-4 py-2 font-semibold text-white transition-colors hover:bg-accent-green/90 disabled:opacity-50"
          >
            {placing ? 'Placing...' : `Place ${betSide.toUpperCase()} bet`}
          </button>
        </div>
      )}

      {isTarget && isActive && (
        <div className="mb-6 rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-4 text-sm text-accent-amber">
          You are the target of this market and cannot place bets.
        </div>
      )}

      {/* Bet list */}
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
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                    bet.side === 'yes' ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'
                  }`}>
                    {bet.side.toUpperCase()}
                  </span>
                </div>
                <span className="font-mono text-sm text-accent-amber">{bet.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
