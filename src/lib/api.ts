import { useAuth } from '@clerk/clerk-react'
import { useCallback } from 'react'

export function useApiClient() {
  const { getToken } = useAuth()

  return useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = await getToken()
      const res = await fetch(`/api${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Request failed')
      }
      return res.json()
    },
    [getToken],
  )
}
