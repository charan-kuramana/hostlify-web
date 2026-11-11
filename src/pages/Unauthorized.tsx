import { useNavigate } from 'react-router-dom'
import { Lock, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Unauthorized() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  // Opened directly (no history): go to the user's own portal, or to sign in
  const home = role === 'SUPER_ADMIN' ? '/super-admin/dashboard'
    : role === 'HOSTEL_STAFF' ? '/admin/dashboard'
    : role === 'HOSTELLER' ? '/app/dashboard'
    : '/auth/login'

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#eef1f5' }}>
      <div className="text-center px-6 max-w-sm mx-auto">
        {/* Icon circle */}
        <div className="flex items-center justify-center mb-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #dc2626, #f87171)' }}
          >
            <Lock size={40} className="text-white" />
          </div>
        </div>

        {/* Error code */}
        <p
          className="text-7xl font-black tracking-tight leading-none mb-3"
          style={{ background: 'linear-gradient(135deg, #dc2626, #f87171)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          403
        </p>

        {/* Message */}
        <h2 className="text-xl font-bold text-gray-900 mt-2">Access Denied</h2>
        <p className="text-gray-500 text-sm mt-2 leading-relaxed">
          You don't have permission to view this page. Please contact your administrator if you believe this is a mistake.
        </p>

        {/* Button */}
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(home, { replace: true }))}
          className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-md"
          style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
        >
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    </div>
  )
}
