import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, Home, ClipboardList, MessageSquare, TrendingUp, ChevronRight } from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import { getStaffDashboard } from '../../api/staff'
import { useAuthStore } from '../../store/authStore'

const inr = (n: number) => '₹' + Number(n ?? 0).toLocaleString('en-IN')
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''

const QUICK_ACTIONS = [
  { label: 'Booking Requests',    to: '/admin/allocations', bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-700',   icon: ClipboardList },
  { label: 'Record Payment',      to: '/admin/payments',    bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', icon: TrendingUp },
  { label: 'View Complaints',     to: '/admin/complaints',  bg: 'bg-red-50',     border: 'border-red-100',     text: 'text-red-600',     icon: MessageSquare },
  { label: 'Post Announcement',   to: '/admin/announcements',bg: 'bg-brand-50', border: 'border-brand-100',  text: 'text-brand-700',  icon: Users },
]

export default function AdminDashboard() {
  const { activeHostelId } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['staffDashboard', activeHostelId],
    queryFn: () => getStaffDashboard(activeHostelId!),
    enabled: !!activeHostelId,
  })

  // Real figures for the active hostel (the old card counted every PENDING applicant platform-wide)
  const pendingAllocationsCount = ((data?.bookingRequests ?? []) as any[])
    .filter((r) => r.status === 'PENDING_APPROVAL' || r.status === 'REASSIGNED').length
  const membersCount = ((data?.members ?? []) as any[]).filter((m) => m.status === 'ACTIVE').length
  const pendingDues = (data?.pendingDues ?? []) as any[]
  const pendingDuesAmount = pendingDues.reduce((s, d) => s + Math.max(0, Number(d.amount ?? 0) - Number(d.paidAmount ?? 0)), 0)
  const now = new Date()
  const monthPayments = ((data?.payments ?? []) as any[]).filter((p) => {
    const d = p.paymentDate ? new Date(p.paymentDate) : null
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthlyRevenue = monthPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const openComplaints = ((data?.complaints ?? []) as any[]).filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS')
  const recentActivity = [
    ...((data?.payments ?? []) as any[]).slice(0, 5).map((p) => ({
      id: 'p' + p.id, type: 'PAID', date: p.paymentDate,
      text: `${inr(p.amount)} received from ${p.hostellerName ?? 'resident'} (${p.paymentMethod ?? '—'})`,
    })),
    ...((data?.complaints ?? []) as any[]).slice(0, 5).map((c) => ({
      id: 'c' + c.id, type: c.status, date: c.createdAt,
      text: `Complaint: ${c.title}${c.hostellerName ? ' — ' + c.hostellerName : ''}`,
    })),
    ...((data?.bookingRequests ?? []) as any[]).slice(0, 5).map((r) => ({
      id: 'r' + r.id, type: r.status, date: r.createdAt ?? r.checkInDate,
      text: `Booking request: ${r.applicantName ?? 'applicant'} for ${r.roomName ?? 'room'} ${r.bedName ?? ''}`.trim(),
    })),
  ].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))).slice(0, 6)

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3aaee8, transparent)', transform: 'translate(30%, -30%)' }}
        />
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Staff Portal 👋</p>
        <h1 className="text-2xl font-bold mt-0.5 tracking-tight">Hostel Operations Overview</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Today's summary</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Members"
          value={membersCount}
          sub="Active residents"
          icon={<Home size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Pending Requests"
          value={pendingAllocationsCount}
          sub="Booking requests to review"
          icon={<ClipboardList size={20} className="text-amber-600" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Pending Dues"
          value={pendingDues.length}
          sub={`${inr(pendingDuesAmount)} outstanding · ${openComplaints.length} open complaint${openComplaints.length === 1 ? '' : 's'}`}
          icon={<MessageSquare size={20} className="text-red-500" />}
          iconBg="bg-red-50"
        />
        <StatCard
          label="Collected This Month"
          value={inr(monthlyRevenue)}
          sub={`${monthPayments.length} payment${monthPayments.length === 1 ? '' : 's'} received`}
          icon={<TrendingUp size={20} className="text-brand-600" />}
          iconBg="bg-brand-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
              <ChevronRight size={14} className="text-gray-500" />
            </div>
            <h2 className="font-semibold text-gray-800 text-sm">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className={`flex items-center gap-2.5 p-3.5 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm ${q.bg} ${q.border}`}
              >
                <div className={`w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center shadow-sm shrink-0 ${q.text}`}>
                  <q.icon size={15} />
                </div>
                <span className={`text-xs font-semibold leading-tight ${q.text}`}>{q.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
              <Users size={13} className="text-brand-600" />
            </div>
            <h2 className="font-semibold text-gray-800 text-sm">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivity.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-gray-400">No recent activity</p>
            )}
            {recentActivity.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/70 transition-colors">
                <Badge status={a.type} />
                <p className="text-sm text-gray-700 flex-1 truncate">{a.text}</p>
                <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{fmtDate(a.date)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
