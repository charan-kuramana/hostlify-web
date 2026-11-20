import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '../../store/toastStore'
import { inr } from '../../lib/payments'
import { errMsg, getOwnerPlan, recordOwnerPayment } from '../../api/ops'

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–')

/** Super admin, owner page: bed usage vs limit, and recording an offline (bank/UPI) payment for a per-bed plan. */
export default function OwnerPlanCard({ ownerId }: { ownerId: number }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const { data } = useQuery({ queryKey: ['sa-owner-plan', ownerId], queryFn: () => getOwnerPlan(ownerId) })
  const [f, setF] = useState({ beds: '', months: '1', amount: '', reference: '' })
  const mut = useMutation({
    mutationFn: () => recordOwnerPayment(ownerId, { beds: Number(f.beds), months: Number(f.months), amount: f.amount, reference: f.reference }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-owner-plan', ownerId] })
      qc.invalidateQueries({ queryKey: ['sa-subscription', ownerId] })
      setF({ beds: '', months: '1', amount: '', reference: '' })
      show('success', 'Payment recorded', 'The per-bed plan is active.')
    },
    onError: (e) => show('error', 'Not recorded', errMsg(e)),
  })
  if (!data) return null
  const u = data.usage
  const suggested = f.beds && Number(f.beds) > u.freeBedLimit ? (Number(f.beds) - u.freeBedLimit) * Number(u.pricePerBed) * Number(f.months) : 0
  const cls = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50"><h3 className="font-semibold text-gray-800 text-sm">Beds & billing</h3></div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-gray-700"><b>{u.planLabel}</b>{u.paidActive ? ` until ${fmt(u.expiresAt)}` : ''} · {u.usedBeds} of {u.maxBeds} beds used{u.inGrace ? ' · expired, in grace period' : ''}</p>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Record an offline payment (bank transfer / UPI)</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder={`Beds (> ${u.freeBedLimit})`} value={f.beds} onChange={(e) => setF({ ...f, beds: e.target.value })} className={cls} aria-label="Beds" />
            <select value={f.months} onChange={(e) => setF({ ...f, months: e.target.value })} className={cls} aria-label="Months">
              {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
            </select>
            <input type="number" placeholder={suggested ? `Amount (list price ${inr(suggested)})` : 'Amount received'} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className={cls} aria-label="Amount" />
            <input placeholder="UTR / reference" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} className={cls} aria-label="Reference" />
          </div>
          <button onClick={() => mut.mutate()} disabled={mut.isPending || !f.beds || f.amount === ''} className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}>{mut.isPending ? 'Saving…' : 'Record payment & activate'}</button>
        </div>
        {data.payments.length > 0 && (
          <ul className="text-xs text-gray-500 space-y-1 border-t border-gray-50 pt-3">
            {data.payments.map((p: any) => <li key={p.id}>{fmt(p.paidAt)}: {p.beds} beds × {p.months} mo, {inr(p.amount)} ({p.method === 'MANUAL' ? 'manual' : 'Razorpay'}){p.status !== 'PAID' ? ` · ${p.status.toLowerCase()}` : ''}</li>)}
          </ul>
        )}
      </div>
    </div>
  )
}
