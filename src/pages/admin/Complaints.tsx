import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, X } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import { getHostelComplaints, resolveComplaint } from '../../api/staff'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'

const STATUSES = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

const AVATAR_COLORS = [
  'bg-brand-500', 'bg-emerald-500', 'bg-purple-500',
  'bg-rose-500',   'bg-teal-500',
]

const CATEGORY_CHIP: Record<string, string> = {
  Maintenance: 'bg-blue-50 text-blue-700',
  Cleanliness: 'bg-teal-50 text-teal-700',
  Food:        'bg-orange-50 text-orange-700',
  Noise:       'bg-purple-50 text-purple-700',
  Security:    'bg-red-50 text-red-700',
  Other:       'bg-gray-100 text-gray-600',
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function AdminComplaints() {
  const { activeHostelId } = useAuthStore()
  const queryClient = useQueryClient()
  const { show } = useToastStore()
  const [statusFilter, setStatusFilter] = useState('ALL')
  // Complaint open in the detail/resolve modal (pendingStatus = status chosen but not saved yet)
  const [detail, setDetail] = useState<{ c: any; pendingStatus: string } | null>(null)
  const [resolution, setResolution] = useState('')

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints', activeHostelId],
    queryFn: () => getHostelComplaints(activeHostelId!),
    enabled: !!activeHostelId,
  })

  const resolveMut = useMutation({
    mutationFn: ({ id, status, resolution }: { id: number; status: string; resolution?: string }) => {
      const payload: Record<string, unknown> = { status }
      if (resolution) payload.resolution = resolution
      return resolveComplaint(id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', activeHostelId] })
      setDetail(null)
      show('success', 'Complaint updated', 'Status has been updated.')
    },
    onError: (e: any) => {
      show('error', 'Update failed', e?.response?.data?.message ?? 'Could not update complaint status.')
    },
  })

  const filtered = statusFilter === 'ALL'
    ? complaints
    : complaints.filter((c: any) => c.status === statusFilter)

  function updateStatus(c: any, status: string) {
    // Resolving/closing asks for resolution notes (visible to the resident); other moves save directly
    if (status === 'RESOLVED' || status === 'CLOSED') {
      setResolution(c.resolutionNotes ?? '')
      setDetail({ c, pendingStatus: status })
    } else {
      resolveMut.mutate({ id: c.id, status })
    }
  }

  function openDetail(c: any) {
    setResolution(c.resolutionNotes ?? '')
    setDetail({ c, pendingStatus: c.status })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complaints"
        subtitle="Manage and resolve resident complaints"
        count={filtered.length}
      />

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-600'
            }`}
          >
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Resident</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Complaint</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c: any, i: number) => (
                <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                      >
                        {getInitials(c.hostellerName ?? '??')}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{c.hostellerName}</p>
                        <p className="text-xs text-gray-400">Room {c.roomNumber ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <button type="button" onClick={() => openDetail(c)} title="View details" className="block font-medium text-gray-800 truncate max-w-[180px] text-left hover:text-brand-600 hover:underline">{c.title}</button>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${CATEGORY_CHIP[c.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge status={c.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={c.status}
                      onChange={(e) => updateStatus(c, e.target.value)}
                      disabled={resolveMut.isPending}
                      className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-gray-700 font-medium disabled:opacity-60"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                      <MessageSquare size={18} className="text-gray-300" />
                    </div>
                    <p className="font-semibold text-gray-400 text-sm">No complaints found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-gray-900">{detail.c.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{detail.c.hostellerName ?? '—'} · Room {detail.c.roomNumber ?? '—'} · {detail.c.category}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{detail.c.description || 'No description provided.'}</p>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
              <select value={detail.pendingStatus} onChange={(e) => setDetail({ ...detail, pendingStatus: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            {(detail.pendingStatus === 'RESOLVED' || detail.pendingStatus === 'CLOSED') && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Resolution notes</label>
                <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3}
                  placeholder="What was done to fix this?"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDetail(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => resolveMut.mutate({ id: detail.c.id, status: detail.pendingStatus, resolution: resolution.trim() || undefined })}
                disabled={resolveMut.isPending || detail.pendingStatus === detail.c.status && resolution.trim() === (detail.c.resolutionNotes ?? '')
                  || ((detail.pendingStatus === 'RESOLVED' || detail.pendingStatus === 'CLOSED') && !resolution.trim())}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60">
                {resolveMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
