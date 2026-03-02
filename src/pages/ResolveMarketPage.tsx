import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'
import { Card, Button, TokenAmount, LoadingState, PageHeader, useToast } from '../components/ui'

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
  const { addToast } = useToast()
  const [market, setMarket] = useState<Market | null>(null)
  const [error, setError] = useState('')
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (!id) return
    api(`/markets/detail?marketId=${id}`)
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
      addToast(`Market resolved as ${outcome.toUpperCase()}!`)
      navigate(`/markets/${market.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve market')
    } finally {
      setResolving(false)
    }
  }

  if (!market) {
    return <LoadingState />
  }

  const windowClosed = new Date(market.window_end) < new Date()
  const canResolve = windowClosed && (market.status === 'active' || market.status === 'pending_resolution')

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Resolve Market" backTo={`/markets/${id}`} backLabel="Market" />

      <Card className="mb-6">
        <p className="text-sm text-text-secondary">
          Did <span className="font-semibold text-text-primary">{market.target_display_name}</span> say...
        </p>
        <p className="mt-2 text-2xl font-bold text-accent-green">
          &ldquo;{market.secret_word}&rdquo;
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
          <svg className="h-4 w-4 text-accent-amber" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16z"/>
          </svg>
          Pool: <TokenAmount amount={market.total_pool} /> tokens
        </div>
      </Card>

      {!windowClosed && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-accent-amber/20 bg-accent-amber/5 px-4 py-3 text-sm text-accent-amber">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          Cannot resolve yet \u2014 the time window has not closed.
        </div>
      )}

      {error && <p className="mb-4 text-sm text-accent-red">{error}</p>}

      <div className="flex gap-3">
        <Button onClick={() => handleResolve('yes')} disabled={!canResolve || resolving} className="flex-1" size="lg">
          Yes, they said it
        </Button>
        <Button onClick={() => handleResolve('no')} disabled={!canResolve || resolving} variant="danger" className="flex-1" size="lg">
          No, they didn't
        </Button>
      </div>
    </div>
  )
}
