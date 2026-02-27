import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'

interface Market {
  id: string
  secret_word: string
  target_display_name: string
  window_end: string
  status: string
  total_pool: number
  yes_pool: number
  no_pool: number
}

export function ResolveMarketPage() {
  const { id } = useParams<{ id: string }>()
  const api = useApiClient()
  const navigate = useNavigate()
  const [market, setMarket] = useState<Market | null>(null)
  const [error, setError] = useState('')
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (!id) return
    api(`/markets/${id}`)
      .then((res: { data: { market: Market } }) => setMarket(res.data.market))
      .catch(console.error)
  }, [id, api])

  async function handleResolve(outcome: 'yes' | 'no') {
    if (!market) return
    setResolving(true)
    setError('')
    try {
      await api('/markets/resolve', {
        method: 'POST',
        body: JSON.stringify({ marketId: market.id, outcome }),
      })
      navigate(`/markets/${market.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve market')
    } finally {
      setResolving(false)
    }
  }

  if (!market) {
    return <div className="text-text-secondary">Loading...</div>
  }

  const windowClosed = new Date(market.window_end) < new Date()
  const canResolve = windowClosed && (market.status === 'active' || market.status === 'pending_resolution')

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-text-primary" style={{ letterSpacing: '-0.02em' }}>
        Resolve Market
      </h1>
      <div className="mb-6 rounded-xl border border-border bg-bg-surface p-5">
        <p className="text-sm text-text-secondary">
          Did <span className="font-semibold text-text-primary">{market.target_display_name}</span> say...
        </p>
        <p className="mt-1 text-xl font-bold text-text-primary">"{market.secret_word}"</p>
        <p className="mt-3 text-sm text-text-secondary">
          Pool: <span className="font-mono font-semibold text-accent-amber">{market.total_pool}</span> tokens
        </p>
      </div>

      {!windowClosed && (
        <p className="mb-4 text-sm text-accent-amber">
          Cannot resolve yet — the time window has not closed.
        </p>
      )}

      {error && <p className="mb-4 text-sm text-accent-red">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => handleResolve('yes')}
          disabled={!canResolve || resolving}
          className="flex-1 rounded-lg bg-accent-green px-4 py-3 font-semibold text-white transition-colors hover:bg-accent-green/90 disabled:opacity-50"
        >
          Yes, they said it
        </button>
        <button
          onClick={() => handleResolve('no')}
          disabled={!canResolve || resolving}
          className="flex-1 rounded-lg bg-accent-red px-4 py-3 font-semibold text-white transition-colors hover:bg-accent-red/90 disabled:opacity-50"
        >
          No, they didn't
        </button>
      </div>
    </div>
  )
}
