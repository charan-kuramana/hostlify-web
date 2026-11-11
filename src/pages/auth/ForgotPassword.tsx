import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { requestPasswordOtp, resetPassword } from '../../api/auth'

export default function ForgotPassword() {
  const navigate = useNavigate()
  // Return to the login page of the portal the user came from (hosteller / staff / super admin)
  const fromLogin = (useLocation().state as { loginPath?: string } | null)?.loginPath
  const loginPath = fromLogin?.startsWith('/auth/') ? fromLogin : '/auth/login'
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const apiError = (err: unknown, fallback: string) =>
    axios.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await requestPasswordOtp(email)
      setStep(2)
    } catch (err) {
      setError(apiError(err, 'Could not send OTP. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit OTP')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setBusy(true)
    try {
      await resetPassword(email, otp.trim(), newPassword)
      setStep(3)
    } catch (err) {
      setError(apiError(err, 'Could not reset password. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-3 shadow-lg">
            <KeyRound size={26} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Forgot Password</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {step === 1 && 'Enter your email to receive an OTP'}
            {step === 2 && 'Enter the OTP and set a new password'}
            {step === 3 && 'Your password has been reset'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Step indicator */}
          <div className="flex">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 transition-all ${s <= step ? 'bg-brand-500' : 'bg-gray-100'}`}
              />
            ))}
          </div>

          <div className="p-7">
            {/* Step 1: Email */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                {error && (
                  <p className="text-xs text-red-500 font-medium">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
                >
                  {busy ? 'Sending…' : 'Send OTP'}
                </button>
              </form>
            )}

            {/* Step 2: OTP + new password */}
            {step === 2 && (
              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    OTP (sent to {email})
                  </label>
                  <input
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    placeholder="6-digit OTP"
                    maxLength={6}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-center tracking-[0.3em] font-bold focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-500 font-medium">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
                >
                  {busy ? 'Resetting…' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep(1); setOtp(''); setError('') }}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Resend OTP
                </button>
              </form>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={30} className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Password Reset Successfully</h3>
                  <p className="text-sm text-gray-500 mt-1">You can now log in with your new password.</p>
                </div>
                <button
                  onClick={() => navigate(loginPath, { replace: true })}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
                >
                  Go to Login
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Back to login */}
        {step !== 3 && (
          <button
            onClick={() => navigate(loginPath)}
            className="flex items-center gap-1.5 mx-auto mt-5 text-xs font-medium transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            <ArrowLeft size={13} />
            Back to Login
          </button>
        )}
      </div>
    </div>
  )
}
