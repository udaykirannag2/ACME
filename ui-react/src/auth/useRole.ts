import { useState, useEffect } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'

export type Role = 'admin' | 'viewer' | 'none' | 'loading'

/**
 * Returns the current user's role derived from the Cognito JWT `cognito:groups` claim.
 * Groups are sourced from IAM Identity Center (acme-finance-admin / acme-finance-viewer)
 * and mapped to Cognito groups at federation time.
 *
 * Returns 'loading' while the session is being fetched.
 * Returns 'none' when auth is disabled (local dev) — treated as full access.
 */
export function useRole(): Role {
  // Local dev — no Cognito configured, treat as unrestricted
  if (!import.meta.env.VITE_COGNITO_USER_POOL_ID) return 'none'

  const [role, setRole] = useState<Role>('loading')

  useEffect(() => {
    fetchAuthSession()
      .then(session => {
        const groups =
          (session.tokens?.idToken?.payload['cognito:groups'] as string[] | undefined) ?? []
        if (groups.includes('admin'))       setRole('admin')
        else if (groups.includes('viewer')) setRole('viewer')
        else                                setRole('none')
      })
      .catch(() => setRole('none'))
  }, [])

  return role
}

/** Returns true when the user has at least viewer-level access. */
export function useCanRead(): boolean {
  const role = useRole()
  return role === 'admin' || role === 'viewer' || role === 'none' // 'none' = local dev
}

/** Returns true when the user has admin-level access. */
export function useIsAdmin(): boolean {
  const role = useRole()
  return role === 'admin' || role === 'none' // 'none' = local dev
}
