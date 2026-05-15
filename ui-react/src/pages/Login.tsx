import { LogIn } from 'lucide-react'
import { useAuth } from '../auth/useAuth'

export default function Login() {
  const { signIn } = useAuth()

  return (
    <div className="flex items-center justify-center h-screen bg-atlas-bg">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm px-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #0b66e4, #6c4ad9)' }}
        >
          <LogIn size={26} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-atlas-ink">ACME Finance</h1>
          <p className="text-sm text-atlas-inkDim mt-1">
            Sign in with your organization account to continue
          </p>
        </div>
        <button
          onClick={signIn}
          className="w-full py-2.5 px-6 rounded-xl bg-atlas-brand text-white text-sm font-medium hover:bg-atlas-brandDeep transition-colors"
        >
          Sign in with AWS IAM Identity Center
        </button>
        <p className="text-xs text-atlas-inkMute">
          Use your ACME organization credentials
        </p>
      </div>
    </div>
  )
}
