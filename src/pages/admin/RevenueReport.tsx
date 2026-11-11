import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, IndianRupee, Wallet, BarChart3, Download } from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import PageHeader from '../../components/ui/PageHeader'
import { getExpenseSummary, getPaymentRecords } from '../../api/staff'
import { useAuthStore } from '../../store/authStore'

function formatINR(amount: number): string {
  // Sign before the symbol: "-₹1.22L", not "₹-1.22L"
  const n = Number(amount ?? 0)
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`
  return `${sign}₹${abs.toLocaleString('en-IN')}`
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function RevenueReport() {
  const { activeHostelId } = useAuthStore()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['expenseSummary', activeHostelId, month, year],
    queryFn: () => getExpenseSummary(activeHostelId!, month, year),
    enabled: !!activeHostelId,
  })

  // Income = actual payments received (records), filtered to the selected period
  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['pay-records', activeHostelId],
    queryFn: () => getPaymentRecords(activeHostelId!),
    enabled: !!activeHostelId,
  })

  const isLoading = summaryLoading || recordsLoading

  const totalExpenses: number = summary?.total ?? 0
  const byCategory: { category: string; amount: number }[] = summary?.byCategory ?? []

  const periodRecords = (records as any[]).filter((r) => {
    const d = r.paymentDate ? new Date(r.paymentDate) : null
    return d && d.getMonth() + 1 === month && d.getFullYear() === year
  })
  const totalIncome = periodRecords.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const net = totalIncome - totalExpenses
  const maxBar = Math.max(totalIncome, totalExpenses, 1)

  function exportCsv() {
    const rows: string[][] = [
      ['Hostlify — Financial Report'],
      ['Period', `${MONTHS[month - 1]} ${year}`],
      [],
      ['INCOME'],
      ['Date', 'Member', 'Method', 'Reference', 'Amount'],
      ...periodRecords.map((r) => [r.paymentDate ?? '', r.hostellerName ?? '', r.paymentMethod ?? '', r.transactionRef ?? '', String(r.amount ?? 0)]),
      ['', '', '', 'Total Income', String(totalIncome)],
      [],
      ['EXPENSES BY CATEGORY'],
      ['Category', 'Amount'],
      ...byCategory.map((c) => [c.category, String(c.amount)]),
      ['', ''],
      ['Total Expenses', String(totalExpenses)],
      [],
      ['NET (Income − Expenses)', String(net)],
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hostlify-report-${year}-${String(month).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Report"
        subtitle="Monthly income vs expense analytics"
        action={
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-brand-600 border border-brand-200 hover:bg-brand-50 transition-colors">
            <Download size={15} /> Export CSV
          </button>
        }
      />

      {/* Period selector (historical retrieval) */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
          className="px-3.5 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="px-3.5 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Income (Collected)" value={formatINR(totalIncome)} sub={`${periodRecords.length} payment${periodRecords.length !== 1 ? 's' : ''}`}
              icon={<IndianRupee size={20} className="text-emerald-600" />} iconBg="bg-emerald-50" />
            <StatCard label="Expenses" value={formatINR(totalExpenses)} sub={`${summary?.count ?? 0} entries`}
              icon={<Wallet size={20} className="text-brand-600" />} iconBg="bg-brand-50" />
            <StatCard label="Net Balance" value={formatINR(net)} sub={net >= 0 ? 'Surplus' : 'Deficit'}
              icon={net >= 0 ? <TrendingUp size={20} className="text-emerald-600" /> : <TrendingDown size={20} className="text-red-500" />}
              iconBg={net >= 0 ? 'bg-emerald-50' : 'bg-red-50'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Breakdown Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
                <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center"><Wallet size={13} className="text-brand-600" /></div>
                <h2 className="font-semibold text-gray-800 text-sm">Expense Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {byCategory.length === 0 && (
                      <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-400">No expense data for this period</td></tr>
                    )}
                    {byCategory.map((item) => {
                      const share = totalExpenses > 0 ? Math.round((item.amount / totalExpenses) * 100) : 0
                      return (
                        <tr key={item.category} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-5 py-3.5"><p className="font-semibold text-gray-800 text-xs leading-tight">{item.category}</p></td>
                          <td className="px-4 py-3.5 text-right"><span className="text-xs font-bold text-gray-800">{formatINR(item.amount)}</span></td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${share}%` }} /></div>
                              <span className="text-xs font-bold text-gray-700 w-8 text-right">{share}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {byCategory.length > 0 && (
                      <tr className="border-t-2 border-gray-200 bg-gray-50">
                        <td className="px-5 py-3 font-bold text-gray-700 text-xs">Total Expenses</td>
                        <td colSpan={2} className="px-4 py-3 text-right font-bold text-gray-900 text-sm">{formatINR(totalExpenses)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Income vs Expenses chart (heights clamped so nothing overflows) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center"><BarChart3 size={13} className="text-emerald-600" /></div>
                <h2 className="font-semibold text-gray-800 text-sm">Income vs Expenses</h2>
              </div>
              <div className="flex items-end gap-8 justify-center" style={{ height: 180 }}>
                {[
                  { label: 'Income', amount: totalIncome, color: 'linear-gradient(180deg, #1d6ea8, #1a8fd1)' },
                  { label: 'Expenses', amount: totalExpenses, color: 'linear-gradient(180deg, #f59e0b, #fcd34d)' },
                ].map((d) => {
                  const heightPct = Math.min((d.amount / maxBar) * 100, 100)
                  return (
                    <div key={d.label} className="flex flex-col items-center gap-2 w-24">
                      <div className="relative w-full flex items-end justify-center" style={{ height: 150 }}>
                        <div className="w-14 rounded-t-lg transition-all hover:opacity-80 relative" style={{ height: `${Math.max(heightPct, 2)}%`, background: d.color }}>
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-gray-700">{formatINR(d.amount)}</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-gray-500">{d.label}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">{MONTHS[month - 1]} {year} · Income from recorded payments</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
