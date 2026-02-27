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
    <div className="mx-auto max-w-md py-12">
      <PageHeader title="Resolve Market" />
      <Card className="mb-6">
        <p className="text-sm text-text-secondary">
          Did <span className="font-semibold text-text-primary">{market.target_display_name}</span> say...
        </p>
        <p className="mt-1 text-xl font-bold text-text-primary">"{market.secret_word}"</p>
        <p className="mt-3 text-sm text-text-secondary">
          Pool: <TokenAmount amount={market.total_pool} /> tokens
        </p>
      </Card>

      {!windowClosed && (
        <p className="mb-4 text-sm text-accent-amber">
          Cannot resolve yet — the time window has not closed.
        </p>
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
