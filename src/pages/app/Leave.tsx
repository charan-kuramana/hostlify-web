import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, CalendarCheck, CalendarX, Clock, CalendarClock, AlertTriangle } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { getMyLeaves, applyLeave } from '../../api/hosteller'
import NoStay from './NoStay'

const todayStr = () => new Date().toLocaleDateString('en-CA') // local YYYY-MM-DD

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const LEAVE_TYPES = [
  { value: 'CASUAL', label: 'Casual Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'HOME', label: 'Going Home' },
  { value: 'VACATE', label: 'Vacate (Permanent)' },
]

export default function Leave() {
  const { hostellerProfileId, hostelId } = useAuthStore()
  const queryClient = useQueryClient()
  const { show } = useToastStore()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ fromDate: '', toDate: '', reason: '', leaveType: 'CASUAL' })
  const [showVacateConfirm, setShowVacateConfirm] = useState(false)
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const { data: leaves, isLoading, error } = useQuery({
    queryKey: ['my-leaves', hostellerProfileId],
    queryFn: () => getMyLeaves(hostellerProfileId!),
    enabled: !!hostellerProfileId,
  })

  const applyMutation = useMutation({
    mutationFn: applyLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leaves', hostellerProfileId] })
      setShowForm(false)
      setShowVacateConfirm(false)
      setForm({ fromDate: '', toDate: '', reason: '', leaveType: 'CASUAL' })
      show('success', 'Leave applied', 'Your leave request has been submitted for approval.')
    },
    onError: (e: any) => {
      setShowVacateConfirm(false)
      // 400/409 already toast the server's reason (api/client.ts)
      if (![400, 409].includes(e?.response?.status)) show('error', 'Failed to apply leave', 'Please check your details and try again.')
    },
  })

  function validate() {
    const e: Partial<typeof form> = {}
    if (!form.fromDate) e.fromDate = 'From date is required'
    else if (form.fromDate < todayStr()) e.fromDate = 'From date cannot be in the past'
    if (!form.toDate)   e.toDate   = 'To date is required'
    else if (form.fromDate && form.toDate < form.fromDate) e.toDate = 'To date must be on or after the from date'
    if (!form.reason.trim()) e.reason = 'Reason is required'
    else if (form.reason.trim().length > 1000) e.reason = 'Reason must be 1000 characters or less'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    if (form.leaveType === 'VACATE') {
      setShowVacateConfirm(true)
      return
    }
    submitLeave()
  }

  function submitLeave() {
    applyMutation.mutate({
      fromDate: form.fromDate,
      toDate: form.toDate,
      reason: form.reason.trim(),
      leaveType: form.leaveType,
      hostellerProfileId,
    })
  }

  const leavesList = leaves ?? []
  const approved = leavesList.filter((l: any) => l.status === 'APPROVED').length
  const pending = leavesList.filter((l: any) => l.status === 'PENDING').length
  const rejected = leavesList.filter((l: any) => l.status === 'REJECTED').length

  if (!hostelId) return <NoStay title="Leave Requests" subtitle="Apply for leave and track approvals" />

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  if (error) return <div className="text-center py-20 text-gray-400">Failed to load data</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Requests"
        subtitle="Apply for leave and track approvals"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
          >
            <Plus size={16} /> Apply Leave
          </button>
        }
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Approved"
          value={approved}
          sub="Leave requests approved"
          icon={<CalendarCheck size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Pending"
          value={pending}
          sub="Awaiting approval"
          icon={<Clock size={20} className="text-amber-500" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Rejected"
          value={rejected}
          sub="Leave requests rejected"
          icon={<CalendarX size={20} className="text-red-500" />}
          iconBg="bg-red-50"
        />
      </div>

      {/* New leave request form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid #e0e7ff' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
                <CalendarClock size={14} className="text-brand-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">New Leave Request</h3>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Leave Type</label>
              <select
                required
                value={form.leaveType}
                onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors"
              >
                {LEAVE_TYPES.map((lt) => (
                  <option key={lt.value} value={lt.value}>{lt.label}</option>
                ))}
              </select>
              {form.leaveType === 'VACATE' && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle size={12} /> This will permanently vacate your bed and cannot be undone.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">From Date</label>
                <input
                  type="date"
                  min={todayStr()}
                  value={form.fromDate}
                  onChange={(e) => { setForm((f) => ({ ...f, fromDate: e.target.value })); setErrors((er) => ({ ...er, fromDate: undefined })) }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors ${errors.fromDate ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.fromDate && <p className="mt-1 text-xs text-red-500">{errors.fromDate}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To Date</label>
                <input
                  type="date"
                  min={form.fromDate || todayStr()}
                  value={form.toDate}
                  onChange={(e) => { setForm((f) => ({ ...f, toDate: e.target.value })); setErrors((er) => ({ ...er, toDate: undefined })) }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors ${errors.toDate ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.toDate && <p className="mt-1 text-xs text-red-500">{errors.toDate}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Reason</label>
              <textarea
                required
                rows={3}
                maxLength={1000}
                value={form.reason}
                onChange={(e) => { setForm((f) => ({ ...f, reason: e.target.value })); setErrors((er) => ({ ...er, reason: undefined })) }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-gray-50 focus:bg-white transition-colors ${errors.reason ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Reason for leave…"
              />
              {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason}</p>}
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={applyMutation.isPending}
                className="px-5 py-2 text-sm rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: form.leaveType === 'VACATE' ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
              >
                {applyMutation.isPending ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VACATE confirmation modal */}
      {showVacateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Vacate Confirmation</h3>
                <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-6">
              This will permanently vacate your bed. Your booking will be closed and you will lose access to this hostel. <span className="font-semibold text-red-600">This cannot be undone.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowVacateConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitLeave}
                disabled={applyMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}
              >
                {applyMutation.isPending ? 'Submitting…' : 'Yes, Vacate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave history cards */}
      <div className="space-y-3">
        {leavesList.map((l: any) => (
          <div
            key={l.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {l.leaveType && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.leaveType === 'VACATE' ? 'bg-red-100 text-red-700' : 'bg-brand-50 text-brand-700'}`}>
                      {LEAVE_TYPES.find((lt) => lt.value === l.leaveType)?.label ?? l.leaveType}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-800 text-sm">{l.reason}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
                    <CalendarClock size={12} className="text-gray-400" />
                    {fmtDate(l.fromDate)} — {fmtDate(l.toDate)}
                  </span>
                </div>
              </div>
              <Badge status={l.status} />
            </div>
            <p className="text-xs text-gray-400 mt-1 font-medium">Applied {fmtDate(l.appliedAt ?? l.createdAt)}</p>
          </div>
        ))}
        {leavesList.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <CalendarClock size={22} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-500 text-sm">No leave requests yet</p>
            <p className="text-xs text-gray-400 mt-1">Apply for leave using the button above</p>
          </div>
        )}
      </div>
    </div>
  )
}
