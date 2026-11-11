import { useState } from 'react'
import { Mail, Shield, Save, AlertTriangle } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { changeStaffPassword } from '../../api/staff'

interface PasswordState {
  current: string
  newPass: string
  confirm: string
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-brand-50 text-brand-700',
  SUPERVISOR: 'bg-purple-50 text-purple-700',
  OWNER: 'bg-amber-50 text-amber-700',
}

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase()
}

export default function Account() {
  const { email, subRole } = useAuthStore()
  const [passwords, setPasswords] = useState<PasswordState>({ current: '', newPass: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [passError, setPassError] = useState('')
  const [passMsg, setPassMsg] = useState('')

  const displayRole = subRole ?? 'ADMIN'
  const displayEmail = email ?? ''

  // Only the password is editable here (email is the login id). The old handler showed
  // "Saved successfully!" / "coming soon" without calling any API.
  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setPassMsg('')
    if (!passwords.current) { setPassError('Enter your current password.'); return }
    if (passwords.newPass.length < 8) { setPassError('Password must be at least 8 characters.'); return }
    if (passwords.newPass !== passwords.confirm) { setPassError('New passwords do not match.'); return }
    setPassError('')
    setSaving(true)
    try {
      await changeStaffPassword(passwords.current, passwords.newPass)
      setPasswords({ current: '', newPass: '', confirm: '' })
      setPassMsg('Password changed.')
    } catch (err: any) {
      setPassError(err?.response?.status === 404 || err?.response?.status === 405
        ? 'Password change is not available on this server yet.'
        : err?.response?.data?.message ?? 'Could not change password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Account"
        subtitle="Manage your profile and security settings"
      />

      {/* Profile hero card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div
          className="h-24 w-full"
          style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
        />
        <div className="px-6 pb-5 -mt-7 relative">
          <div className="flex items-end gap-4">
            <div className="relative">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-lg border-2 border-white"
                style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
              >
                {getInitials(displayEmail)}
              </div>
            </div>
            <div className="pb-0.5">
              <p className="font-bold text-gray-900">{displayEmail}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[displayRole] ?? 'bg-gray-100 text-gray-600'}`}>
                  <Shield size={10} />
                  {displayRole}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Mail size={12} className="text-gray-400" />
              {displayEmail}
            </div>
          </div>
        </div>
      </div>

      {/* Two-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit Profile */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 text-sm mb-5">Login & Security</h3>
          <form onSubmit={handleProfileSave} className="space-y-5">
            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
              <input
                value={displayEmail}
                readOnly
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Change Password</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={passwords.newPass}
                      onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))}
                      placeholder="Min. 8 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                      placeholder="Re-enter new password"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 ${
                        passError ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                  </div>
                </div>
                {passError && (
                  <p className="text-xs text-red-500 font-medium">{passError}</p>
                )}
                {passMsg && (
                  <p className="text-xs text-emerald-600 font-medium">{passMsg}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
              >
                <Save size={14} />
                {saving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={14} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm">Danger Zone</h3>
          </div>
          {/* The former "Deactivate My Account" button had no handler or API */}
          <p className="text-xs text-gray-500 leading-relaxed">
            To deactivate this staff account, ask the hostel owner (Staff & Employees page) or Hostlify support.
          </p>
        </div>
      </div>
    </div>
  )
}
