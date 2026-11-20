import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IndianRupee, X, AlertTriangle, CheckCircle2, Clock, Plus, Receipt, MessageCircle, BellRing, Ban, Download, ShieldCheck, XCircle } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import AddChargeModal from '../../components/payments/AddChargeModal'
import PushToggle from '../../components/common/PushToggle'
import {
  getPendingDues, getAllDues, getPaymentRecords, recordCashPayment, generateDues, getHostel, getPaymentSettings,
  addCharge, waiveDue, sendDueReminder, getPendingUpiClaims, confirmUpiClaim, rejectUpiClaim,
} from '../../api/staff'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { DUE_TYPE_LABEL, DUE_TYPE_STYLE, blobErrorMessage, downloadPdf, dueTitle, inr, outstandingOf, periodOf, whatsappLink } from '../../lib/payments'

const AVATAR_COLORS = ['bg-brand-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500']
const getInitials = (name: string) => (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }

type Tab = 'pending' | 'verify' | 'all' | 'received'

function Spinner() {
  return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>
}

function TypeChip({ type }: { type?: string }) {
  const t = type ?? 'RENT'
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${DUE_TYPE_STYLE[t] ?? DUE_TYPE_STYLE.OTHER}`}>{DUE_TYPE_LABEL[t] ?? t}</span>
}

const iconBtn = 'w-8 h-8 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-40'

export default function Payments() {
  const { activeHostelId, subRole } = useAuthStore()
  const queryClient = useQueryClient()
  const { show } = useToastStore()
  const [tab, setTab] = useState<Tab>('pending')
  const [confirmRecord, setConfirmRecord] = useState<any | null>(null)
  const [payMethod, setPayMethod] = useState('CASH')
  const [payRef, setPayRef] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payErr, setPayErr] = useState<string | null>(null)
  const [showCharge, setShowCharge] = useState(false)
  const [waiveTarget, setWaiveTarget] = useState<any | null>(null)
  const [rejectTarget, setRejectTarget] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const canWaive = !subRole || ['OWNER', 'ADMIN', 'MANAGER'].includes(subRole)

  const outstanding = outstandingOf
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
  const { data: claims = [] } = useQuery({ queryKey: ['upi-claims', activeHostelId], queryFn: () => getPendingUpiClaims(activeHostelId!), enabled: !!activeHostelId, refetchInterval: 60_000 })
  const { data: hostel } = useQuery({ queryKey: ['hostel-info', activeHostelId], queryFn: () => getHostel(activeHostelId!), enabled: !!activeHostelId })
  const { data: paySettings } = useQuery({ queryKey: ['payment-settings', activeHostelId], queryFn: () => getPaymentSettings(activeHostelId!), enabled: !!activeHostelId, retry: false })

  function refreshAll() {
    for (const k of ['dues-pending', 'dues-all', 'pay-records', 'upi-claims', 'staffDashboard']) {
      queryClient.invalidateQueries({ queryKey: [k, activeHostelId] })
    }
  }
  const errMsg = (e: any, fallback: string) => e?.response?.data?.message ?? fallback

  const recordMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => recordCashPayment(data),
    onSuccess: () => {
      refreshAll()
      setConfirmRecord(null)
      show('success', 'Payment recorded', `${payMethod === 'CASH' ? 'Cash' : payMethod.replace('_', ' ')} payment recorded. The resident gets a receipt by email.`)
    },
    onError: (e: any) => show('error', 'Failed', errMsg(e, 'Could not record payment.')),
  })

  const genMut = useMutation({
    mutationFn: () => { const now = new Date(); return generateDues(activeHostelId!, now.getMonth() + 1, now.getFullYear()) },
    onSuccess: (res: any) => { refreshAll(); show('success', 'Dues generated', `${res?.generatedCount ?? 0} rent due(s) created for this month.`) },
    onError: (e: any) => show('error', 'Failed', errMsg(e, 'Could not generate dues.')),
  })

  const chargeMut = useMutation({
    mutationFn: (data: any) => addCharge({ hostelId: activeHostelId!, ...data }),
    onSuccess: (res: any[]) => { refreshAll(); setShowCharge(false); show('success', 'Charge added', `${res?.length ?? 1} charge(s) added.`) },
    onError: (e: any) => show('error', 'Failed', errMsg(e, 'Could not add the charge.')),
  })

  const waiveMut = useMutation({
    mutationFn: (dueId: number) => waiveDue(dueId),
    onSuccess: () => { refreshAll(); setWaiveTarget(null); show('success', 'Waived', 'The charge has been cancelled.') },
    onError: (e: any) => show('error', 'Failed', errMsg(e, 'Could not waive this due.')),
  })

  const remindMut = useMutation({
    mutationFn: (dueId: number) => sendDueReminder(dueId),
    onSuccess: (res: any) => show('success', 'Reminder sent', res?.delivered ? 'Sent by email/notification.' : 'Logged. Email is not configured yet, so use WhatsApp.'),
    onError: (e: any) => show('error', 'Not sent', errMsg(e, 'Could not send the reminder.')),
  })

  const confirmMut = useMutation({
    mutationFn: (id: number) => confirmUpiClaim(id),
    onSuccess: () => { refreshAll(); show('success', 'Payment confirmed', 'The due is updated and the resident gets a receipt.') },
    onError: (e: any) => show('error', 'Failed', errMsg(e, 'Could not confirm.')),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => rejectUpiClaim(id, reason),
    onSuccess: () => { refreshAll(); setRejectTarget(null); setRejectReason(''); show('success', 'Rejected', 'The resident has been notified.') },
    onError: (e: any) => show('error', 'Failed', errMsg(e, 'Could not reject.')),
  })

  function waText(d: any) {
    const first = (d.hostellerName ?? '').split(' ')[0] || 'there'
    const late = d.dueDate && d.dueDate < new Date().toISOString().slice(0, 10)
    const lines = [
      `Hi ${first}, this is a reminder from ${hostel?.name ?? 'your hostel'}.`,
      `${dueTitle(d)}: ${inr(outstanding(d))} ${late ? `was due on ${fmtDate(d.dueDate)}` : `is due on ${fmtDate(d.dueDate)}`}.`,
      paySettings?.upiId ? `You can pay by UPI to ${paySettings.upiId} or in the Hostlify app.` : 'You can pay in the Hostlify app or at the office.',
      'Please ignore if already paid. Thank you!',
    ]
    return lines.join('\n')
  }

  async function receipt(r: any) {
    try { await downloadPdf(`/payment/records/${r.id}/receipt.pdf`, `Receipt-${r.receiptNo ?? r.id}.pdf`) }
    catch (e: any) { show('error', 'Download failed', await blobErrorMessage(e, 'Could not download the receipt.')) }
  }

  const pendingList = pending as any[]
  const recordsList = records as any[]
  const claimsList = claims as any[]
  const totalDue = pendingList.reduce((s, d) => s + outstanding(d), 0)
  const todayStr = new Date().toISOString().slice(0, 10)
  const isOverdue = (d: any) => d.status !== 'PAID' && (d.status === 'OVERDUE' || (!!d.dueDate && d.dueDate < todayStr))
  const overdue = pendingList.filter(isOverdue)
  const totalOverdue = overdue.reduce((s, d) => s + outstanding(d), 0)
  const collected = recordsList.reduce((s, r) => s + Number(r.amount ?? 0), 0)

  if (isLoading) return <Spinner />

  const tabs: [Tab, string][] = [
    ['pending', `Pending Dues (${pendingList.length})`],
    ['verify', `UPI to Verify (${claimsList.length})`],
    ['all', 'All Dues'],
    ['received', `Payments Received (${recordsList.length})`],
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="Track dues, record payments, and view collections"
        action={
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowCharge(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100">
              <Plus size={15} /> Add Charge
            </button>
            <button onClick={() => genMut.mutate()} disabled={genMut.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-60">
              <Plus size={15} /> {genMut.isPending ? 'Generating…' : "Generate This Month's Rent"}
            </button>
          </div>
        } />

      {showCharge && activeHostelId && (
        <AddChargeModal hostelId={activeHostelId} submitting={chargeMut.isPending} onSubmit={(d) => chargeMut.mutate(d)} onClose={() => setShowCharge(false)} />
      )}

      {/* Waive confirm */}
      {waiveTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100">
            <h3 className="font-bold text-gray-900">Waive this charge?</h3>
            <p className="text-sm text-gray-500 mt-2">{waiveTarget.hostellerName}: {dueTitle(waiveTarget)}, {inr(waiveTarget.amount)}. It will be removed from the resident's dues{waiveTarget.dueType === 'LATE_FEE' ? ' and not charged again' : ''}.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setWaiveTarget(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => waiveMut.mutate(waiveTarget.id)} disabled={waiveMut.isPending}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60">{waiveMut.isPending ? 'Waiving…' : 'Waive'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject UPI */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100">
            <h3 className="font-bold text-gray-900">Reject UPI payment?</h3>
            <p className="text-sm text-gray-500 mt-2">Only reject if {inr(rejectTarget.amount)} with UTR <span className="font-mono">{rejectTarget.transactionRef}</span> is not in your UPI app. The resident will be told to check.</p>
            <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (optional), e.g. UTR not found"
              className="w-full mt-4 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            <div className="flex gap-3 mt-5">
              <button onClick={() => setRejectTarget(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => rejectMut.mutate({ id: rejectTarget.id, reason: rejectReason.trim() || undefined })} disabled={rejectMut.isPending}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60">{rejectMut.isPending ? 'Rejecting…' : 'Reject'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Record payment modal */}
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
                  <p className="text-xs text-gray-400">Room {confirmRecord.roomNumber ?? '—'} · {dueTitle(confirmRecord)}</p>
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
              <button onClick={submitPayment} disabled={recordMut.isPending}
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

      {claimsList.length > 0 && tab !== 'verify' && (
        <button onClick={() => setTab('verify')} className="w-full flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 text-left hover:bg-amber-100/60">
          <ShieldCheck size={18} className="text-amber-600 shrink-0" />
          <span className="text-sm font-semibold text-amber-800">{claimsList.length} UPI payment{claimsList.length !== 1 ? 's' : ''} waiting for you to confirm</span>
          <span className="ml-auto text-xs font-semibold text-amber-700">Review →</span>
        </button>
      )}

      <PushToggle title="Payment alerts on this device" description="Get notified when a resident reports a UPI payment." />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
        {tabs.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
        ))}
      </div>

      {/* Pending dues + All dues tables */}
      {(tab === 'pending' || tab === 'all') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Member', 'Room', 'Charge', 'Amount', 'Due Date', 'Status', tab === 'pending' ? 'Actions' : ''].map((h, i) => (
                  <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {(tab === 'pending' ? pendingList : (allDues as any[])).map((d, i) => (
                  <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>{getInitials(d.hostellerName)}</div>
                        <p className="font-semibold text-gray-800 whitespace-nowrap">{d.hostellerName ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className="font-mono text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg tracking-wider whitespace-nowrap">{d.roomNumber ?? '—'}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2"><TypeChip type={d.dueType} /><span className="text-gray-500 whitespace-nowrap">{periodOf(d)}</span></div>
                      {d.description && <p className="text-[11px] text-gray-400 mt-0.5 max-w-[16rem] truncate" title={d.description}>{d.description}</p>}
                    </td>
                    <td className="px-5 py-3.5"><span className={`font-bold text-sm ${isOverdue(d) ? 'text-red-600' : d.status === 'PAID' ? 'text-emerald-600' : 'text-gray-900'}`}>{inr(d.amount)}</span>{Number(d.paidAmount ?? 0) > 0 && d.status !== 'PAID' && <p className="text-[11px] text-gray-400">{inr(d.paidAmount)} paid</p>}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{fmtDate(d.dueDate)}</td>
                    <td className="px-5 py-3.5">
                      {Number(d.pendingVerificationAmount ?? 0) > 0 ? <Badge status="PENDING_VERIFICATION" /> : <Badge status={isOverdue(d) && d.status === 'UNPAID' ? 'OVERDUE' : d.status} />}
                    </td>
                    {tab === 'pending' && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openRecord(d)} className="flex items-center gap-1.5 text-emerald-700 hover:text-white font-semibold text-xs border border-emerald-200 bg-emerald-50 hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">
                            <IndianRupee size={12} /> Record
                          </button>
                          <a href={d.hostellerMobile ? whatsappLink(d.hostellerMobile, waText(d)) : undefined} target="_blank" rel="noreferrer"
                            title={d.hostellerMobile ? 'Send WhatsApp reminder (opens WhatsApp)' : 'No mobile number on file'}
                            aria-disabled={!d.hostellerMobile}
                            className={`${iconBtn} border-green-200 text-green-600 hover:bg-green-50 ${d.hostellerMobile ? '' : 'opacity-40 pointer-events-none'}`}>
                            <MessageCircle size={14} />
                          </a>
                          <button onClick={() => remindMut.mutate(d.id)} disabled={remindMut.isPending} title="Send email + app reminder now"
                            className={`${iconBtn} border-brand-200 text-brand-600 hover:bg-brand-50`}>
                            <BellRing size={14} />
                          </button>
                          {canWaive && d.dueType !== 'RENT' && Number(d.paidAmount ?? 0) === 0 && Number(d.pendingVerificationAmount ?? 0) === 0 && (
                            <button onClick={() => setWaiveTarget(d)} title="Waive this charge"
                              className={`${iconBtn} border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50`}>
                              <Ban size={14} />
                            </button>
                          )}
                        </div>
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

      {/* UPI payments to verify */}
      {tab === 'verify' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800 text-sm">UPI payments reported by residents</h2>
            <p className="text-xs text-gray-400 mt-0.5">Open your UPI app{paySettings?.upiId ? ` (${paySettings.upiId})` : ''}, find each UTR, then confirm or reject.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Member', 'For', 'Amount', 'UTR', 'Submitted', ''].map((h, i) => (
                  <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {claimsList.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/70">
                    <td className="px-5 py-3.5 font-semibold text-gray-800 whitespace-nowrap">{c.hostellerName ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{c.periodMonth ? dueTitle(c) : '—'}</td>
                    <td className="px-5 py-3.5 font-bold text-gray-900">{inr(c.amount)}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-600 tracking-wider">{c.transactionRef}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{fmtDate(c.createdAt ?? c.paymentDate)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => confirmMut.mutate(c.id)} disabled={confirmMut.isPending}
                          className="flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg disabled:opacity-60">
                          <CheckCircle2 size={12} /> Received
                        </button>
                        <button onClick={() => { setRejectReason(''); setRejectTarget(c) }}
                          className="flex items-center gap-1 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg">
                          <XCircle size={12} /> Not received
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {claimsList.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm font-semibold text-gray-400">Nothing to verify</td></tr>}
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
                {['Member', 'For', 'Method', 'Reference', 'Date', 'Amount', ''].map((h, i) => (
                  <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {recordsList.map((r, i) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>{getInitials(r.hostellerName)}</div>
                        <p className="font-semibold text-gray-800 whitespace-nowrap">{r.hostellerName ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{r.periodMonth ? dueTitle(r) : (r.period ?? '—')}</td>
                    <td className="px-5 py-3.5"><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{(r.paymentMethod ?? '—').replace('_', ' ')}</span></td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500 tracking-wider">{r.transactionRef ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{fmtDate(r.paymentDate)}</td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600">{inr(r.amount)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => receipt(r)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800">
                        <Download size={12} /> Receipt
                      </button>
                    </td>
                  </tr>
                ))}
                {recordsList.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm font-semibold text-gray-400">No payments received yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
