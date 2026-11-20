import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, ReceiptIndianRupee, ScrollText, ShieldCheck, SprayCan } from 'lucide-react'
import { getPolicies, savePolicies } from '../../api/staff'
import { useToastStore } from '../../store/toastStore'
import { SAFETY_LABELS, GUEST_LABELS, DAY_LABELS } from '../stay/stayLabels'

const input = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300'

/** Owner/Admin/Manager: the fine print residents see before booking, house rules, safety facilities, cleaning days. */
export default function PoliciesPanel({ hostelId }: { hostelId: number }) {
  const { data } = useQuery({ queryKey: ['policies', hostelId], queryFn: () => getPolicies(hostelId), enabled: !!hostelId })
  return data ? <PoliciesForm key={hostelId} hostelId={hostelId} data={data} /> : <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
}

function PoliciesForm({ hostelId, data }: { hostelId: number; data: any }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const [f, setF] = useState(() => ({
    noticeDays: String(data.noticeDays ?? 30),
    lockInMonths: String(data.lockInMonths ?? 0),
    earlyExitFee: String(Number(data.earlyExitFee ?? 0)),
    admissionFee: String(Number(data.admissionFee ?? 0)),
    depositRefundDays: String(data.depositRefundDays ?? 15),
    otherCharges: data.otherCharges ?? '',
    curfewTime: data.curfewTime ?? '',
    guestPolicy: data.guestPolicy ?? 'DAYTIME',
    houseRules: (data.houseRules ?? []).join('\n'),
    lateEntryRequests: data.lateEntryRequests !== false,
    roomCleaningDays: (data.roomCleaningDays ?? []) as string[],
    safetyFeatures: (data.safetyFeatures ?? []) as string[],
  }))
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }))
  const toggle = (k: 'roomCleaningDays' | 'safetyFeatures', v: string) =>
    setF((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }))

  const save = useMutation({
    mutationFn: () => savePolicies(hostelId, {
      ...f,
      noticeDays: Number(f.noticeDays), lockInMonths: Number(f.lockInMonths), depositRefundDays: Number(f.depositRefundDays),
      curfewTime: f.curfewTime || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies', hostelId] })
      show('success', 'Saved', 'Residents see these on your hostel page and when booking.')
    },
  })

  const card = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4'
  const label = 'block text-sm font-semibold text-gray-700 mb-1.5'
  const hint = 'text-xs text-gray-400 mt-1'

  return (
    <div className="space-y-5">
      <div className={card}>
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><ReceiptIndianRupee size={16} className="text-brand-600" /> Fees &amp; leaving terms</h3>
          <p className="text-xs text-gray-400 mt-0.5">Shown as a "full cost of stay" before booking, and saved with each booking. Rent and deposit months come from the Pricing tab.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>Notice period (days)</label>
            <input type="number" min={0} max={90} value={f.noticeDays} onChange={(e) => set('noticeDays', e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>Lock-in (months)</label>
            <input type="number" min={0} max={24} value={f.lockInMonths} onChange={(e) => set('lockInMonths', e.target.value)} className={input} />
            <p className={hint}>0 = no lock-in</p>
          </div>
          <div>
            <label className={label}>Early-exit fee (₹)</label>
            <input type="number" min={0} value={f.earlyExitFee} onChange={(e) => set('earlyExitFee', e.target.value)} className={input} disabled={f.lockInMonths === '0'} />
            <p className={hint}>Only when leaving within the lock-in</p>
          </div>
          <div>
            <label className={label}>Admission fee (₹)</label>
            <input type="number" min={0} value={f.admissionFee} onChange={(e) => set('admissionFee', e.target.value)} className={input} />
            <p className={hint}>One-time, not refundable</p>
          </div>
          <div>
            <label className={label}>Refund deposit within (days)</label>
            <input type="number" min={1} max={60} value={f.depositRefundDays} onChange={(e) => set('depositRefundDays', e.target.value)} className={input} />
            <p className={hint}>Staff are reminded; residents see the date</p>
          </div>
        </div>
        <div>
          <label className={label}>Any other charges</label>
          <input value={f.otherCharges} maxLength={1000} onChange={(e) => set('otherCharges', e.target.value)} className={input}
            placeholder="e.g. Laundry ₹300/month (optional), Cooking gas shared equally" />
        </div>
      </div>

      <div className={card}>
        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><ScrollText size={16} className="text-brand-600" /> House rules</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Curfew (gate closes)</label>
            <input type="time" value={f.curfewTime} onChange={(e) => set('curfewTime', e.target.value)} className={input} />
            <p className={hint}>Leave empty for no curfew</p>
          </div>
          <div>
            <label className={label}>Guests</label>
            <select value={f.guestPolicy} onChange={(e) => set('guestPolicy', e.target.value)} className={input}>
              {Object.entries(GUEST_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        {f.curfewTime && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={f.lateEntryRequests} onChange={(e) => set('lateEntryRequests', e.target.checked)} className="w-4 h-4 accent-brand-600" />
            Residents can ask for late entry in the app (you approve each one)
          </label>
        )}
        <div>
          <label className={label}>Rules (one per line)</label>
          <textarea rows={5} value={f.houseRules} onChange={(e) => set('houseRules', e.target.value)} className={input + ' resize-y'}
            placeholder={'No smoking or alcohol inside\nKeep noise low after 10 PM\nSwitch off fans and lights when you go out'} />
        </div>
      </div>

      <div className={card}>
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> Safety facilities</h3>
          <p className="text-xs text-gray-400 mt-0.5">Tick only what you really have — residents see these as badges on your listing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SAFETY_LABELS).map(([k, v]) => (
            <button key={k} type="button" onClick={() => toggle('safetyFeatures', k)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${f.safetyFeatures.includes(k) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className={card}>
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><SprayCan size={16} className="text-brand-600" /> Room cleaning days</h3>
          <p className="text-xs text-gray-400 mt-0.5">Staff tick rooms off under Cleaning; residents see when their room was last cleaned. None selected = every day.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(DAY_LABELS).map(([k, v]) => (
            <button key={k} type="button" onClick={() => toggle('roomCleaningDays', k)}
              className={`w-12 py-1.5 rounded-lg text-xs font-semibold border ${f.roomCleaningDays.includes(k) ? 'brand-gradient text-white border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient disabled:opacity-60">
          <Save size={14} /> {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
