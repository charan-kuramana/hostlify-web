import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Clock, CheckCircle2, AlertTriangle, Receipt, Wallet, QrCode, Download, FileText, Info } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import PushToggle from '../../components/common/PushToggle'
import UpiPayModal from '../../components/payments/UpiPayModal'
import { getCurrentDue, getDuesHistory, getMyPaymentRecords, getMyPaymentSettings, initiateRazorpay, submitUpiClaim, verifyRazorpay } from '../../api/hosteller'
import { getHostel } from '../../api/staff'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { openRazorpayCheckout } from '../../lib/razorpay'
import { DUE_TYPE_LABEL, DUE_TYPE_STYLE, blobErrorMessage, downloadPdf, dueTitle, fyStartYear, inr, outstandingOf, periodOf } from '../../lib/payments'

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
const isUnpaid = (s: string) => s === 'UNPAID' || s === 'PARTIAL' || s === 'OVERDUE'
const todayStr = () => new Date().toISOString().slice(0, 10)

function Spinner() {
  return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>
}

function TypeChip({ type }: { type?: string }) {
  const t = type ?? 'RENT'
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${DUE_TYPE_STYLE[t] ?? DUE_TYPE_STYLE.OTHER}`}>{DUE_TYPE_LABEL[t] ?? t}</span>
}

export default function MyDues() {
  const [tab, setTab] = useState<'due' | 'history'>('due')
  const [payingId, setPayingId] = useState<number | null>(null)
  const [successInfo, setSuccessInfo] = useState<any>(null)
  const [upiDue, setUpiDue] = useState<any>(null)
  const [upiErr, setUpiErr] = useState<string | null>(null)
  const [upiSubmitting, setUpiSubmitting] = useState(false)
  const [fy, setFy] = useState(fyStartYear())
  const [downloading, setDownloading] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const hostelId = useAuthStore((s) => s.hostelId)
  const { show } = useToastStore()

  const { data: hostelInfo } = useQuery({ queryKey: ['hostel-info', hostelId], queryFn: () => getHostel(hostelId!), enabled: !!hostelId })
  const onlinePaymentEnabled = hostelInfo?.onlinePaymentEnabled !== false
  const { data: paySettings } = useQuery({ queryKey: ['my-payment-settings'], queryFn: getMyPaymentSettings, retry: false })
  const upiId: string | undefined = paySettings?.upiId ?? undefined

  const { data: currentDue, isLoading: dueLoading } = useQuery({ queryKey: ['current-due'], queryFn: getCurrentDue, retry: false })
  const { data: dues = [], isLoading: duesLoading } = useQuery({ queryKey: ['dues-history'], queryFn: getDuesHistory })
  const { data: records = [], isLoading: recordsLoading } = useQuery({ queryKey: ['my-records'], queryFn: getMyPaymentRecords })

  const duesList = dues as any[]
  const recordsList = records as any[]
  const pendingDues = duesList.filter((d) => isUnpaid(d.status))
  const totalPending = pendingDues.reduce((s, d) => s + outstandingOf(d), 0)
  const paidRecords = recordsList.filter((r) => r.status === 'SUCCESS' || r.status == null)
  const totalPaid = paidRecords.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const monthlyRent = currentDue?.amount ?? duesList.find((d) => (d.dueType ?? 'RENT') === 'RENT')?.amount
  const verifying = (d: any) => Number(d.pendingVerificationAmount ?? 0) > 0
  const payable = (d: any) => Math.max(0, outstandingOf(d) - Number(d.pendingVerificationAmount ?? 0))
  const overdue = (d: any) => isUnpaid(d.status) && !!d.dueDate && d.dueDate < todayStr()

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['current-due'] })
    queryClient.invalidateQueries({ queryKey: ['dues-history'] })
    queryClient.invalidateQueries({ queryKey: ['my-records'] })
  }

  async function payOnline(due: any) {
    setPayingId(due.id)
    try {
      const info = await initiateRazorpay(due.id)
      const result = await openRazorpayCheckout({
        keyId: info.keyId, orderId: info.orderId, amountPaise: info.amountPaise,
        currency: info.currency, hostellerName: info.hostellerName, description: dueTitle(due),
      })
      if (!result) { setPayingId(null); return } // dismissed
      const details = await verifyRazorpay({
        razorpayPaymentId: result.razorpay_payment_id,
        razorpayOrderId: result.razorpay_order_id,
        razorpaySignature: result.razorpay_signature,
      })
      refresh()
      setSuccessInfo({
        amount: details?.amount ?? payable(due),
        paymentId: details?.paymentId ?? result.razorpay_payment_id,
        method: details?.method ?? 'RAZORPAY',
        paymentDate: details?.paymentDate,
        recordId: details?.recordId,
        title: dueTitle(due),
      })
    } catch (e: any) {
      show('error', 'Payment failed', e?.response?.data?.message ?? e?.message ?? 'Please try again or pay at the hostel.')
    } finally {
      setPayingId(null)
    }
  }

  async function submitUpi(amount: number, utr: string) {
    setUpiSubmitting(true)
    setUpiErr(null)
    try {
      await submitUpiClaim({ dueId: upiDue.id, amount, utr })
      setUpiDue(null)
      refresh()
      show('success', 'Payment submitted', 'The hostel will confirm it and send your receipt.')
    } catch (e: any) {
      setUpiErr(e?.response?.data?.message ?? 'Could not submit. Please try again.')
    } finally {
      setUpiSubmitting(false)
    }
  }

  async function download(key: string, path: string, filename: string) {
    setDownloading(key)
    try {
      await downloadPdf(path, filename)
    } catch (e: any) {
      show('error', 'Download failed', await blobErrorMessage(e, 'Could not download the receipt.'))
    } finally {
      setDownloading(null)
    }
  }

  function PayButtons({ due, compact }: { due: any; compact?: boolean }) {
    if (verifying(due) && payable(due) <= 0) {
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><Clock size={13} /> Awaiting confirmation</span>
    }
    if (!onlinePaymentEnabled && !upiId) {
      return <span className="text-xs text-gray-400">Pay at hostel reception</span>
    }
    const cls = compact
      ? 'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60'
      : 'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-60'
    return (
      <div className={`flex ${compact ? 'gap-1.5 justify-end' : 'gap-2 flex-wrap'}`}>
        {upiId && (
          <button onClick={() => { setUpiErr(null); setUpiDue(due) }}
            className={`${cls} ${onlinePaymentEnabled ? 'border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100' : 'text-white brand-gradient hover:opacity-90'}`}>
            <QrCode size={compact ? 12 : 16} /> {compact ? 'UPI' : 'Pay by UPI'}
          </button>
        )}
        {onlinePaymentEnabled && (
          <button onClick={() => payOnline(due)} disabled={payingId === due.id} className={`${cls} text-white brand-gradient hover:opacity-90`}>
            <CreditCard size={compact ? 12 : 16} /> {payingId === due.id ? '…' : compact ? 'Pay' : 'Pay Online'}
          </button>
        )}
      </div>
    )
  }

  const lateFeePolicy = paySettings?.lateFeeEnabled
    ? paySettings.lateFeeType === 'PER_DAY'
      ? `A late fee of ${inr(paySettings.lateFeeAmount)}/day applies to rent paid more than ${paySettings.lateFeeGraceDays} day(s) after the due date${paySettings.lateFeeMaxAmount ? ` (max ${inr(paySettings.lateFeeMaxAmount)})` : ''}.`
      : `A late fee of ${inr(paySettings.lateFeeAmount)} applies to rent paid more than ${paySettings.lateFeeGraceDays} day(s) after the due date.`
    : null

  const fyOptions = [fyStartYear(), fyStartYear() - 1, fyStartYear() - 2]

  return (
    <div className="space-y-6">
      <PageHeader title="My Payments" subtitle="Your rent and other charges, payments and receipts" />

      {upiDue && upiId && (
        <UpiPayModal due={upiDue} amount={payable(upiDue)} upiId={upiId} payeeName={paySettings?.upiPayeeName}
          submitting={upiSubmitting} error={upiErr} onSubmit={submitUpi} onClose={() => setUpiDue(null)} />
      )}

      {/* Payment success receipt */}
      {successInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
            <div className="flex flex-col items-center text-center px-6 pt-8 pb-5">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle2 size={34} className="text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Payment Successful</h2>
              <p className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">{inr(successInfo.amount)}</p>
              <p className="text-sm text-gray-400 mt-1">{successInfo.title} paid</p>
            </div>
            <div className="mx-6 mb-5 rounded-xl bg-gray-50 divide-y divide-gray-100 text-sm">
              {[
                { l: 'Status', v: <Badge status="SUCCESS" /> },
                { l: 'Method', v: successInfo.method },
                { l: 'Payment ID', v: <span className="font-mono text-xs">{successInfo.paymentId}</span> },
                { l: 'Date', v: fmtDate(successInfo.paymentDate) },
              ].map(({ l, v }) => (
                <div key={l} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-gray-400 font-medium">{l}</span>
                  <span className="font-semibold text-gray-800">{v}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              {successInfo.recordId ? (
                <button onClick={() => download('success', `/payment/records/${successInfo.recordId}/receipt.pdf`, `Receipt-${successInfo.recordId}.pdf`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
                  <Download size={14} /> Receipt
                </button>
              ) : (
                <button onClick={() => { setSuccessInfo(null); setTab('history') }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
                  View History
                </button>
              )}
              <button onClick={() => setSuccessInfo(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white brand-gradient hover:opacity-90">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Monthly Rent" value={monthlyRent != null ? inr(monthlyRent) : '—'}
          sub={currentDue?.dueDate ? `Current due ${fmtDate(currentDue.dueDate)}` : 'No active due'}
          icon={<Wallet size={20} className="text-brand-600" />} iconBg="bg-brand-50" />
        <StatCard label="Outstanding" value={inr(totalPending)}
          sub={pendingDues.length ? `${pendingDues.length} unpaid due${pendingDues.length !== 1 ? 's' : ''}` : 'All clear 🎉'}
          icon={<AlertTriangle size={20} className="text-amber-500" />} iconBg="bg-amber-50" />
        <StatCard label="Total Paid" value={inr(totalPaid)}
          sub={`${paidRecords.length} payment${paidRecords.length !== 1 ? 's' : ''}`}
          icon={<CheckCircle2 size={20} className="text-emerald-600" />} iconBg="bg-emerald-50" />
      </div>

      <PushToggle title="Payment reminders on this device" description="Get a notification before rent is due and when your receipt is ready." />

      {/* Highlighted current due banner */}
      {!dueLoading && currentDue && isUnpaid(currentDue.status) && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3" style={{ background: '#fffbf0', borderBottom: '1px solid #fef3c7' }}>
            <Clock size={14} className="text-amber-500 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">{periodOf(currentDue)} rent is due</p>
            {currentDue.dueDate && <span className="ml-auto text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">Due {fmtDate(currentDue.dueDate)}</span>}
          </div>
          <div className="p-6 flex items-center justify-between gap-6 flex-wrap">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Outstanding Amount</p>
              <p className="text-4xl font-bold text-gray-900 mt-1 tracking-tight">{inr(outstandingOf(currentDue))}</p>
              {verifying(currentDue) && <p className="text-xs text-amber-600 mt-1">{inr(currentDue.pendingVerificationAmount)} UPI payment awaiting confirmation</p>}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <PayButtons due={currentDue} />
              <p className="text-[11px] text-gray-400">Or pay by cash at reception. Staff will record it.</p>
            </div>
          </div>
          {lateFeePolicy && (
            <div className="px-6 pb-4 -mt-2 flex items-start gap-1.5 text-xs text-gray-500"><Info size={13} className="shrink-0 mt-0.5" /> {lateFeePolicy}</div>
          )}
        </div>
      )}

      {/* Pill tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['due', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'due' ? `Dues (${pendingDues.length})` : `Payments & Receipts (${recordsList.length})`}
          </button>
        ))}
      </div>

      {/* Dues tab: every charge with pay actions */}
      {tab === 'due' && (
        duesLoading ? <Spinner /> : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Charge', 'Amount', 'Due Date', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {duesList.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2"><TypeChip type={d.dueType} /><span className="font-medium text-gray-700">{periodOf(d)}</span></div>
                        {d.description && <p className="text-[11px] text-gray-400 mt-0.5">{d.description}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-gray-900">{inr(isUnpaid(d.status) ? outstandingOf(d) : d.amount)}</span>
                        {isUnpaid(d.status) && Number(d.paidAmount ?? 0) > 0 && <p className="text-[11px] text-gray-400">of {inr(d.amount)}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{fmtDate(d.dueDate)}</td>
                      <td className="px-5 py-3.5">
                        {verifying(d) && isUnpaid(d.status) ? <Badge status="PENDING_VERIFICATION" /> : <Badge status={overdue(d) && d.status === 'UNPAID' ? 'OVERDUE' : d.status} />}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {isUnpaid(d.status) ? <PayButtons due={d} compact />
                          : <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 size={13} /> Paid</span>}
                      </td>
                    </tr>
                  ))}
                  {duesList.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">No dues yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* History tab: payments with receipt downloads + yearly HRA receipt */}
      {tab === 'history' && (
        recordsLoading ? <Spinner /> : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><FileText size={17} className="text-emerald-600" /></div>
              <div className="flex-1 min-w-[12rem]">
                <p className="text-sm font-semibold text-gray-800">Rent receipt for HRA</p>
                <p className="text-xs text-gray-400">One PDF with every month of rent paid in the financial year, ready for your employer.</p>
              </div>
              <select value={fy} onChange={(e) => setFy(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                {fyOptions.map((y) => <option key={y} value={y}>FY {y}-{String(y + 1).slice(2)}</option>)}
              </select>
              <button onClick={() => download('hra', `/payment/receipts/hra?fy=${fy}`, `HRA-Rent-Receipt-FY${fy}-${String(fy + 1).slice(2)}.pdf`)}
                disabled={downloading === 'hra'}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-60">
                <Download size={13} /> {downloading === 'hra' ? 'Preparing…' : 'Download'}
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center"><Receipt size={14} className="text-emerald-600" /></div>
                <h2 className="font-semibold text-gray-800 text-sm">Payment History</h2>
                <span className="ml-auto text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{recordsList.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    {['Date', 'For', 'Method', 'Reference', 'Amount', 'Status', ''].map((h, i) => (
                      <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {recordsList.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3.5 text-gray-700 font-medium whitespace-nowrap">{fmtDate(p.paymentDate ?? p.createdAt)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">{p.periodMonth ? <span className="text-gray-600">{dueTitle(p)}</span> : '—'}</td>
                        <td className="px-5 py-3.5"><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{(p.paymentMethod ?? '—').replace('_', ' ')}</span></td>
                        <td className="px-5 py-3.5 font-mono text-xs text-gray-500 tracking-wider">{p.razorpayPaymentId ?? p.transactionRef ?? '—'}</td>
                        <td className="px-5 py-3.5 font-bold text-emerald-600">{inr(p.amount)}</td>
                        <td className="px-5 py-3.5"><Badge status={p.status} /></td>
                        <td className="px-5 py-3.5 text-right">
                          {(p.status === 'SUCCESS' || p.status == null) && (
                            <button onClick={() => download(`r${p.id}`, `/payment/records/${p.id}/receipt.pdf`, `Receipt-${p.receiptNo ?? p.id}.pdf`)}
                              disabled={downloading === `r${p.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 disabled:opacity-50">
                              <Download size={12} /> Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {recordsList.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">No payments yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
