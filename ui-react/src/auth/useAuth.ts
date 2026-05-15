import { useState, useEffect } from 'react'
import { getCurrentUser, signInWithRedirect, signOut as amplifySignOut } from 'aws-amplify/auth'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: { username: string; userId: string } | null
}

export function useAuth(): AuthState & { signIn: () => void; signOut: () => void } {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  })

  useEffect(() => {
    getCurrentUser()
      .then(user => setState({ isAuthenticated: true, isLoading: false, user }))
      .catch(() => setState({ isAuthenticated: false, isLoading: false, user: null }))
  }, [])

  return {
    ...state,
    signIn: () => signInWithRedirect({ provider: { custom: 'IAMIdentityCenter' } }),
    signOut: () => amplifySignOut(),
  }
}
