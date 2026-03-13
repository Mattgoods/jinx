import { useState, useEffect, useCallback } from 'react'
import { useApiClient } from '../lib/api.ts'
import { useLocation } from 'react-router-dom'
import { Button, TokenAmount, useToast } from './ui'

interface PendingMarket {
  id: string
  group_id: string
  secret_word: string
  target_display_name: string
  total_pool: number
  yes_pool: number
  no_pool: number
  window_end: string
}

export function ResolutionModal() {
  const api = useApiClient()
  const location = useLocation()
  const { addToast } = useToast()
  const [pendingMarkets, setPendingMarkets] = useState<PendingMarket[]>([])
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState('')

  const fetchPending = useCallback(() => {
    api('/markets/pending-resolution')
      .then((res: { data: { markets: PendingMarket[] } }) => {
        setPendingMarkets(res.data.markets)
      })
      .catch(() => { /* ignore fetch errors */ })
  }, [api])

  // Fetch on mount and on route changes
  useEffect(() => {
    fetchPending()
  }, [fetchPending, location.pathname])

  async function handleResolve(outcome: 'yes' | 'no') {
    const market = pendingMarkets[0]
    if (!market) return
    setResolving(true)
    setError('')
    try {
      await api('/markets/resolve', {
        method: 'POST',
        body: JSON.stringify({ marketId: market.id, outcome }),
      })
      addToast(`Market resolved as ${outcome.toUpperCase()}!`, 'success')
      // Remove the resolved market and show next (if any)
      setPendingMarkets((prev) => prev.slice(1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve market')
    } finally {
      setResolving(false)
    }
  }

  if (pendingMarkets.length === 0) {
    return null
  }

  const market = pendingMarkets[0]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Resolve market"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-bg-surface p-8 shadow-2xl">
        {/* Counter for multiple pending */}
        {pendingMarkets.length > 1 && (
          <p className="mb-4 text-center text-sm text-text-tertiary">
            Market 1 of {pendingMarkets.length}
          </p>
        )}

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-accent-amber/30 bg-accent-amber/10">
            <svg className="h-7 w-7 text-accent-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text-primary">Time to Resolve!</h2>
          <p className="mt-1 text-sm text-text-secondary">Did you say the secret word?</p>
        </div>

        {/* Secret word reveal */}
        <div className="mb-6 rounded-xl border border-accent-green/20 bg-accent-green/5 p-5 text-center">
          <p className="text-sm text-text-secondary">The secret word was</p>
          <p className="mt-2 text-3xl font-bold text-accent-green">
            &ldquo;{market.secret_word}&rdquo;
          </p>
        </div>

        {/* Pool info */}
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-text-secondary">
          <svg className="h-4 w-4 text-accent-amber" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16z"/>
          </svg>
          Pool: <TokenAmount amount={market.total_pool} />
        </div>

        {/* Error */}
        {error && <p className="mb-4 text-center text-sm text-accent-red">{error}</p>}

        {/* Resolution buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => handleResolve('yes')}
            disabled={resolving}
            className="flex-1"
            size="lg"
          >
            {resolving ? 'Resolving...' : 'Yes, I said it'}
          </Button>
          <Button
            onClick={() => handleResolve('no')}
            disabled={resolving}
            variant="danger"
            className="flex-1"
            size="lg"
          >
            {resolving ? 'Resolving...' : "No, I didn't"}
          </Button>
        </div>
      </div>
    </div>
  )
}
