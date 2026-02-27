import { useAuth } from '@clerk/clerk-react'
import { useCallback } from 'react'

export function useApiClient() {
  const { getToken, signOut } = useAuth()

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
        if (res.status === 401) {
          await signOut()
          window.location.href = '/sign-in'
          throw new Error('Session expired')
        }
        const err = await res.json()
        throw new Error(err.error?.message || 'Request failed')
      }
      return res.json()
    },
    [getToken, signOut],
  )
}
