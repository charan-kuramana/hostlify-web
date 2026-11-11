import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { useToastStore } from '../../store/toastStore'
import {
  getOwnerById,
  getOwnerHostels,
  getSubscription,
  getFeatureFlags,
  getOccupancyReport,
  getOwnerAuditLogs,
  suspendOwner,
  activateOwner,
  resetOwnerPassword,
  upsertSubscription,
  setFeatureFlag,
  apiErrorMessage,
  PLANS,
  PLAN_CHIP,
  FEATURE_FLAGS,
} from '../../api/superadmin'

interface HostelRow {
  id: number
  name: string
  city: string
  hostelType?: string
  totalBeds?: number
}

interface AuditRow {
  id: number
  action: string
  beforeState?: string | null
  afterState?: string | null
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_OWNER: 'Owner account created',
  SUSPEND_OWNER: 'Account suspended',
  ACTIVATE_OWNER: 'Account re-activated',
  RESET_PASSWORD: 'Password reset',
  CHANGE_PLAN: 'Subscription plan changed',
  SET_FLAG: 'Feature flag changed',
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' })
}

function describeChange(row: AuditRow) {
  const parse = (s?: string | null) => { try { return s ? JSON.parse(s) : null } catch { return null } }
  const before = parse(row.beforeState) as Record<string, unknown> | null
  const after = parse(row.afterState) as Record<string, unknown> | null
  if (!after) return ''
  const key = Object.keys(after)[0]
  if (!key) return ''
  const label = FEATURE_FLAGS.find((f) => f.id === key)?.label ?? key
  const fmt = (v: unknown) => (v === 'true' ? 'on' : v === 'false' ? 'off' : String(v ?? '—'))
  return `${label}: ${fmt(before?.[key])} → ${fmt(after[key])}`
}

export default function OwnerDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ownerId = Number(id)
  const validId = Number.isInteger(ownerId) && ownerId > 0
  const queryClient = useQueryClient()
  const toast = useToastStore((s) => s.show)
  const [resetPasswordInput, setResetPasswordInput] = useState('')
  const [resetConfirmInput, setResetConfirmInput] = useState('')
  const [resetError, setResetError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('')

  const { data: owner, isLoading: ownerLoading, isError: ownerError } = useQuery({
    queryKey: ['sa-owner', ownerId],
    queryFn: () => getOwnerById(ownerId),
    enabled: validId,
    retry: false,
  })

  const { data: hostelsData } = useQuery({
    queryKey: ['sa-owner-hostels', ownerId],
    queryFn: () => getOwnerHostels(ownerId),
    enabled: validId && !!owner,
  })

  const { data: occupancy } = useQuery({
    queryKey: ['sa-occupancy'],
    queryFn: getOccupancyReport,
    enabled: validId && !!owner,
  })

  const { data: subscription } = useQuery({
    queryKey: ['sa-subscription', ownerId],
    queryFn: () => getSubscription(ownerId),
    enabled: validId && !!owner,
    retry: false,
  })

  const { data: featureFlagsData } = useQuery({
    queryKey: ['sa-feature-flags', ownerId],
    queryFn: () => getFeatureFlags(ownerId),
    enabled: validId && !!owner,
  })

  const { data: auditData, isError: auditError } = useQuery({
    queryKey: ['sa-owner-audit', ownerId],
    queryFn: () => getOwnerAuditLogs(ownerId),
    enabled: validId && !!owner,
    retry: false,
  })

  const currentPlan: string = subscription?.planName ?? owner?.subscriptionPlan ?? 'FREE'
  useEffect(() => { setSelectedPlan(currentPlan) }, [currentPlan])

  const refreshOwner = () => {
    queryClient.invalidateQueries({ queryKey: ['sa-owner', ownerId] })
    queryClient.invalidateQueries({ queryKey: ['sa-owners'] })
    queryClient.invalidateQueries({ queryKey: ['sa-owner-audit', ownerId] })
  }

  const statusMutation = useMutation({
    mutationFn: (suspend: boolean) => (suspend ? suspendOwner(ownerId) : activateOwner(ownerId)),
    onSuccess: (_d, suspend) => {
      toast('success', suspend ? 'Owner suspended' : 'Owner re-activated',
        suspend ? 'The owner can no longer sign in.' : 'The owner can sign in again.')
      refreshOwner()
    },
    onError: (err) => toast('error', 'Could not update status', apiErrorMessage(err, 'Please try again.')),
  })

  const planMutation = useMutation({
    mutationFn: (planId: string) => {
      const plan = PLANS.find((p) => p.id === planId)!
      return upsertSubscription({
        ownerId, planName: plan.id, maxHostels: plan.maxHostels, maxBeds: plan.maxBeds, priceMonthly: plan.priceMonthly,
      })
    },
    onSuccess: (_d, planId) => {
      toast('success', 'Plan updated', `Owner moved to the ${planId} plan.`)
      queryClient.invalidateQueries({ queryKey: ['sa-subscription', ownerId] })
      refreshOwner()
    },
    onError: (err) => toast('error', 'Could not change plan', apiErrorMessage(err, 'Please try again.')),
  })

  const flagMutation = useMutation({
    mutationFn: ({ flagName, enabled }: { flagName: string; enabled: boolean }) =>
      setFeatureFlag({ ownerId, flagName, enabled, reason: 'Changed by super admin' }),
    onSuccess: (_d, v) => {
      toast('success', 'Feature flag updated', `${FEATURE_FLAGS.find((f) => f.id === v.flagName)?.label ?? v.flagName} ${v.enabled ? 'enabled' : 'disabled'}.`)
      queryClient.invalidateQueries({ queryKey: ['sa-feature-flags', ownerId] })
      queryClient.invalidateQueries({ queryKey: ['sa-owner-audit', ownerId] })
    },
    onError: (err) => toast('error', 'Could not update flag', apiErrorMessage(err, 'Please try again.')),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (newPassword: string) => resetOwnerPassword(ownerId, newPassword),
    onSuccess: () => {
      setResetPasswordInput('')
      setResetConfirmInput('')
      toast('success', 'Password reset', 'Share the new password with the owner securely.')
      queryClient.invalidateQueries({ queryKey: ['sa-owner-audit', ownerId] })
    },
  })

  if (!validId || ownerError)
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/super-admin/owners')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Back to Owners
        </button>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="font-semibold text-gray-800">Owner not found</p>
          <p className="text-sm text-gray-500 mt-1">This owner does not exist or could not be loaded.</p>
        </div>
      </div>
    )

  if (ownerLoading || !owner)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
      </div>
    )

  const hostels: HostelRow[] = Array.isArray(hostelsData) ? hostelsData : []
  // Per-hostel occupied beds come from the occupancy report (rows keyed by hostelId)
  const occRows: Array<{ hostelId: number; occupiedBeds: number; totalBeds: number }> =
    Array.isArray(occupancy?.hostels) ? occupancy.hostels : []
  const occByHostel = new Map(occRows.map((r) => [r.hostelId, r]))

  const enabledFlags = new Set<string>(
    (Array.isArray(featureFlagsData) ? featureFlagsData : [])
      .filter((f: { enabled?: boolean }) => f.enabled !== false)
      .map((f: { flagName: string }) => f.flagName),
  )
  const knownIds = new Set(FEATURE_FLAGS.map((f) => f.id))
  const flagList = [
    ...FEATURE_FLAGS,
    ...[...enabledFlags].filter((f) => !knownIds.has(f)).map((f) => ({ id: f, label: f })),
  ]

  const ownerName: string = owner.ownerName || owner.businessName || 'Owner'
  const initials = ownerName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const isSuspended = owner.status === 'SUSPENDED'
  const members: number | null = owner.members ?? (occRows.length
    ? hostels.reduce((s, h) => s + (occByHostel.get(h.id)?.occupiedBeds ?? 0), 0)
    : null)
  const auditRows: AuditRow[] = auditData?.content ?? []

  function handleStatusToggle() {
    const msg = isSuspended
      ? `Re-activate ${ownerName}? They will be able to sign in again.`
      : `Suspend ${ownerName}? They (and their session) will lose access to the staff portal immediately.`
    if (window.confirm(msg)) statusMutation.mutate(!isSuspended)
  }

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (resetPasswordInput.length < 8) {
      setResetError('Password must be at least 8 characters')
      return
    }
    if (resetPasswordInput !== resetConfirmInput) {
      setResetError('Passwords do not match')
      return
    }
    setResetError('')
    resetPasswordMutation.mutate(resetPasswordInput)
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/super-admin/owners')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors"
      >
        <ArrowLeft size={16} /> Back to Owners
      </button>

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
          <div className="relative z-10 flex items-end justify-between -mt-9 mb-4 gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg border-4 border-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
            >
              {initials}
            </div>
            <button
              onClick={handleStatusToggle}
              disabled={statusMutation.isPending}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 ${
                isSuspended
                  ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                  : 'text-red-600 border-red-200 hover:bg-red-50'
              }`}
            >
              {statusMutation.isPending
                ? (isSuspended ? 'Activating...' : 'Suspending...')
                : (isSuspended ? 'Activate Account' : 'Suspend Account')}
            </button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">{ownerName}</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${PLAN_CHIP[currentPlan] ?? 'bg-gray-100 text-gray-600'}`}>
              {currentPlan}
            </span>
            <Badge status={owner.status ?? 'ACTIVE'} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {owner.businessName && owner.businessName !== ownerName ? `${owner.businessName} · ` : ''}
            {owner.email ?? ''}{owner.mobile ? ` · ${owner.mobile}` : ''}
          </p>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 border-t border-gray-100">
          {[
            { label: 'Hostels', value: hostels.length },
            { label: 'Members', value: members ?? '—' },
            { label: 'Revenue (lifetime)', value: owner.revenue != null ? `₹${Number(owner.revenue).toLocaleString('en-IN')}` : '—' },
            { label: 'Plan Expiry', value: formatDate(owner.planExpiresAt) },
          ].map((s) => (
            <div key={s.label} className="bg-white px-5 py-3.5 text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{s.label}</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Two-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hostels Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800 text-sm">Hostels</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">City</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Occupancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {hostels.map((h) => {
                  const occ = occByHostel.get(h.id)
                  const capacity = occ?.totalBeds ?? h.totalBeds ?? 0
                  const occupied = occ?.occupiedBeds
                  const rate = capacity > 0 && occupied != null ? Math.round((occupied / capacity) * 100) : 0
                  return (
                    <tr key={h.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-800">{h.name}</td>
                      <td className="px-5 py-3.5 text-gray-500">{h.city}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${rate}%`,
                                background: rate >= 80 ? 'linear-gradient(90deg, #1d6ea8, #1a8fd1)' : 'linear-gradient(90deg, #d97706, #fbbf24)',
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                            {occupied ?? '—'}/{capacity} beds
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {hostels.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-400">
                      No hostels yet — this owner cannot use the staff portal until a hostel is set up.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800 text-sm">Feature Flags</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {flagList.map(({ id: key, label }) => {
              const enabled = enabledFlags.has(key)
              const busy = flagMutation.isPending && flagMutation.variables?.flagName === key
              return (
                <div key={key} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={label}
                    disabled={flagMutation.isPending}
                    onClick={() => flagMutation.mutate({ flagName: key, enabled: !enabled })}
                    className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-60 ${enabled ? 'bg-violet-500' : 'bg-gray-200'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'} ${busy ? 'animate-pulse' : ''}`}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800 text-sm">Subscription</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ['Max hostels', subscription?.maxHostels ?? '—'],
                ['Max beds', subscription?.maxBeds ?? '—'],
                ['Price / month', subscription?.priceMonthly != null ? `₹${Number(subscription.priceMonthly).toLocaleString('en-IN')}` : '—'],
              ].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl bg-gray-50 py-2.5">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{l}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                aria-label="Subscription plan"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {PLANS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · {p.price} · {p.maxHostels} hostel{p.maxHostels > 1 ? 's' : ''} / {p.maxBeds} beds</option>
                ))}
              </select>
              <button
                onClick={() => planMutation.mutate(selectedPlan)}
                disabled={planMutation.isPending || !selectedPlan || selectedPlan === currentPlan}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
              >
                {planMutation.isPending ? 'Saving...' : 'Change Plan'}
              </button>
            </div>
          </div>
        </div>

        {/* Reset Password */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800 text-sm">Reset Owner Password</h3>
          </div>
          <form onSubmit={handleResetPassword} className="p-5 space-y-3">
            <input
              type="password"
              value={resetPasswordInput}
              onChange={(e) => { setResetPasswordInput(e.target.value); setResetError('') }}
              placeholder="New password (min 8 characters)"
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-gray-50 focus:bg-white transition-colors"
            />
            <input
              type="password"
              value={resetConfirmInput}
              onChange={(e) => { setResetConfirmInput(e.target.value); setResetError('') }}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-gray-50 focus:bg-white transition-colors"
            />
            {resetError && <p className="text-sm text-red-500 font-medium">{resetError}</p>}
            {resetPasswordMutation.isSuccess && (
              <p className="text-sm text-emerald-600 font-medium">Password reset successfully. Any account lock was cleared.</p>
            )}
            {resetPasswordMutation.isError && (
              <p className="text-sm text-red-500 font-medium">
                {apiErrorMessage(resetPasswordMutation.error, 'Failed to reset password. Please try again.')}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={resetPasswordMutation.isPending || !resetPasswordInput}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
              >
                {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800 text-sm">Audit Log</h3>
          <p className="text-xs text-gray-400 mt-0.5">Super-admin actions on this owner</p>
        </div>
        <div className="divide-y divide-gray-50">
          {auditRows.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{ACTION_LABELS[a.action] ?? a.action.replace(/_/g, ' ')}</p>
                {describeChange(a) && <p className="text-xs text-gray-500 mt-0.5">{describeChange(a)}</p>}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(a.createdAt, true)}</span>
            </div>
          ))}
          {auditRows.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              {auditError ? 'Audit log is unavailable right now.' : 'No admin actions recorded yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
