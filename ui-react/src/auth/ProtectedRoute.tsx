import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { useRole } from './useRole'

export default function ProtectedRoute() {
  // Local dev — Cognito not configured, pass through unconditionally
  if (!import.meta.env.VITE_COGNITO_USER_POOL_ID) {
    return <Outlet />
  }

  const { isAuthenticated, isLoading } = useAuth()
  const role = useRole()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading || role === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-atlas-bg">
        <div className="text-atlas-inkDim text-sm">Loading…</div>
      </div>
    )
  }

  // Authenticated but no group assigned in IAM Identity Center
  if (isAuthenticated && role === 'none') {
    return (
      <div className="flex items-center justify-center h-screen bg-atlas-bg">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm px-6">
          <p className="font-semibold text-atlas-ink">Access not configured</p>
          <p className="text-sm text-atlas-inkDim">
            Your account is not assigned to a finance role.
            Contact your admin to be added to{' '}
            <code className="text-xs bg-atlas-bgSunken px-1 py-0.5 rounded">acme-finance-admin</code>
            {' '}or{' '}
            <code className="text-xs bg-atlas-bgSunken px-1 py-0.5 rounded">acme-finance-viewer</code>
            {' '}in IAM Identity Center.
          </p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? <Outlet /> : null
}
