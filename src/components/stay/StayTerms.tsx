import { ShieldCheck, ReceiptIndianRupee, ScrollText, Clock, Users } from 'lucide-react'

import { SAFETY_LABELS, GUEST_LABELS, rupees, fmtTime } from './stayLabels'

const roomLabel = (t?: string | null) => (t ? t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : 'Any room')

/** Small "CCTV · Security guard" badges (stated by the hostel). */
export function SafetyBadges({ features, max }: { features?: string[]; max?: number }) {
  if (!features?.length) return null
  const list = max ? features.slice(0, max) : features
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((f) => (
        <span key={f} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
          <ShieldCheck size={11} /> {SAFETY_LABELS[f] ?? f}
        </span>
      ))}
      {max && features.length > max && <span className="text-[11px] text-gray-400">+{features.length - max} more</span>}
    </div>
  )
}

/** One-off and monthly costs, notice period, lock-in and refund time: everything before the resident books. */
export function CostOfStay({ policies, roomType, sheet }: { policies: any; roomType?: string | null; sheet?: any }) {
  if (!policies) return null
  const sheets: any[] = sheet ? [sheet] : (policies.costSheets ?? []).filter((s: any) => !roomType || s.roomType === roomType)
  const lockIn = Number(policies.lockInMonths ?? 0)
  const exitFee = Number(policies.earlyExitFee ?? 0)
  const admission = Number(policies.admissionFee ?? 0)
  const fine: string[] = []
  fine.push(Number(policies.noticeDays) > 0 ? `Notice period: ${policies.noticeDays} days before you leave` : 'No notice period')
  if (lockIn > 0) fine.push(`Lock-in: ${lockIn} month${lockIn > 1 ? 's' : ''}${exitFee > 0 ? ` — leaving earlier costs ${rupees(exitFee)}` : ''}`)
  fine.push(`Deposit refunded within ${policies.depositRefundDays ?? 15} days of check-out, with a written statement of any deductions`)
  fine.push(policies.utilitiesIncluded !== false ? 'Electricity, water & Wi-Fi are included in rent' : 'Electricity / water are billed separately by meter reading')
  if (policies.mess) {
    const m = policies.mess
    fine.push(`Mess billed per meal: breakfast ${rupees(m.breakfastRate)}, lunch ${rupees(m.lunchRate)}, dinner ${rupees(m.dinnerRate)} (skip meals in the app to not pay)`)
  }
  return (
    <div className="space-y-3">
      {sheets.length > 0 && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left px-2 py-1.5 font-semibold">Room</th>
                <th className="text-right px-2 py-1.5 font-semibold">Rent / month</th>
                <th className="text-right px-2 py-1.5 font-semibold">Deposit</th>
                {admission > 0 && <th className="text-right px-2 py-1.5 font-semibold">Admission</th>}
                <th className="text-right px-2 py-1.5 font-semibold">Pay to move in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sheets.map((s, i) => (
                <tr key={i}>
                  <td className="px-2 py-2 font-medium text-gray-800">{roomLabel(s.roomType)}</td>
                  <td className="px-2 py-2 text-right font-semibold text-gray-800">{rupees(s.monthlyRent)}</td>
                  <td className="px-2 py-2 text-right text-gray-600">
                    {s.deposit != null ? <>{rupees(s.deposit)}<span className="block text-[10px] text-gray-400">{s.depositMonths} mo, refundable</span></> : 'Ask hostel'}
                  </td>
                  {admission > 0 && <td className="px-2 py-2 text-right text-gray-600">{rupees(admission)}<span className="block text-[10px] text-gray-400">one-time</span></td>}
                  <td className="px-2 py-2 text-right font-bold text-brand-700">{rupees(s.moveInTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sheets.some((s) => Number(s.lateFee) > 0) && (
            <p className="text-[11px] text-gray-400 px-2 mt-1">Late payment fee: {rupees(sheets.find((s) => Number(s.lateFee) > 0)?.lateFee)} after the due date.</p>
          )}
        </div>
      )}
      <ul className="space-y-1.5">
        {fine.map((f) => (
          <li key={f} className="flex gap-2 text-xs text-gray-600"><span className="text-brand-500 mt-0.5">•</span>{f}</li>
        ))}
        {policies.otherCharges && (
          <li className="flex gap-2 text-xs text-gray-600"><span className="text-brand-500 mt-0.5">•</span>Other charges: {policies.otherCharges}</li>
        )}
      </ul>
    </div>
  )
}

/** Curfew, guests and the hostel's own rules. */
export function HouseRules({ policies }: { policies: any }) {
  if (!policies) return null
  const rules: string[] = policies.houseRules ?? []
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
          <Clock size={12} /> {policies.curfewTime ? `Gate closes ${fmtTime(policies.curfewTime)}` : 'No curfew'}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
          <Users size={12} /> {GUEST_LABELS[policies.guestPolicy] ?? 'Ask about guests'}
        </span>
      </div>
      {rules.length > 0 && (
        <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-600">
          {rules.map((r, i) => <li key={i}>{r}</li>)}
        </ol>
      )}
    </div>
  )
}

/** The three blocks as cards for the hostel page. */
export function StayTermsCards({ policies }: { policies: any }) {
  if (!policies) return null
  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 text-sm mb-1 flex items-center gap-2"><ReceiptIndianRupee size={16} className="text-brand-600" /> Full cost of stay</h2>
        <p className="text-xs text-gray-400 mb-3">Everything you'll pay, and the terms for leaving — saved with your booking so it can't change later.</p>
        <CostOfStay policies={policies} />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2"><ScrollText size={16} className="text-brand-600" /> House rules</h2>
        <HouseRules policies={policies} />
      </div>
      {policies.safetyFeatures?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-1 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> Safety</h2>
          <p className="text-xs text-gray-400 mb-3">As stated by the hostel.</p>
          <SafetyBadges features={policies.safetyFeatures} />
        </div>
      )}
    </>
  )
}
