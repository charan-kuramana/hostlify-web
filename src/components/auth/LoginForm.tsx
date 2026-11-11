import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { STRINGS } from '../../constants/strings'
import Button from '../common/Button'
import Input from '../common/Input'

interface LoginFormProps {
  portalLabel: string
  onSubmit: (email: string, password: string) => void
  isLoading: boolean
  error?: string | null
  otherPortals?: { label: string; to: string }[]
  signupLink?: { label: string; to: string }
}

export default function LoginForm({
  portalLabel,
  onSubmit,
  isLoading,
  error,
  otherPortals,
  signupLink,
}: LoginFormProps) {
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    onSubmit(email.trim(), password)
  }

  return (
    <div className="login-page">
      {/* Background decoration from wireframe */}
      <div className="absolute bottom-[-80px] left-[-80px] w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(58,174,232,0.1)_0%,transparent_70%)]" />
      <div className="absolute top-10 left-10 hidden md:block">
        <div className="text-2xl font-bold text-white tracking-tight">{STRINGS.common.appName}</div>
        <div className="text-xs text-white/40 mt-0.5">{STRINGS.common.smartManagement}</div>
      </div>

      <div className="login-card">
        <div className="text-2xl font-bold text-slate-800 tracking-tight mb-1">
          {STRINGS.common.appName}
        </div>
        <div className="text-[13px] text-gray-400 mb-7">
          {portalLabel} · {STRINGS.auth.signIn}
        </div>

        {error && (
          <div className="alert alert-danger mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={STRINGS.auth.email}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={STRINGS.auth.emailPlaceholder}
          />

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="form-label mb-0">{STRINGS.auth.password}</label>
              <Link
                to="/auth/forgot-password"
                state={{ loginPath: location.pathname }}
                className="text-xs text-brand-600 hover:underline font-normal"
              >
                {STRINGS.auth.forgotPassword}
              </Link>
            </div>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={STRINGS.auth.passwordPlaceholder}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            isLoading={isLoading}
            className="w-full justify-center mt-2"
          >
            {STRINGS.auth.signIn}
          </Button>
        </form>

        {signupLink && (
          <div className="mt-5 text-center text-[13px] text-gray-400">
            {STRINGS.auth.newResident}{' '}
            <Link to={signupLink.to} className="text-brand-600 font-medium hover:underline">
              {signupLink.label}
            </Link>
          </div>
        )}

        {otherPortals && otherPortals.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-2">Other portals</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {otherPortals.map((portal) => (
                <Link
                  key={portal.to}
                  to={portal.to}
                  className="text-xs text-brand-600 font-medium hover:underline"
                >
                  {portal.label} →
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
