import { useUser } from '@clerk/clerk-react'
import { useEffect, useRef } from 'react'
import { useApiClient } from '../lib/api.ts'

export function useUserSync() {
  const { user, isLoaded } = useUser()
  const api = useApiClient()
  const synced = useRef(false)

  useEffect(() => {
    if (!isLoaded || !user || synced.current) return
    synced.current = true

    api('/users/sync', {
      method: 'POST',
      body: JSON.stringify({
        displayName: user.fullName || user.firstName || 'Anonymous',
        avatarUrl: user.imageUrl,
      }),
    }).catch(console.error)
  }, [isLoaded, user, api])
}
