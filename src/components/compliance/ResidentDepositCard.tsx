import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, CalendarClock, Download, MessageSquareWarning, Wallet } from 'lucide-react'
import { disputeSettlement } from '../../api/compliance'
import { inr } from '../../lib/payments'
import { useToastStore } from '../../store/toastStore'

const fmt = (d?: string | null) => (d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const daysLeft = (d: string) => Math.ceil((new Date(d + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 86400000)

/** Resident: deposits waiting to be settled (with the refund deadline), and each statement with its evidence and a dispute option. */
export default function ResidentDepositCard({ pending, settlements, onChanged, onPdf }: {
  pending: any[]; settlements: any[]; onChanged: () => void; onPdf: (id: number) => void
}) {
  if (!pending.length && !settlements.length) return null
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2"><Wallet size={17} className="text-emerald-600" /><p className="font-bold text-gray-800 text-sm">Deposit refund</p></div>
      {pending.map((p) => <PendingRefund key={p.bookingId} p={p} />)}
      {settlements.map((s) => <Statement key={s.id} s={s} onChanged={onChanged} onPdf={() => onPdf(s.id)} />)}
    </div>
  )
}

function PendingRefund({ p }: { p: any }) {
  const left = p.refundDueBy ? daysLeft(p.refundDueBy) : null
  return (
    <div className={`rounded-xl p-3 text-sm border ${p.overdue ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <p className="font-semibold text-gray-800">{p.hostelName}: {inr(p.depositHeld)} deposit</p>
      <p className={`text-xs mt-0.5 flex items-center gap-1 ${p.overdue ? 'text-red-700' : 'text-amber-800'}`}>
        {p.overdue ? <AlertTriangle size={12} /> : <CalendarClock size={12} />}
        {p.overdue
          ? `Refund was due by ${fmt(p.refundDueBy)}. The hostel has been reminded.`
          : `You left on ${fmt(p.checkoutDate)}. The hostel must settle it by ${fmt(p.refundDueBy)}${left != null && left >= 0 ? ` (${left} day${left === 1 ? '' : 's'} left)` : ''}.`}
      </p>
    </div>
  )
}

function Statement({ s, onChanged, onPdf }: { s: any; onChanged: () => void; onPdf: () => void }) {
  const { show } = useToastStore()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const photos: Record<number, any> = Object.fromEntries((s.evidencePhotos ?? []).map((p: any) => [p.id, p]))
  const owes = Number(s.balanceDue) > 0
  const mut = useMutation({
    mutationFn: () => disputeSettlement(s.id, reason.trim()),
    onSuccess: () => { setOpen(false); setReason(''); onChanged(); show('success', 'Sent to the hostel', 'They have been asked to reply.') },
    onError: (e: any) => show('error', 'Could not send', e?.response?.data?.message ?? 'Try again.'),
  })
  return (
    <div className="border border-gray-100 rounded-xl p-3 space-y-1.5 text-sm">
      <div className="flex justify-between"><span className="text-gray-500">Deposit held</span><span>{inr(s.depositHeld)}</span></div>
      <div className="flex justify-between"><span className="text-gray-500">Unpaid dues adjusted</span><span>− {inr(s.unpaidDues)}</span></div>
      {(s.deductions ?? []).map((d: any, i: number) => (
        <div key={i}>
          <div className="flex justify-between"><span className="text-gray-500">{d.label}</span><span>− {inr(d.amount)}</span></div>
          {d.note && <p className="text-xs text-gray-400 pl-2">{d.note}</p>}
          {d.photoIds?.length > 0 && (
            <div className="flex gap-1.5 pl-2 mt-1 flex-wrap">
              {d.photoIds.map((pid: number) => photos[pid]?.url && (
                <a key={pid} href={photos[pid].url} target="_blank" rel="noopener noreferrer" title={photos[pid].caption ?? ''} className="relative">
                  <img src={photos[pid].url} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-100" />
                  <span className="absolute bottom-0.5 left-0.5 text-[9px] font-bold px-1 rounded bg-black/60 text-white">{photos[pid].kind === 'MOVE_IN' ? 'IN' : 'OUT'}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
      {Number(s.waivedAmount) > 0 && <div className="flex justify-between text-emerald-700"><span>Given up after your query</span><span>+ {inr(s.waivedAmount)}</span></div>}
      <div className="flex justify-between font-bold pt-1 border-t border-gray-100">
        <span>{owes ? 'You still owe' : s.status === 'REFUNDED' ? 'Refunded to you' : 'Refund due to you'}</span>
        <span>{inr(owes ? s.balanceDue : s.refundAmount)}</span>
      </div>
      {s.status === 'FINALIZED' && Number(s.refundAmount) > 0 && s.refundDueBy && (
        <p className={`text-xs flex items-center gap-1 ${s.refundOverdue ? 'text-red-600' : 'text-gray-500'}`}>
          {s.refundOverdue ? <AlertTriangle size={12} /> : <CalendarClock size={12} />}
          {s.refundOverdue ? `Payment was due by ${fmt(s.refundDueBy)}.` : `To be paid by ${fmt(s.refundDueBy)}.`}
        </p>
      )}
      {s.status === 'REFUNDED' && <p className="text-xs text-gray-500">Paid on {fmt(s.refundedAt)} by {String(s.refundMethod ?? '').replace('_', ' ').toLowerCase()}{s.refundReference ? ` (ref ${s.refundReference})` : ''}.</p>}
      {s.notes && <p className="text-xs text-gray-500">{s.notes}</p>}

      {s.disputeStatus === 'OPEN' && (
        <p className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2">You raised: "{s.disputeReason}". Waiting for the hostel's reply.</p>
      )}
      {s.disputeStatus === 'RESOLVED' && (
        <div className="text-xs bg-gray-50 rounded-lg px-3 py-2 space-y-1">
          <p className="text-gray-500">You raised: "{s.disputeReason}"</p>
          <p className="text-gray-800"><b>Hostel replied:</b> {s.disputeResponse}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1 flex-wrap">
        <button onClick={onPdf} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600"><Download size={13} /> PDF</button>
        {!s.disputeStatus && !open && (
          <button onClick={() => setOpen(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-200 text-amber-700">
            <MessageSquareWarning size={13} /> I disagree
          </button>
        )}
      </div>
      {open && (
        <div className="space-y-2 pt-1">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000}
            placeholder="Which deduction do you disagree with, and why? e.g. The blanket was already torn at move-in (see move-in photo)."
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400" />
          <div className="flex gap-2">
            <button onClick={() => mut.mutate()} disabled={mut.isPending || reason.trim().length < 10}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white brand-gradient disabled:opacity-50">{mut.isPending ? 'Sending…' : 'Send to hostel'}</button>
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
