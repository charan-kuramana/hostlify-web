import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Download, TrendingUp } from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import { getRevenueReport, PLAN_CHIP } from '../../api/superadmin'

export default function Revenue() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const maxMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data, isLoading } = useQuery({
    queryKey: ['sa-revenue', month, year],
    queryFn: () => getRevenueReport(month, year),
    placeholderData: keepPreviousData,
  })

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
      </div>
    )

  const ownerRevenue: Array<{
    id: number | string
    owner: string
    plan: string
    hostels: number
    members: number
    collected: number
    outstanding: number
    rate: number
  }> = (data?.ownerBreakdown ?? data?.owners ?? []).map((r: {
    ownerId?: number
    ownerName?: string
    owner?: string
    plan?: string
    hostelCount?: number
    hostels?: number
    memberCount?: number
    members?: number
    collectedAmount?: number
    collected?: number
    outstandingAmount?: number
    outstanding?: number
    collectionRate?: number
    rate?: number
  }, idx: number) => ({
    id: r.ownerId ?? idx,
    owner: r.ownerName ?? r.owner ?? '',
    plan: r.plan ?? '',
    hostels: r.hostelCount ?? r.hostels ?? 0,
    members: r.memberCount ?? r.members ?? 0,
    collected: Number(r.collectedAmount ?? r.collected ?? 0),
    outstanding: Number(r.outstandingAmount ?? r.outstanding ?? 0),
    rate: Number(r.collectionRate ?? r.rate ?? 0),
  }))

  const monthly: Array<{ month: string; amount: number; current?: boolean }> =
    (data?.monthlyTrend ?? data?.monthly ?? []).map((m: {
      month?: string
      label?: string
      amount?: number
      revenue?: number
      current?: boolean
    }, idx: number, arr: unknown[]) => ({
      month: m.month ?? m.label ?? '',
      amount: Number(m.amount ?? m.revenue ?? 0),
      current: m.current ?? idx === arr.length - 1,
    }))

  const maxAmount = monthly.length > 0 ? Math.max(...monthly.map((m) => m.amount)) : 1
  const totalCollected = ownerRevenue.reduce((s, r) => s + r.collected, 0)
  const totalOutstanding = ownerRevenue.reduce((s, r) => s + r.outstanding, 0)
  // Platform collection rate = collected / (collected + outstanding) for the month
  const avgRate = totalCollected + totalOutstanding > 0
    ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100)
    : 0
  const activeOwners = ownerRevenue.filter((r) => r.collected > 0).length
  const platformRevenue = Number(data?.totalCollected ?? totalCollected)

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long' }) + ' ' + year
  const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`

  function exportCsv() {
    const header = ['Owner', 'Plan', 'Hostels', 'Members', 'Collected', 'Outstanding', 'Collection Rate %']
    const lines = ownerRevenue.map((r) => [r.owner, r.plan, r.hostels, r.members, r.collected, r.outstanding, r.rate])
    lines.push(['Platform Total', '', '', '', totalCollected, totalOutstanding, avgRate])
    const csv = [header, ...lines]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `hostlify-revenue-${year}-${String(month).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Super Admin</p>
            <h1 className="text-2xl font-bold mt-0.5 tracking-tight">Revenue</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Platform-wide revenue overview · {monthLabel}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
            <input
              type="month"
              aria-label="Report month"
              value={`${year}-${String(month).padStart(2, '0')}`}
              max={maxMonthValue}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number)
                if (y && m) { setYear(y); setMonth(m) }
              }}
              className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-white/15 text-white border border-white/20 [color-scheme:dark]"
            />
            <button
              onClick={exportCsv}
              disabled={ownerRevenue.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/15 hover:bg-white/20 text-white transition-colors border border-white/20 disabled:opacity-50"
            >
              <Download size={15} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Platform Revenue"
          value={inr(platformRevenue)}
          sub={`${monthLabel} · all hostels`}
          icon={<TrendingUp size={20} className="text-violet-600" />}
          iconBg="bg-violet-50"
        />
        <StatCard
          label="Collection Rate"
          value={`${avgRate}%`}
          sub={`${inr(totalCollected)} of ${inr(totalCollected + totalOutstanding)} billed`}
          icon={<TrendingUp size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Paying Owners"
          value={`${activeOwners} / ${ownerRevenue.length}`}
          sub={`Collected revenue in ${monthLabel}`}
          icon={<TrendingUp size={20} className="text-brand-600" />}
          iconBg="bg-brand-50"
        />
      </div>

      {/* Owner Breakdown Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
          <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
            <TrendingUp size={14} className="text-violet-600" />
          </div>
          <h2 className="font-semibold text-gray-800 text-sm">Owner Revenue Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Owner</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hostels</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Members</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Collected</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Outstanding</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ownerRevenue.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-800">{r.owner}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PLAN_CHIP[r.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                      {r.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-medium text-gray-700">{r.hostels}</td>
                  <td className="px-5 py-3.5 text-center font-medium text-gray-700">{r.members}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                    {inr(r.collected)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-red-500">
                    {inr(r.outstanding)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${r.rate}%`,
                            background: r.rate >= 90
                              ? 'linear-gradient(90deg, #1d6ea8, #1a8fd1)'
                              : r.rate >= 80
                                ? 'linear-gradient(90deg, #1d6ea8, #3aaee8)'
                                : 'linear-gradient(90deg, #d97706, #fbbf24)',
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{r.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {ownerRevenue.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">No revenue data available</td>
                </tr>
              )}
            </tbody>
            {ownerRevenue.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-5 py-3.5 font-bold text-gray-700">Platform Total</td>
                  <td className="px-5 py-3.5 text-right font-bold text-emerald-700 text-base">
                    {inr(totalCollected)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-red-500">
                    {inr(totalOutstanding)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-bold text-violet-700">{avgRate}%</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Monthly Trend Bar Chart */}
      {monthly.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <TrendingUp size={14} className="text-violet-600" />
              </div>
              <h2 className="font-semibold text-gray-800 text-sm">Monthly Revenue Trend</h2>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {monthly[0]?.month} – {monthly[monthly.length - 1]?.month}
            </span>
          </div>
          <div className="flex items-end gap-3 h-36">
            {monthly.map((m) => {
              const heightPct = maxAmount > 0 ? Math.round((m.amount / maxAmount) * 100) : 0
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-500">
                    ₹{(m.amount / 100000).toFixed(1)}L
                  </span>
                  <div className="w-full flex items-end" style={{ height: '80px' }}>
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{
                        height: `${heightPct}%`,
                        background: (m as { current?: boolean }).current
                          ? 'linear-gradient(180deg, #1d6ea8, #3aaee8)'
                          : 'linear-gradient(180deg, #e0e7ff, #c7d2fe)',
                      }}
                    />
                  </div>
                  <span className={`text-xs font-semibold ${(m as { current?: boolean }).current ? 'text-violet-700' : 'text-gray-400'}`}>
                    {m.month}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
