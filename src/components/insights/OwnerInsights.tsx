import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Crown, TrendingUp, Wallet } from 'lucide-react'
import { getInsights, getMyPlan } from '../../api/ops'
import { inr } from '../../lib/payments'

/** Owner dashboard: collection rate, overdue ageing and occupancy trend (last 6 months). */
export default function OwnerInsights({ hostelId }: { hostelId: number }) {
  const { data } = useQuery({ queryKey: ['insights', hostelId], queryFn: () => getInsights(hostelId), staleTime: 5 * 60_000 })
  if (!data) return null
  const maxBilled = Math.max(1, ...data.collection.map((c: any) => Number(c.billed)))
  const maxAge = Math.max(1, ...data.ageing.map((a: any) => Number(a.amount)))
  const ageColor = ['bg-amber-300', 'bg-amber-500', 'bg-orange-500', 'bg-red-600']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card icon={<Wallet size={15} className="text-emerald-600" />} title="Collection rate" sub={`${data.collectionRateThisMonth}% collected this month`}>
        <div className="flex items-end gap-2 h-32 mt-2">
          {data.collection.map((c: any) => (
            <div key={c.month} className="flex-1 flex flex-col items-center gap-1" title={`${c.month}: ${inr(c.collected)} of ${inr(c.billed)}`}>
              <span className="text-[10px] font-semibold text-gray-500">{c.billed > 0 ? c.rate + '%' : ''}</span>
              <div className="w-full flex-1 flex items-end">
                <div className="w-full rounded-t-md bg-gray-100 relative" style={{ height: `${(Number(c.billed) / maxBilled) * 100}%`, minHeight: 2 }}>
                  <div className="absolute bottom-0 left-0 right-0 rounded-t-md bg-emerald-500" style={{ height: `${c.billed > 0 ? (Number(c.collected) / Number(c.billed)) * 100 : 0}%` }} />
                </div>
              </div>
              <span className="text-[10px] text-gray-400">{c.month.split(' ')[0]}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Grey: billed · Green: collected (dues falling due that month)</p>
      </Card>

      <Card icon={<AlertTriangle size={15} className="text-red-500" />} title="Overdue ageing" sub={`${inr(data.totalOverdue)} overdue from ${data.overdueResidents} resident(s)`}>
        <div className="space-y-2.5 mt-3">
          {data.ageing.map((a: any, i: number) => (
            <div key={a.bucket}>
              <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{a.bucket}</span><span className="font-semibold text-gray-800">{inr(a.amount)} <span className="text-gray-400 font-normal">· {a.dues}</span></span></div>
              <div className="h-2 rounded-full bg-gray-100"><div className={`h-full rounded-full ${ageColor[i]}`} style={{ width: `${(Number(a.amount) / maxAge) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <Link to="/admin/payments" className="text-xs font-semibold text-brand-600 mt-3 inline-block">Follow up in Payments →</Link>
      </Card>

      <Card icon={<TrendingUp size={15} className="text-brand-600" />} title="Occupancy trend" sub={`${data.occupancy[data.occupancy.length - 1].rate}% occupied now`}>
        <div className="flex items-end gap-2 h-32 mt-2">
          {data.occupancy.map((o: any) => (
            <div key={o.month} className="flex-1 flex flex-col items-center gap-1" title={`${o.month}: ${o.occupied} of ${o.beds} beds`}>
              <span className="text-[10px] font-semibold text-gray-500">{o.rate}%</span>
              <div className="w-full flex-1 flex items-end"><div className="w-full rounded-t-md bg-brand-500" style={{ height: `${Math.min(100, o.rate)}%`, minHeight: 2 }} /></div>
              <span className="text-[10px] text-gray-400">{o.month.split(' ')[0]}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Occupied beds at each month end, against today's {data.occupancy[0]?.beds} beds</p>
      </Card>
    </div>
  )
}

function Card({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">{icon}</div><h3 className="font-bold text-gray-800 text-sm">{title}</h3></div>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
      {children}
    </div>
  )
}

const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5)

/** Upgrade prompt for owners near their bed limit or with an expiring plan. */
export function PlanBanner() {
  const { data: p } = useQuery({ queryKey: ['my-plan'], queryFn: getMyPlan, staleTime: 10 * 60_000, retry: false })
  if (!p) return null
  const nearLimit = p.maxBeds > 0 && p.usedBeds / p.maxBeds >= 0.9
  const daysLeft = p.expiresAt ? daysUntil(p.expiresAt) : null
  const expiring = p.paidActive && daysLeft != null && daysLeft <= 7
  if (!nearLimit && !expiring) return null
  return (
    <div className={`rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap ${p.inGrace ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
      <Crown size={18} className="shrink-0" />
      <p className="text-sm flex-1 min-w-[14rem]">
        {p.inGrace ? `Your ${p.planLabel} plan has expired. Renew before ${new Date(p.graceEndsAt).toLocaleDateString('en-IN')} to keep your bed limit.`
          : expiring ? `Your ${p.planLabel} plan ends in ${daysLeft} day(s).`
          : `You're using ${p.usedBeds} of ${p.maxBeds} beds on your plan.`}
        {nearLimit && !expiring && ' Upgrade to add more beds.'}
      </p>
      <Link to="/admin/billing" className="px-4 py-2 rounded-xl text-sm font-semibold bg-white shadow-sm">{expiring ? 'Renew' : 'Upgrade'}</Link>
    </div>
  )
}
