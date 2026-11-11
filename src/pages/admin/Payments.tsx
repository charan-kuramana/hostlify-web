import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IndianRupee, X, AlertTriangle, CheckCircle2, Clock, Plus, Receipt } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import { getPendingDues, getAllDues, getPaymentRecords, recordCashPayment, generateDues } from '../../api/staff'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'

const AVATAR_COLORS = ['bg-brand-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500']
const getInitials = (name: string) => (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
function inr(n: any) { return '₹' + Number(n ?? 0).toLocaleString('en-IN') }
function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const period = (d: any) => d.periodMonth ? `${MONTHS[d.periodMonth]} ${d.periodYear}` : '—'

type Tab = 'pending' | 'all' | 'received'

function Spinner() {
  return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>
}

export default function Payments() {
  const { activeHostelId } = useAuthStore()
  const queryClient = useQueryClient()
  const { show } = useToastStore()
  const [tab, setTab] = useState<Tab>('pending')
  const [confirmRecord, setConfirmRecord] = useState<any | null>(null)
  const [payMethod, setPayMethod] = useState('CASH')
  const [payRef, setPayRef] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payErr, setPayErr] = useState<string | null>(null)

  // Outstanding = due amount minus what was already paid (paidAmount is sent by newer API builds)
  const outstanding = (d: any) => Math.max(0, Number(d.amount ?? 0) - Number(d.paidAmount ?? 0))
  function openRecord(d: any) { setConfirmRecord(d); setPayMethod('CASH'); setPayRef(''); setPayAmount(String(outstanding(d))); setPayErr(null) }

  function submitPayment() {
    const amt = Number(payAmount)
    if (!(amt > 0)) { setPayErr('Amount must be greater than 0.'); return }
    if (amt > outstanding(confirmRecord)) { setPayErr(`Amount cannot exceed the outstanding ${inr(outstanding(confirmRecord))}.`); return }
    setPayErr(null)
    recordMut.mutate({ dueId: confirmRecord.id, amount: amt, hostellerId: confirmRecord.hostellerId, paymentMethod: payMethod, transactionRef: payRef.trim() || undefined })
  }

  const { data: pending = [], isLoading } = useQuery({ queryKey: ['dues-pending', activeHostelId], queryFn: () => getPendingDues(activeHostelId!), enabled: !!activeHostelId })
  const { data: allDues = [] } = useQuery({ queryKey: ['dues-all', activeHostelId], queryFn: () => getAllDues(activeHostelId!), enabled: !!activeHostelId && tab === 'all' })
  const { data: records = [] } = useQuery({ queryKey: ['pay-records', activeHostelId], queryFn: () => getPaymentRecords(activeHostelId!), enabled: !!activeHostelId })

  const recordMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => recordCashPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dues-pending', activeHostelId] })
      queryClient.invalidateQueries({ queryKey: ['dues-all', activeHostelId] })
      queryClient.invalidateQueries({ queryKey: ['pay-records', activeHostelId] })
      queryClient.invalidateQueries({ queryKey: ['staffDashboard', activeHostelId] })
      setConfirmRecord(null)
      show('success', 'Payment recorded', `${payMethod === 'CASH' ? 'Cash' : payMethod.replace('_', ' ')} payment has been recorded.`)
    },
    onError: (e: any) => show('error', 'Failed', e?.response?.data?.message ?? 'Could not record payment.'),
  })

  const genMut = useMutation({
    mutationFn: () => { const now = new Date(); return generateDues(activeHostelId!, now.getMonth() + 1, now.getFullYear()) },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['dues-pending', activeHostelId] })
      queryClient.invalidateQueries({ queryKey: ['dues-all', activeHostelId] })
      show('success', 'Dues generated', `${res?.generatedCount ?? 0} due(s) created for this month.`)
    },
    onError: (e: any) => show('error', 'Failed', e?.response?.data?.message ?? 'Could not generate dues.'),
  })

  const pendingList = pending as any[]
  const recordsList = records as any[]
  const totalDue = pendingList.reduce((s, d) => s + outstanding(d), 0)
  // No job sets status=OVERDUE, so derive it from the due date
  const todayStr = new Date().toISOString().slice(0, 10)
  const isOverdue = (d: any) => d.status !== 'PAID' && (d.status === 'OVERDUE' || (!!d.dueDate && d.dueDate < todayStr))
  const overdue = pendingList.filter(isOverdue)
  const totalOverdue = overdue.reduce((s, d) => s + outstanding(d), 0)
  const collected = recordsList.reduce((s, r) => s + Number(r.amount ?? 0), 0)

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="Track dues, record payments, and view collections"
        action={
          <button onClick={() => genMut.mutate()} disabled={genMut.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-60">
            <Plus size={15} /> {genMut.isPending ? 'Generating…' : "Generate This Month's Dues"}
          </button>
        } />

      {/* Confirm cash modal */}
      {confirmRecord && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center"><IndianRupee size={15} className="text-emerald-600" /></div>
                <h3 className="font-bold text-gray-900">Record Payment</h3>
              </div>
              <button onClick={() => setConfirmRecord(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"><X size={15} /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-xs font-bold text-white shrink-0">{getInitials(confirmRecord.hostellerName)}</div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{confirmRecord.hostellerName ?? '—'}</p>
                  <p className="text-xs text-gray-400">Room {confirmRecord.roomNumber ?? '—'} · {period(confirmRecord)}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 mt-3">
                <p className="text-xs text-gray-400 font-medium">Outstanding</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5 tracking-tight">{inr(outstanding(confirmRecord))}</p>
                {Number(confirmRecord.paidAmount ?? 0) > 0 && <p className="text-xs text-gray-400">of {inr(confirmRecord.amount)} · {inr(confirmRecord.paidAmount)} already paid</p>}
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount received (₹)</label>
                <input type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Payment Method</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              {payMethod !== 'CASH' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Reference / Txn No. (optional)</label>
                  <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="UTR / UPI ref / cheque no."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              )}
              {payErr && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{payErr}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRecord(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={submitPayment}
                disabled={recordMut.isPending}
                className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60">
                {recordMut.isPending ? 'Processing…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Pending Due" value={inr(totalDue)} sub={`${pendingList.length} due${pendingList.length !== 1 ? 's' : ''} pending`} icon={<Clock size={20} className="text-amber-500" />} iconBg="bg-amber-50" />
        <StatCard label="Collected" value={inr(collected)} sub={`${recordsList.length} payment${recordsList.length !== 1 ? 's' : ''} received`} icon={<CheckCircle2 size={20} className="text-emerald-600" />} iconBg="bg-emerald-50" />
        <StatCard label="Overdue" value={inr(totalOverdue)} sub={`${overdue.length} due${overdue.length !== 1 ? 's' : ''} overdue`} icon={<AlertTriangle size={20} className="text-red-500" />} iconBg="bg-red-50" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([['pending', `Pending Dues (${pendingList.length})`], ['all', 'All Dues'], ['received', `Payments Received (${recordsList.length})`]] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
        ))}
      </div>

      {/* Pending dues + All dues tables */}
      {(tab === 'pending' || tab === 'all') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Member', 'Room', 'Period', 'Amount', 'Due Date', 'Status', tab === 'pending' ? 'Action' : ''].map((h, i) => (
                  <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {(tab === 'pending' ? pendingList : (allDues as any[])).map((d, i) => (
                  <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>{getInitials(d.hostellerName)}</div>
                        <p className="font-semibold text-gray-800">{d.hostellerName ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className="font-mono text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg tracking-wider whitespace-nowrap">{d.roomNumber ?? '—'}</span></td>
                    <td className="px-5 py-3.5 text-gray-500">{period(d)}</td>
                    <td className="px-5 py-3.5"><span className={`font-bold text-sm ${isOverdue(d) ? 'text-red-600' : d.status === 'PAID' ? 'text-emerald-600' : 'text-gray-900'}`}>{inr(d.amount)}</span>{Number(d.paidAmount ?? 0) > 0 && d.status !== 'PAID' && <p className="text-[11px] text-gray-400">{inr(d.paidAmount)} paid</p>}</td>
                    <td className="px-5 py-3.5 text-gray-500">{fmtDate(d.dueDate)}</td>
                    <td className="px-5 py-3.5"><Badge status={isOverdue(d) && d.status === 'UNPAID' ? 'OVERDUE' : d.status} /></td>
                    {tab === 'pending' && (
                      <td className="px-5 py-3.5">
                        <button onClick={() => openRecord(d)} className="flex items-center gap-1.5 text-emerald-700 hover:text-white font-semibold text-xs border border-emerald-200 bg-emerald-50 hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-all">
                          <IndianRupee size={12} /> Record Payment
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {(tab === 'pending' ? pendingList : (allDues as any[])).length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm font-semibold text-gray-400">No records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments received */}
      {tab === 'received' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center"><Receipt size={14} className="text-emerald-600" /></div>
            <h2 className="font-semibold text-gray-800 text-sm">Payments Received</h2>
            <span className="ml-auto text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{inr(collected)} collected</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Member', 'Period', 'Method', 'Reference', 'Date', 'Amount'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {recordsList.map((r, i) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>{getInitials(r.hostellerName)}</div>
                        <p className="font-semibold text-gray-800">{r.hostellerName ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{r.period ?? '—'}</td>
                    <td className="px-5 py-3.5"><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{r.paymentMethod ?? '—'}</span></td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500 tracking-wider">{r.transactionRef ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{fmtDate(r.paymentDate)}</td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600">{inr(r.amount)}</td>
                  </tr>
                ))}
                {recordsList.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm font-semibold text-gray-400">No payments received yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
