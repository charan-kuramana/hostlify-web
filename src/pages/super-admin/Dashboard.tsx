import { useQuery } from '@tanstack/react-query'
import { Building2, Users, TrendingUp, AlertCircle } from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import { getSADashboard } from '../../api/superadmin'

export default function SuperAdminDashboard() {
  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['sa-dashboard'],
    queryFn: getSADashboard,
  })

  if (dashLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
      </div>
    )

  const hostels: Array<{ id: number; name: string; city: string; total: number; occupied: number; revenue: number }> =
    dashboard?.hostels ?? []

  const totalOccupied = hostels.reduce((s: number, h: { occupied: number }) => s + Number(h.occupied ?? 0), 0)
  const totalCapacity: number = hostels.length
    ? hostels.reduce((s: number, h: { total: number }) => s + Number(h.total ?? 0), 0)
    : Number(dashboard?.totalBeds ?? 0)
  const totalRevenue = hostels.reduce((s: number, h: { revenue: number }) => s + Number(h.revenue ?? 0), 0)
  const cities = new Set(hostels.map((h: { city: string }) => h.city)).size
  const residents: number = Number(dashboard?.totalResidents ?? dashboard?.activeBookings ?? totalOccupied)
  const hostelCount: number = dashboard?.totalHostels ?? hostels.length
  const monthlyRevenue: number = Number(dashboard?.monthlyRevenue ?? totalRevenue)
  const fullPct = totalCapacity > 0 ? Math.round((residents / totalCapacity) * 100) : 0

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
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Super Admin 👋</p>
        <h1 className="text-2xl font-bold mt-0.5 tracking-tight">Network Overview</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {hostelCount} hostel{hostelCount === 1 ? '' : 's'}
          {cities > 0 ? ` across ${cities} cit${cities === 1 ? 'y' : 'ies'}` : ''}
          {dashboard?.totalOwners != null ? ` · ${dashboard.totalOwners} owners` : ''}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Hostels"
          value={hostelCount}
          sub={cities > 0 ? `Across ${cities} cit${cities === 1 ? 'y' : 'ies'}` : 'On the platform'}
          icon={<Building2 size={20} className="text-purple-600" />}
          iconBg="bg-purple-50"
        />
        <StatCard
          label="Total Residents"
          value={residents}
          sub={`${Math.max(totalCapacity - residents, 0)} of ${totalCapacity} beds available`}
          icon={<Users size={20} className="text-brand-600" />}
          iconBg="bg-brand-50"
          trend={{ value: `${fullPct}% full`, up: fullPct >= 50 }}
        />
        <StatCard
          label="Monthly Revenue"
          value={`₹${monthlyRevenue.toLocaleString('en-IN')}`}
          sub="Collected this month · All hostels"
          icon={<TrendingUp size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Open Complaints"
          value={dashboard?.openComplaints ?? '—'}
          sub="Across all hostels"
          icon={<AlertCircle size={20} className="text-amber-600" />}
          iconBg="bg-amber-50"
        />
      </div>

      {/* Hostel breakdown table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
            <Building2 size={14} className="text-purple-600" />
          </div>
          <h2 className="font-semibold text-gray-800 text-sm">Hostel Breakdown</h2>
          <span className="ml-auto text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {hostels.length} hostels
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hostel</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">City</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Occupancy</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rate</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {hostels.map((h) => {
                const rate = h.total > 0 ? Math.round((h.occupied / h.total) * 100) : 0
                return (
                  <tr key={h.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
                        >
                          {h.name[0]}
                        </div>
                        <p className="font-semibold text-gray-800">{h.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 font-medium">{h.city}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-28 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${rate}%`,
                              background: rate >= 80
                                ? 'linear-gradient(90deg, #1d6ea8, #1a8fd1)'
                                : 'linear-gradient(90deg, #d97706, #fbbf24)',
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                          {h.occupied}/{h.total}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          rate >= 80
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {rate}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-gray-900">
                      ₹{Number(h.revenue ?? 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                )
              })}
              {hostels.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">No per-hostel data available</td>
                </tr>
              )}
            </tbody>
            {hostels.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={2} className="px-5 py-3.5 font-bold text-gray-700">Total</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-28 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0}%`,
                            background: 'linear-gradient(90deg, #1d6ea8, #3aaee8)',
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 font-semibold">
                        {totalOccupied}/{totalCapacity}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                      {totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-gray-900 text-base">
                    ₹{totalRevenue.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
