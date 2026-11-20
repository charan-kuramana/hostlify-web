import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, BedDouble, CreditCard, Crown } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { inr } from '../../lib/payments'
import { openRazorpayCheckout } from '../../lib/razorpay'
import { errMsg, getMyPlan, getMyPlanPayments, getPlanQuote, startPlanCheckout, verifyPlanPayment } from '../../api/ops'

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–')

export default function Billing() {
  const { subRole } = useAuthStore()
  const isOwner = subRole === 'OWNER'
  const qc = useQueryClient()
  const { show } = useToastStore()
  const { data: plan, isLoading } = useQuery({ queryKey: ['my-plan'], queryFn: getMyPlan })
  const { data: payments = [] } = useQuery({ queryKey: ['my-plan-payments'], queryFn: getMyPlanPayments })
  const [bedsInput, setBeds] = useState<number | null>(null)
  const beds = bedsInput ?? (plan ? Math.max(plan.freeBedLimit + 10, Math.ceil((plan.usedBeds + 5) / 5) * 5, plan.payPerBedPlan ? plan.maxBeds : 0) : 0)
  const [months, setMonths] = useState(1)
  const validBeds = plan && beds > plan.freeBedLimit && beds >= plan.usedBeds
  const { data: quote, error: quoteErr } = useQuery({
    queryKey: ['plan-quote', beds, months], queryFn: () => getPlanQuote(beds, months), enabled: !!plan && isOwner && !!validBeds, retry: false,
  })
  const pay = useMutation({
    mutationFn: async () => {
      const info = await startPlanCheckout(beds, months)
      const res = await openRazorpayCheckout({ ...info, description: `Hostlify plan: ${beds} beds, ${months} month(s)` })
      if (!res) return null
      return verifyPlanPayment({ razorpayOrderId: res.razorpay_order_id, razorpayPaymentId: res.razorpay_payment_id, razorpaySignature: res.razorpay_signature })
    },
    onSuccess: (r) => {
      if (!r) return
      qc.invalidateQueries({ queryKey: ['my-plan'] })
      qc.invalidateQueries({ queryKey: ['my-plan-payments'] })
      show('success', 'Plan activated', `You can now have up to ${r.maxBeds} beds until ${fmt(r.expiresAt)}.`)
    },
    onError: (e: any) => show('error', 'Payment not completed', errMsg(e, e?.message ?? 'Please try again.')),
  })

  if (isLoading || !plan) return <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>
  const pct = Math.min(100, Math.round((plan.usedBeds / Math.max(plan.maxBeds, 1)) * 100))

  return (
    <div className="max-w-3xl">
      <PageHeader title="Plan & Billing" subtitle={`The first ${plan.freeBedLimit} beds are free forever. Above that, ${inr(plan.pricePerBed)} per extra bed per month.`} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${plan.paidActive ? 'bg-amber-50' : 'bg-gray-50'}`}>{plan.paidActive ? <Crown size={18} className="text-amber-500" /> : <BedDouble size={18} className="text-gray-500" />}</div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-400 uppercase">Current plan</p>
            <p className="text-lg font-bold text-gray-900">{plan.planLabel}</p>
            {plan.paidActive && <p className="text-xs text-gray-500">{plan.inGrace ? <span className="text-red-600 font-semibold">Expired on {fmt(plan.expiresAt)}. Limits stay until {fmt(plan.graceEndsAt)}; renew to keep them.</span> : <>Valid until {fmt(plan.expiresAt)}</>}</p>}
          </div>
          {plan.premiumBadge && <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1"><BadgeCheck size={12} /> Premium listing</span>}
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{plan.usedBeds} of {plan.maxBeds} beds used</span><span>{plan.bedsLeft} left</span></div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: pct + '%' }} /></div>
          {pct >= 90 && <p className="text-xs text-red-600 mt-2">You're close to your bed limit. New beds can't be added once it's reached.</p>}
        </div>
      </div>

      {isOwner ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 space-y-4">
          <h3 className="font-bold text-gray-800">{plan.payPerBedPlan ? 'Renew or change beds' : 'Upgrade'}</h3>
          <p className="text-xs text-gray-500 -mt-2">Paid plans also get a <b>Premium</b> badge and appear first on the public hostel pages.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-xs font-semibold text-gray-500">Total beds you need
              <input type="number" min={plan.freeBedLimit + 1} value={beds || ''} onChange={(e) => setBeds(Number(e.target.value))} className="block mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
              <span className="block mt-1 font-normal text-gray-400">{beds > plan.freeBedLimit ? `${beds - plan.freeBedLimit} paid beds + ${plan.freeBedLimit} free` : `Must be more than ${plan.freeBedLimit}`}</span>
            </label>
            <div className="text-xs font-semibold text-gray-500">Period
              <div className="flex gap-1 mt-1">
                {(plan.monthOptions as number[]).map((m) => (
                  <button key={m} onClick={() => setMonths(m)} className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${months === m ? 'bg-brand-600 text-white border-transparent' : 'border-gray-200 text-gray-600'}`}>{m === 12 ? '1 yr' : `${m} mo`}</button>
                ))}
              </div>
            </div>
          </div>
          {beds > 0 && beds < plan.usedBeds && <p className="text-xs text-red-600">You already have {plan.usedBeds} beds. Choose at least that many.</p>}
          {quoteErr && <p className="text-xs text-red-600">{errMsg(quoteErr)}</p>}
          {quote && validBeds && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
              <Row l={`${quote.paidBeds} beds × ${inr(quote.pricePerBed)} × ${months} month(s)`} v={inr(quote.gross)} />
              {Number(quote.credit) > 0 && <Row l="Credit for unused days of your current plan" v={'− ' + inr(quote.credit)} />}
              <Row l="To pay" v={inr(quote.amount)} bold />
              <p className="text-xs text-gray-500 pt-1">{quote.extendsCurrent ? 'Extends your current plan' : 'Starts today'}: {fmt(quote.periodFrom)} to {fmt(quote.periodTo)}</p>
            </div>
          )}
          <button onClick={() => pay.mutate()} disabled={!quote || !validBeds || pay.isPending} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold brand-gradient disabled:opacity-50">
            <CreditCard size={15} /> {pay.isPending ? 'Opening payment…' : quote ? `Pay ${inr(quote.amount)}` : 'Pay'}
          </button>
          {!plan.onlinePaymentReady && <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">Online payment isn't switched on yet. You can pay by bank transfer or UPI and ask Hostlify support to activate your plan.</p>}
        </div>
      ) : <p className="text-sm text-gray-500 mb-4">Only the owner can change the plan.</p>}

      {payments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <h3 className="font-bold text-gray-800 text-sm px-5 pt-4 pb-2">Payment history</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400"><tr><th className="text-left px-5 py-2">Paid on</th><th className="text-left px-2">Plan</th><th className="text-left px-2">Period</th><th className="text-right px-5">Amount</th></tr></thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="border-t border-gray-50">
                  <td className="px-5 py-2">{p.status === 'PAID' ? fmt(p.paidAt) : <span className="text-red-500">Failed</span>}</td>
                  <td className="px-2">{p.beds} beds · {p.months} mo{p.method === 'MANUAL' ? ' · recorded by Hostlify' : ''}</td>
                  <td className="px-2 text-gray-500">{p.periodFrom ? `${fmt(p.periodFrom)} – ${fmt(p.periodTo)}` : '–'}</td>
                  <td className="px-5 text-right font-semibold">{inr(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Row({ l, v, bold }: { l: string; v: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? 'font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1' : 'text-gray-600'}`}><span>{l}</span><span>{v}</span></div>
}
