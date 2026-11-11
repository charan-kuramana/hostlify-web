import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserCheck, UserMinus } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import { getHostelLeaves, reviewLeave, getLeaveOccupancy } from '../../api/staff'
import { useToastStore } from '../../store/toastStore'
import { useAuthStore } from '../../store/authStore'

function todayISO(offset = 0) {
  // Local date (toISOString() is UTC and gives yesterday before 05:30 IST)
  const d = new Date(); d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(d?: string) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

export default function AdminLeave() {
  const queryClient = useQueryClient()
  const { show } = useToastStore()
  const { activeHostelId } = useAuthStore()

  const [from, setFrom] = useState(todayISO(0))
  const [to, setTo] = useState(todayISO(7))
  const { data: occupancy } = useQuery({
    queryKey: ['leave-occupancy', activeHostelId, from, to],
    queryFn: () => getLeaveOccupancy(activeHostelId!, from, to),
    enabled: !!activeHostelId && !!from && !!to,
  })

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leaves', activeHostelId],
    queryFn: () => getHostelLeaves(activeHostelId!),
    enabled: !!activeHostelId,
  })

  const reviewMut = useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: 'APPROVED' | 'REJECTED'; reason?: string }) =>
      reviewLeave(id, { status, ...(reason ? { reason } : {}) }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] })
      queryClient.invalidateQueries({ queryKey: ['leave-occupancy'] })
      if (vars.status === 'APPROVED') {
        show('success', 'Leave approved', 'The leave request has been approved.')
      } else {
        show('success', 'Leave rejected', 'The leave request has been rejected.')
      }
    },
    onError: (e: any) => {
      show('error', 'Action failed', e?.response?.data?.message ?? 'Could not process the leave request. Please try again.')
    },
  })

  function updateStatus(id: number, status: 'APPROVED' | 'REJECTED') {
    reviewMut.mutate({ id, status })
  }


  const pending = leaves.filter((l: any) => l.status === 'PENDING')
  const rest = leaves.filter((l: any) => l.status !== 'PENDING')

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Requests" subtitle="Review approvals and plan occupancy" />

      {/* Occupancy planner (from approved leaves) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Expected occupancy from</label>
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To</label>
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Residents" value={occupancy?.totalResidents ?? 0} sub="Active in hostel"
            icon={<Users size={20} className="text-brand-600" />} iconBg="bg-brand-50" />
          <StatCard label="On Leave" value={occupancy?.onLeave ?? 0} sub="Approved leaves in range"
            icon={<UserMinus size={20} className="text-amber-600" />} iconBg="bg-amber-50" />
          <StatCard label="Expected Occupancy" value={occupancy?.expectedOccupancy ?? 0} sub="Plan food & resources for"
            icon={<UserCheck size={20} className="text-emerald-600" />} iconBg="bg-emerald-50" />
        </div>
        {(occupancy?.onLeaveResidents?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs font-semibold text-gray-400 self-center">Away:</span>
            {(occupancy.onLeaveResidents as any[]).map((r) => (
              <span key={r.hostellerId} className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full">
                {r.name ?? `#${r.hostellerId}`} · {r.leaveType}
              </span>
            ))}
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
            Pending Approval ({pending.length})
          </h2>
          {pending.map((l: any) => (
            <div key={l.id} className="bg-white rounded-xl border border-amber-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{l.hostellerName ?? l.applicantName}</p>
                    {l.leaveType && <span className="text-xs text-gray-400">{l.leaveType}</span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {fmtDate(l.fromDate)} → {fmtDate(l.toDate)}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{l.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">Applied: {fmtDate(l.appliedAt ?? l.createdAt)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => updateStatus(l.id, 'REJECTED')}
                    disabled={reviewMut.isPending}
                    className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => updateStatus(l.id, 'APPROVED')}
                    disabled={reviewMut.isPending}
                    className="px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">All Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Resident</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Dates</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Reason</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Applied</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rest.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm font-semibold text-gray-400">
                    No reviewed requests yet
                  </td>
                </tr>
              )}
              {rest.map((l: any) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-800">{l.hostellerName ?? l.applicantName}</p>
                    {l.leaveType && <p className="text-xs text-gray-400">{l.leaveType}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{fmtDate(l.fromDate)} – {fmtDate(l.toDate)}</td>
                  <td className="px-5 py-3.5 text-gray-600 max-w-xs truncate">{l.reason}</td>
                  <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{fmtDate(l.appliedAt ?? l.createdAt)}</td>
                  <td className="px-5 py-3.5"><Badge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
