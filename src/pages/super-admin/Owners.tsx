import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Users, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { getOwners, PLAN_CHIP } from '../../api/superadmin'

const AVATAR_COLORS = ['bg-brand-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500']
const PAGE_SIZE = 20

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export interface OwnerRow {
  id: number
  ownerName?: string
  businessName?: string
  email: string
  mobile?: string
  subscriptionPlan?: string
  status: string
  hostels?: number
  members?: number
  revenue?: number
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED'

export default function Owners() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  // Search runs on the server across all owners; wait for a pause in typing before querying
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sa-owners', page, debouncedSearch, statusFilter],
    queryFn: () => getOwners(page, PAGE_SIZE, debouncedSearch, statusFilter),
    placeholderData: keepPreviousData,
  })

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
      </div>
    )

  const owners: OwnerRow[] = data?.content ?? (Array.isArray(data) ? data : [])
  const totalOwners: number = data?.totalOwners ?? data?.totalElements ?? owners.length
  const totalPages: number = Math.max(1, data?.totalPages ?? 1)
  const matchCount: number = data?.totalElements ?? owners.length

  // Platform-wide counts from the server (not just this page)
  const totalActive: number = data?.activeCount ?? owners.filter((o) => o.status === 'ACTIVE').length
  const totalSuspended: number = data?.suspendedCount ?? owners.filter((o) => o.status === 'SUSPENDED').length

  const filtered = owners // already filtered by the server
  const filtering = !!debouncedSearch || statusFilter !== 'ALL'

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3aaee8, transparent)', transform: 'translate(30%, -30%)' }}
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Super Admin</p>
            <h1 className="text-2xl font-bold mt-0.5 tracking-tight">Owners</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {totalOwners} registered owner{totalOwners === 1 ? '' : 's'} on the platform
            </p>
          </div>
          <button
            onClick={() => navigate('/super-admin/owners/create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/15 hover:bg-white/20 text-white transition-colors border border-white/20 shrink-0"
          >
            <Plus size={15} /> Create Owner
          </button>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">
          Could not load owners. Please refresh the page.
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Owners"
          value={totalOwners}
          sub="Registered on platform"
          icon={<Users size={20} className="text-violet-600" />}
          iconBg="bg-violet-50"
        />
        <StatCard
          label="Active"
          value={totalActive}
          sub="Accounts in good standing"
          icon={<Users size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Suspended"
          value={totalSuspended}
          sub="Accounts on hold"
          icon={<Users size={20} className="text-red-500" />}
          iconBg="bg-red-50"
        />
      </div>

      {/* Owners Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5 px-5 py-4 border-b border-gray-50">
          <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
            <Users size={14} className="text-violet-600" />
          </div>
          <h2 className="font-semibold text-gray-800 text-sm">All Owners</h2>
          <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {matchCount}
          </span>
          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                placeholder="Search name, email, mobile"
                aria-label="Search owners"
                className="w-full sm:w-60 pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-gray-50 focus:bg-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(0) }}
              aria-label="Filter by status"
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Owner</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hostels</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Members</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Revenue</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((o, i) => {
                const displayName = o.ownerName || o.businessName || o.email
                return (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/super-admin/owners/${o.id}`)}
                    className={`cursor-pointer hover:bg-gray-50/70 transition-colors ${o.status === 'SUSPENDED' ? 'bg-red-50/30' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                          {getInitials(displayName)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{displayName}</p>
                          <p className="text-xs text-gray-400">
                            {o.businessName && o.businessName !== displayName ? `${o.businessName} · ` : ''}{o.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${PLAN_CHIP[o.subscriptionPlan ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                        {o.subscriptionPlan ?? '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center font-semibold text-gray-700">{o.hostels ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center font-semibold text-gray-700">{o.members ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-gray-900">
                      {o.revenue != null ? `₹${Number(o.revenue).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-5 py-3.5"><Badge status={o.status} /></td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/super-admin/owners/${o.id}`) }}
                        className="px-3 py-1.5 text-xs font-semibold text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                    {filtering ? 'No owners match your search' : 'No owners found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 text-sm">
            <span className="text-gray-500">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
