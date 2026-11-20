import { AlertTriangle, Calculator } from 'lucide-react'
import { rupees } from './stayLabels'

const fmt = (d?: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

/** "Give notice" maths: what leaving on a date costs and roughly what comes back from the deposit. */
export default function NoticeEstimate({ e, staff }: { e: any; staff?: boolean }) {
  if (!e) return null
  const rows: { label: string; value: string; minus?: boolean; hint?: string }[] = [
    { label: 'Deposit held', value: rupees(e.depositHeld) },
  ]
  if (Number(e.openDues) > 0) rows.push({ label: 'Unpaid dues now', value: rupees(e.openDues), minus: true })
  if (Number(e.rentToLastDay) > 0) rows.push({ label: 'Rent up to the last day (not billed yet)', value: rupees(e.rentToLastDay), minus: true, hint: 'pro-rata for the last month' })
  if (Number(e.shortNoticeCharge) > 0) rows.push({ label: `Short notice: ${e.shortNoticeDays} day${e.shortNoticeDays === 1 ? '' : 's'}`, value: rupees(e.shortNoticeCharge), minus: true, hint: 'rent for the missing notice days' })
  if (e.inLockIn && Number(e.earlyExitFee) > 0) rows.push({ label: 'Early-exit fee (within lock-in)', value: rupees(e.earlyExitFee), minus: true })

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Calculator size={13} /> {staff ? 'Estimate the resident saw' : 'What leaving on this date means'}</p>
      {!e.shortStay && (
        <p className="text-sm text-gray-700">
          {e.noticeDays > 0 ? <>Notice period is <b>{e.noticeDays} days</b> — full notice means leaving on or after <b>{fmt(e.fullNoticeDate)}</b>.</> : 'This hostel has no notice period.'}
          {e.lockInEnds && <> Lock-in ends on <b>{fmt(e.lockInEnds)}</b>.</>}
        </p>
      )}
      {(Number(e.shortNoticeDays) > 0 || e.inLockIn) && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            {Number(e.shortNoticeDays) > 0 && <>Leaving on {fmt(e.lastDay)} is {e.shortNoticeDays} days short of the notice period. </>}
            {e.inLockIn && <>This is within the lock-in period. </>}
            The hostel may deduct the amounts below from your deposit.
          </span>
        </p>
      )}
      <div className="divide-y divide-gray-100 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-3 py-1.5">
            <span className="text-gray-600">{r.label}{r.hint && <span className="block text-[11px] text-gray-400">{r.hint}</span>}</span>
            <span className={`font-semibold whitespace-nowrap ${r.minus ? 'text-red-600' : 'text-gray-800'}`}>{r.minus ? '− ' : ''}{r.value}</span>
          </div>
        ))}
        <div className="flex justify-between gap-3 pt-2">
          <span className="font-semibold text-gray-800">{Number(e.estimatedBalance) > 0 ? 'You may still owe' : 'Estimated refund'}</span>
          <span className={`font-bold ${Number(e.estimatedBalance) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            {rupees(Number(e.estimatedBalance) > 0 ? e.estimatedBalance : e.estimatedRefund)}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-gray-400">
        An estimate before the room check (damage or missing items are extra). Refund due by {fmt(e.refundBy)} — {e.refundDays} days after you leave.
        {e.termsLocked ? ' Based on the terms saved when you booked.' : ''}
      </p>
    </div>
  )
}
