import { useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import { getOccupancyReport } from '../../api/superadmin'

function getRateColor(rate: number) {
  if (rate >= 80) return 'linear-gradient(90deg, #1d6ea8, #1a8fd1)'
  if (rate >= 60) return 'linear-gradient(90deg, #d97706, #fbbf24)'
  return 'linear-gradient(90deg, #ef4444, #f87171)'
}

function getRateBadgeClass(rate: number) {
  if (rate >= 80) return 'bg-emerald-50 text-emerald-700'
  if (rate >= 60) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

export default function Occupancy() {
  const { data, isLoading } = useQuery({
    queryKey: ['sa-occupancy'],
    queryFn: getOccupancyReport,
  })

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
      </div>
    )

  // API: { totalBeds, occupiedBeds, vacantBeds, occupancyRate, hostels: [{ hostelId, hostelName, ownerName, city, totalBeds, occupiedBeds, occupancyRate }] }
  const rows: unknown[] = Array.isArray(data?.hostels) ? data.hostels : Array.isArray(data) ? data : []
  const occupancyList: Array<{
    id: number | string
    hostel: string
    owner: string
    city: string
    occupied: number
    capacity: number
    rate: number
  }> = rows.map((raw, idx) => {
    const h = raw as {
      hostelId?: number; id?: number; hostelName?: string; name?: string; ownerName?: string; owner?: string; city?: string
      occupiedBeds?: number; occupied?: number; totalBeds?: number; capacity?: number
    }
    const occupied = Number(h.occupiedBeds ?? h.occupied ?? 0)
    const capacity = Number(h.totalBeds ?? h.capacity ?? 0)
    return {
      id: h.hostelId ?? h.id ?? idx,
      hostel: h.hostelName ?? h.name ?? '—',
      owner: h.ownerName ?? h.owner ?? '—',
      city: h.city ?? '—',
      occupied,
      capacity,
      rate: capacity > 0 ? Math.round((occupied / capacity) * 1000) / 10 : 0,
    }
  })

  // Platform totals: prefer the API's own totals, fall back to summing the rows
  const totalBeds: number = Number(data?.totalBeds ?? occupancyList.reduce((s, h) => s + h.capacity, 0))
  const totalOccupied: number = Number(data?.occupiedBeds ?? occupancyList.reduce((s, h) => s + h.occupied, 0))
  const avgRate = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 1000) / 10 : 0
  const hostelCount = occupancyList.length

  return (
    <div className="space-y-6">
      {/* Gradient Banner */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3aaee8, transparent)', transform: 'translate(30%, -30%)' }}
        />
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Super Admin</p>
        <h1 className="text-2xl font-bold mt-0.5 tracking-tight">Occupancy</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {totalOccupied} occupied of {totalBeds} total beds{hostelCount > 0 ? ` · ${hostelCount} hostels` : ''}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Hostels"
          value={hostelCount > 0 ? hostelCount : '—'}
          sub="Across the platform"
          icon={<MapPin size={20} className="text-violet-600" />}
          iconBg="bg-violet-50"
        />
        <StatCard
          label="Total Beds"
          value={totalBeds}
          sub={`${totalBeds - totalOccupied} currently available`}
          icon={<MapPin size={20} className="text-brand-600" />}
          iconBg="bg-brand-50"
        />
        <StatCard
          label="Avg Occupancy"
          value={`${avgRate}%`}
          sub="Platform average"
          icon={<MapPin size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
          trend={{ value: `${avgRate}%`, up: avgRate >= 80 }}
        />
      </div>

      {/* Occupancy Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {occupancyList.map((h) => (
          <div key={h.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm leading-tight">{h.hostel}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{h.city} · {h.owner}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getRateBadgeClass(h.rate)}`}>
                {h.rate}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-2">
              <div
                className="h-2.5 rounded-full transition-all"
                style={{ width: `${h.rate}%`, background: getRateColor(h.rate) }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 font-medium">
              <span>{h.occupied} occupied</span>
              <span>{h.capacity - h.occupied} available · {h.capacity} total</span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
          <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
            <MapPin size={14} className="text-violet-600" />
          </div>
          <h2 className="font-semibold text-gray-800 text-sm">Occupancy Summary</h2>
          <span className="ml-auto text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {occupancyList.length} hostels
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hostel</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Owner</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">City</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Occupancy</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {occupancyList.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-gray-800">{h.hostel}</td>
                  <td className="px-5 py-3.5 text-gray-600">{h.owner}</td>
                  <td className="px-5 py-3.5 text-gray-500">{h.city}</td>
                  <td className="px-5 py-3.5 text-gray-700 font-medium">
                    {h.occupied} / {h.capacity}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getRateBadgeClass(h.rate)}`}>
                      {h.rate}%
                    </span>
                  </td>
                </tr>
              ))}
              {occupancyList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">No per-hostel occupancy data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
