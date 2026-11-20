import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import PageHeader from '../../components/ui/PageHeader'
import { useToastStore } from '../../store/toastStore'
import { inr } from '../../lib/payments'
import { errMsg, getPlatformPayments, getPlatformSettings, savePlatformSettings } from '../../api/ops'

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–')

/** Super admin: free tier, per-bed price, grace period, premium badge; recent owner payments. */
export default function Pricing() {
  const { data: s } = useQuery({ queryKey: ['platform-settings'], queryFn: getPlatformSettings })
  const { data: payments = [] } = useQuery({ queryKey: ['platform-payments'], queryFn: getPlatformPayments })
  const total = (payments as any[]).reduce((sum, p) => sum + Number(p.amount), 0)
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Plans & Pricing" subtitle="Owners get the free tier automatically and can buy more beds themselves from Plan & Billing." />
      {s && <PricingForm key={s.updatedAt} s={s} />}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center"><h3 className="font-semibold text-gray-800 text-sm flex-1">Owner payments</h3><span className="text-sm font-bold text-gray-900">{inr(total)}</span></div>
        {payments.length === 0 ? <p className="text-sm text-gray-400 p-6 text-center">No payments yet. Record offline payments from an owner's page.</p> : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400"><tr><th className="text-left px-5 py-2">Owner</th><th className="text-left px-2">Plan</th><th className="text-left px-2">Paid on</th><th className="text-left px-2">Method</th><th className="text-right px-5">Amount</th></tr></thead>
            <tbody>
              {(payments as any[]).map((p) => (
                <tr key={p.id} className="border-t border-gray-50">
                  <td className="px-5 py-2"><Link to={`/super-admin/owners/${p.ownerId}`} className="text-violet-700 font-semibold">{p.ownerName ?? `Owner #${p.ownerId}`}</Link></td>
                  <td className="px-2">{p.beds} beds · {p.months} mo</td>
                  <td className="px-2 text-gray-500">{fmt(p.paidAt)}</td>
                  <td className="px-2 text-gray-500">{p.method === 'MANUAL' ? `Manual${p.reference ? ` (${p.reference})` : ''}` : 'Razorpay'}</td>
                  <td className="px-5 text-right font-semibold">{inr(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function PricingForm({ s }: { s: any }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const [f, setF] = useState({ freeBedLimit: String(s.freeBedLimit), pricePerBed: String(s.pricePerBed), graceDays: String(s.graceDays), premiumBadge: !!s.premiumBadge })
  const mut = useMutation({
    mutationFn: () => savePlatformSettings({ ...f, freeBedLimit: Number(f.freeBedLimit), graceDays: Number(f.graceDays) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform-settings'] }); show('success', 'Pricing saved') },
    onError: (e) => show('error', 'Not saved', errMsg(e)),
  })
  const paidBeds = Math.max(0, 60 - Number(f.freeBedLimit))
  const cls = 'block mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 grid sm:grid-cols-2 gap-4">
      <label className="text-xs font-semibold text-gray-500">Free beds per owner<input type="number" min={0} value={f.freeBedLimit} onChange={(e) => setF({ ...f, freeBedLimit: e.target.value })} className={cls} /></label>
      <label className="text-xs font-semibold text-gray-500">Price per extra bed per month (₹)<input type="number" min={0} step="0.5" value={f.pricePerBed} onChange={(e) => setF({ ...f, pricePerBed: e.target.value })} className={cls} /></label>
      <label className="text-xs font-semibold text-gray-500">Grace period after expiry (days)<input type="number" min={0} max={60} value={f.graceDays} onChange={(e) => setF({ ...f, graceDays: e.target.value })} className={cls} /></label>
      <label className="flex items-start gap-2 text-sm text-gray-700 mt-5">
        <input type="checkbox" checked={f.premiumBadge} onChange={(e) => setF({ ...f, premiumBadge: e.target.checked })} className="mt-1 accent-violet-600" />
        <span>Premium badge and ranking boost on public hostel pages for owners on a paid plan</span>
      </label>
      <div className="sm:col-span-2 flex items-center gap-3 flex-wrap">
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}>{mut.isPending ? 'Saving…' : 'Save pricing'}</button>
        <p className="text-xs text-gray-400">Example: 60 beds = {paidBeds} paid × {inr(f.pricePerBed)} = {inr(paidBeds * Number(f.pricePerBed))}/month</p>
      </div>
    </div>
  )
}
