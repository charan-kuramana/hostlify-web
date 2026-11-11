import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { getSAAccount, changeSAPassword, apiErrorMessage } from '../../api/superadmin'

function formatDate(value?: string | null, withTime = false) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'long', year: 'numeric' })
}

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-gray-50 focus:bg-white transition-colors'

export default function SAAccount() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { email: storeEmail, logout } = useAuthStore()
  const toast = useToastStore((s) => s.show)

  // Account details (email, mobile, last login...). Falls back to the login email if unavailable.
  const { data: account } = useQuery({ queryKey: ['sa-account'], queryFn: getSAAccount, retry: false })

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [pwError, setPwError] = useState('')

  const pwMutation = useMutation({
    mutationFn: () => changeSAPassword(passwords.current, passwords.newPass),
    onSuccess: () => {
      setPasswords({ current: '', newPass: '', confirm: '' })
      toast('success', 'Password updated', 'Use your new password next time you sign in.')
    },
    onError: (err) => setPwError(apiErrorMessage(err, 'Could not update password. Please try again.')),
  })

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!passwords.current) return setPwError('Enter your current password')
    if (passwords.newPass.length < 8) return setPwError('New password must be at least 8 characters')
    if (passwords.newPass !== passwords.confirm) return setPwError('New passwords do not match')
    if (passwords.newPass === passwords.current) return setPwError('New password must be different from the current password')
    setPwError('')
    pwMutation.mutate()
  }

  async function handleSignOut() {
    await logout()
    queryClient.clear()
    navigate('/auth/super-admin/login', { replace: true })
  }

  const email: string = account?.email ?? storeEmail ?? ''
  const initials = (email[0] ?? 'S').toUpperCase() + 'A'

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div
          className="h-20 relative"
          style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
        >
          <div
            className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #3aaee8, transparent)', transform: 'translate(30%, -30%)' }}
          />
        </div>
        <div className="px-6 pb-6">
          <div className="relative z-10 flex items-end gap-4 -mt-9 mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg border-4 border-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
            >
              {initials}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">Super Admin</h2>
            <span className="text-xs font-semibold bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full">
              SUPER ADMIN
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{email}</p>
          {account?.createdAt && (
            <p className="text-xs text-gray-400 mt-0.5">Member since {formatDate(account.createdAt)}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800 text-sm">Change Password</h3>
          </div>
          <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
            {[
              { key: 'current', label: 'Current Password', auto: 'current-password' },
              { key: 'newPass', label: 'New Password', auto: 'new-password' },
              { key: 'confirm', label: 'Confirm New Password', auto: 'new-password' },
            ].map((field) => (
              <div key={field.key}>
                <label htmlFor={`pw-${field.key}`} className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {field.label}
                </label>
                <input
                  id={`pw-${field.key}`}
                  type="password"
                  autoComplete={field.auto}
                  value={passwords[field.key as keyof typeof passwords]}
                  onChange={(e) => { setPasswords((p) => ({ ...p, [field.key]: e.target.value })); setPwError('') }}
                  className={inputCls}
                />
              </div>
            ))}
            {pwError && <p className="text-sm text-red-500 font-medium">{pwError}</p>}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={pwMutation.isPending}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
              >
                {pwMutation.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Account Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <Shield size={14} className="text-violet-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">Account Info</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                ['Email', email || '—'],
                ['Mobile', account?.mobile || '—'],
                ['Role', 'SUPER_ADMIN'],
                ['Status', account?.status ?? 'ACTIVE'],
                ['Signed in', formatDate(account?.lastLoginAt, true)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-medium text-gray-700">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Sign out</p>
              <p className="text-xs text-gray-500 mt-0.5">End this session on this device</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 bg-white transition-colors whitespace-nowrap"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
