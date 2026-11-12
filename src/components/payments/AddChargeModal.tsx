import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { getMembers } from '../../api/staff'
import { DUE_TYPE_LABEL, MANUAL_CHARGE_TYPES } from '../../lib/payments'

interface Props {
  hostelId: number
  submitting: boolean
  onSubmit: (data: { hostellerId?: number; applyToAll?: boolean; dueType: string; amount: number; description?: string; dueDate?: string }) => void
  onClose: () => void
}

const HINTS: Record<string, string> = {
  MESS: 'e.g. Mess charges – November',
  ELECTRICITY: 'e.g. Oct reading 1240 → 1330 = 90 units × ₹8',
  DEPOSIT: 'e.g. Refundable security deposit',
  FINE: 'e.g. Late entry after 11 PM',
  OTHER: 'What is this charge for?',
}

/** Staff: add mess / electricity / deposit / fine / other charges for one resident or everyone. */
export default function AddChargeModal({ hostelId, submitting, onSubmit, onClose }: Props) {
  const [dueType, setDueType] = useState<string>('MESS')
  const [scope, setScope] = useState<'one' | 'all'>('one')
  const [hostellerId, setHostellerId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10))
  const [err, setErr] = useState<string | null>(null)

  const { data: members = [] } = useQuery({ queryKey: ['members', hostelId], queryFn: () => getMembers(hostelId) })
  const residents = (members as any[]).filter((m) => m.status === 'ACTIVE' || m.roomNumber)

  function submit() {
    const amt = Number(amount)
    if (!(amt > 0)) return setErr('Enter an amount greater than 0.')
    if (scope === 'one' && !hostellerId) return setErr('Choose a resident.')
    if ((dueType === 'FINE' || dueType === 'OTHER') && !description.trim()) return setErr('Add a short reason so the resident knows what it is for.')
    setErr(null)
    onSubmit({
      dueType, amount: amt, description: description.trim() || undefined, dueDate,
      ...(scope === 'one' ? { hostellerId: Number(hostellerId) } : { applyToAll: true }),
    })
  }

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center"><Plus size={15} className="text-brand-600" /></div>
            <h3 className="font-bold text-gray-900">Add Charge</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"><X size={15} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Type</label>
            <div className="flex flex-wrap gap-1.5">
              {MANUAL_CHARGE_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setDueType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${dueType === t ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {DUE_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Charge to</label>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-2">
              {([['one', 'One resident'], ['all', 'All residents']] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setScope(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${scope === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{l}</button>
              ))}
            </div>
            {scope === 'one' ? (
              <select value={hostellerId} onChange={(e) => setHostellerId(e.target.value)} className={inputCls}>
                <option value="">Select resident…</option>
                {residents.map((m) => (
                  <option key={m.id} value={m.id}>{`${m.firstName} ${m.lastName ?? ''}`.trim()}{m.roomNumber ? ` · Room ${m.roomNumber}` : ''}</option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-gray-500 bg-amber-50 text-amber-800 px-3 py-2 rounded-xl">Every resident with an active booking gets this charge ({residents.length} now).</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (₹)</label>
              <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Note for resident</label>
            <input value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} placeholder={HINTS[dueType]} className={inputCls} />
          </div>

          {err && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={submitting}
              className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-60">
              {submitting ? 'Adding…' : 'Add Charge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
