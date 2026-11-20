import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, LogOut, XCircle } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { cancelCheckout, getMyCheckout, requestCheckout, getCheckoutEstimate } from '../../api/hosteller'
import NoticeEstimate from '../../components/stay/NoticeEstimate'
import { errMsg } from '../../api/ops'
import { useToastStore } from '../../store/toastStore'

const fmt = (d?: string | null) => (d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const STATUS: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  REQUESTED: { label: 'Waiting for room check', cls: 'bg-amber-50 text-amber-700', icon: Clock },
  APPROVED: { label: 'Checked out', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  REJECTED: { label: 'Action needed', cls: 'bg-red-50 text-red-700', icon: XCircle },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500', icon: XCircle },
}
const ITEM_CLS: Record<string, string> = { OK: 'text-emerald-600', DAMAGED: 'text-amber-600', MISSING: 'text-red-600', NA: 'text-gray-400' }

export default function Checkout() {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const today = new Date().toLocaleDateString('en-CA')
  const { data, isLoading } = useQuery({ queryKey: ['my-checkout'], queryFn: getMyCheckout })
  const [date, setDate] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const canAsk = !!data?.activeStay && !(data?.requests ?? []).some((r: any) => r.status === 'REQUESTED')
  // Default last day = full notice from today (or the booked end of a short stay)
  const { data: defaultEst } = useQuery({ queryKey: ['checkout-estimate', 'default'], queryFn: () => getCheckoutEstimate(), enabled: canAsk })
  const chosen = date ?? data?.expectedCheckoutDate ?? defaultEst?.lastDay ?? today
  const { data: est } = useQuery({ queryKey: ['checkout-estimate', chosen], queryFn: () => getCheckoutEstimate(chosen), enabled: canAsk && !!chosen })

  const refresh = () => { qc.invalidateQueries({ queryKey: ['my-checkout'] }); qc.invalidateQueries({ queryKey: ['pending-feedback'] }) }
  const send = useMutation({
    mutationFn: () => requestCheckout({ date: chosen, reason: reason.trim() || undefined }),
    onSuccess: () => { refresh(); setReason(''); show('success', 'Notice given', 'The hostel will check the room on your last day and confirm.') },
    onError: (e) => show('error', 'Could not request', errMsg(e)),
  })
  const cancel = useMutation({
    mutationFn: (id: number) => cancelCheckout(id),
    onSuccess: () => { refresh(); show('success', 'Request cancelled', '') },
    onError: (e) => show('error', 'Could not cancel', errMsg(e)),
  })

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>
  const requests: any[] = data?.requests ?? []
  const open = requests.find((r) => r.status === 'REQUESTED')

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Check-out" subtitle="Leaving the hostel? Give notice here — see what it costs first; staff check the room and confirm." />

      {data?.activeStay && !open && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          {data.expectedCheckoutDate && <p className="text-sm text-gray-600">Your booked stay ends on <b>{fmt(data.expectedCheckoutDate)}</b>.</p>}
          <label className="block">
            <span className="text-xs font-semibold text-gray-500">Last day (check-out date)</span>
            <input type="date" min={today} value={chosen} onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-500">Reason (optional)</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} placeholder="e.g. Moving to another city"
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </label>
          <NoticeEstimate e={est} />
          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
            Before you leave, keep these ready to hand over: room & locker keys, blanket / bedsheet, pillow and any ID or access card.
            Clear any pending dues in <Link to="/app/dues" className="text-brand-600 font-semibold">My Payments</Link>. Your deposit settlement will appear under My Documents.
          </p>
          <button onClick={() => send.mutate()} disabled={send.isPending}
            className="w-full py-3 rounded-xl text-sm font-bold text-white brand-gradient disabled:opacity-60 flex items-center justify-center gap-2">
            <LogOut size={15} /> {send.isPending ? 'Sending…' : 'Give notice & request check-out'}
          </button>
        </div>
      )}

      {!data?.activeStay && !requests.length && (
        <p className="text-sm text-gray-500">You don't have an active stay right now.</p>
      )}

      {requests.map((r) => {
        const st = STATUS[r.status] ?? STATUS.REQUESTED
        const Icon = st.icon
        return (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls}`}><Icon size={12} /> {st.label}</span>
              <span className="text-sm text-gray-600">for {fmt(r.requestedDate)}</span>
              {r.roomName && <span className="text-xs text-gray-400">· {r.roomName}{r.bedName ? ` / ${r.bedName}` : ''}</span>}
            </div>
            {r.reason && <p className="text-xs text-gray-500">Your reason: {r.reason}</p>}
            {r.status === 'REQUESTED' && r.estimate && <NoticeEstimate e={r.estimate} />}
            {r.staffNote && <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">Hostel: {r.staffNote}</p>}
            {r.items?.length > 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                {r.items.map((i: any) => (
                  <li key={i.label} className="flex justify-between gap-2"><span className="text-gray-600">{i.label}</span>
                    <span className={`font-semibold ${ITEM_CLS[i.status] ?? ''}`}>{i.status === 'NA' ? 'N/A' : i.status.charAt(0) + i.status.slice(1).toLowerCase()}{i.note ? ` · ${i.note}` : ''}</span></li>
                ))}
              </ul>
            )}
            {r.status === 'REQUESTED' && (
              <button onClick={() => cancel.mutate(r.id)} disabled={cancel.isPending} className="text-xs font-semibold text-red-600 hover:underline">Cancel request</button>
            )}
          </div>
        )
      })}
    </div>
  )
}
