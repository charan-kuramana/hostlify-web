import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAllComplaints } from '../../api/superadmin'
import { MessageSquare, AlertCircle } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'

interface SAComplaint {
  id: number
  hostel: string
  owner: string
  member: string
  title: string
  category: string
  status: string
  priority: string
  date: string
}

const PRIORITY_CHIP: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-50 text-orange-700',
  MEDIUM: 'bg-amber-50 text-amber-700',
  LOW: 'bg-gray-100 text-gray-500',
}

const CATEGORY_COLORS: Record<string, string> = {
  Maintenance: 'bg-blue-50 text-blue-700',
  Food: 'bg-orange-50 text-orange-700',
  Other: 'bg-gray-100 text-gray-600',
  Plumbing: 'bg-teal-50 text-teal-700',
  Security: 'bg-red-50 text-red-700',
}

type StatusFilter = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'

export default function SAComplaints() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  const { data } = useQuery({ queryKey: ['sa-complaints'], queryFn: getAllComplaints })
  const complaints: SAComplaint[] = (Array.isArray(data) ? data : []).map((c: SAComplaint & { createdAt?: string }) => ({
    ...c,
    date: c.createdAt
      ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—',
  }))

  const filtered = statusFilter === 'ALL'
    ? complaints
    : complaints.filter((c) => c.status === statusFilter)

  const openCount = complaints.filter((c) => c.status === 'OPEN').length
  const inProgressCount = complaints.filter((c) => c.status === 'IN_PROGRESS').length
  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED').length
  const urgentCount = complaints.filter((c) => c.priority === 'URGENT' || c.priority === 'HIGH').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complaint Monitor"
        subtitle="Platform-wide complaints"
        count={filtered.length}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Open"
          value={openCount}
          sub="Awaiting action"
          icon={<MessageSquare size={20} className="text-amber-600" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          sub="Being worked on"
          icon={<MessageSquare size={20} className="text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Resolved"
          value={resolvedCount}
          sub="Successfully closed"
          icon={<MessageSquare size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="High / Urgent"
          value={urgentCount}
          sub="Require immediate attention"
          icon={<AlertCircle size={20} className="text-red-500" />}
          iconBg="bg-red-50"
        />
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600'
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hostel</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Member</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Complaint</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Priority</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-800 text-sm">{c.hostel}</p>
                    <p className="text-xs text-gray-400">{c.owner}</p>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-700">{c.member}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-800">{c.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[c.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${PRIORITY_CHIP[c.priority] ?? 'bg-gray-100 text-gray-500'}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{c.date}</td>
                  <td className="px-5 py-3.5"><Badge status={c.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
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
    </div>
  )
}
