import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star, Timer, X } from 'lucide-react'
import { errMsg, fmtDateTime, getComplaintSla, saveComplaintSla } from '../../api/ops'
import { useToastStore } from '../../store/toastStore'

const hoursLeft = (iso: string) => (new Date(iso).getTime() - Date.now()) / 3600e3
const fmtHours = (h: number) => (Math.abs(h) >= 48 ? `${Math.round(Math.abs(h) / 24)}d` : `${Math.max(1, Math.round(Math.abs(h)))}h`)
const isDone = (c: any) => c.status === 'RESOLVED' || c.status === 'CLOSED'

/** "Due in 5h" / "Overdue 2h" / "Fixed on time". */
export function SlaChip({ c }: { c: any }) {
  if (!c.dueAt) return null
  if (isDone(c)) {
    return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.overdue ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>{c.overdue ? 'Fixed late' : 'Fixed on time'}</span>
  }
  const h = hoursLeft(c.dueAt)
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${h < 0 ? 'bg-red-50 text-red-600' : h < 6 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
      <Timer size={11} /> {h < 0 ? `Overdue ${fmtHours(h)}` : `Due in ${fmtHours(h)}`}
    </span>
  )
}

/** Reported → acknowledged → fixed, with the target time. */
export function SlaTimeline({ c }: { c: any }) {
  const steps = [
    ['Reported', c.createdAt],
    ['Picked up', c.acknowledgedAt],
    ['Fixed', c.resolvedAt],
  ] as const
  return (
    <div>
      <ol className="flex items-start gap-1">
        {steps.map(([label, at], i) => (
          <li key={label} className="flex-1">
            <div className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded-full shrink-0 ${at ? 'bg-emerald-500' : 'bg-gray-200'}`} />
              {i < steps.length - 1 && <span className={`h-0.5 flex-1 ${steps[i + 1][1] ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
            </div>
            <p className="text-[11px] font-semibold text-gray-700 mt-1">{label}</p>
            <p className="text-[10px] text-gray-400">{at ? fmtDateTime(at) : '–'}</p>
          </li>
        ))}
      </ol>
      {c.dueAt && <p className="text-[11px] text-gray-500 mt-2">Target: fixed by {fmtDateTime(c.dueAt)} <SlaChip c={c} /></p>}
    </div>
  )
}

export function StarsRow({ value, onChange, size = 18 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" disabled={!onChange} onClick={() => onChange?.(i)} aria-label={`${i} star${i > 1 ? 's' : ''}`}>
          <Star size={size} className={i <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
        </button>
      ))}
    </span>
  )
}

/** Staff: SLA targets per category + last-30-day performance. */
export function SlaTargetsModal({ hostelId, canEdit, onClose }: { hostelId: number; canEdit: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const { data } = useQuery({ queryKey: ['complaint-sla', hostelId], queryFn: () => getComplaintSla(hostelId) })
  const [edits, setEdits] = useState<Record<string, number>>({})
  const mut = useMutation({
    mutationFn: () => saveComplaintSla(hostelId, { ...data.targets, ...edits }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complaint-sla', hostelId] }); setEdits({}); show('success', 'Targets saved', 'New complaints use them.') },
    onError: (e) => show('error', 'Not saved', errMsg(e)),
  })
  const p = data?.last30Days
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center mb-4"><h2 className="font-bold text-gray-900 flex-1">Complaint targets</h2><button onClick={onClose} aria-label="Close"><X size={18} className="text-gray-400" /></button></div>
        {!data ? <p className="text-sm text-gray-400">Loading…</p> : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-5">
              <Stat label="Fixed on time" value={p.resolved ? `${p.onTimePercent}%` : '–'} />
              <Stat label="Avg. time to pick up" value={p.total ? `${p.avgAcknowledgeHours}h` : '–'} />
              <Stat label="Avg. time to fix" value={p.resolved ? `${p.avgFixHours}h` : '–'} />
              <Stat label="Overdue now" value={String(p.openOverdue)} />
              <Stat label="Resident rating" value={p.ratings ? `${p.avgRating} ★` : '–'} />
              <Stat label="Complaints (30 days)" value={String(p.total)} />
            </div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Hours to fix, by category</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(data.targets as Record<string, number>).map(([cat, h]) => (
                <label key={cat} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="flex-1">{cat}</span>
                  <input type="number" min={1} max={720} disabled={!canEdit} value={edits[cat] ?? h} onChange={(e) => setEdits({ ...edits, [cat]: Number(e.target.value) })}
                    className="w-16 px-2 py-1 rounded-lg border border-gray-200 text-right text-sm" aria-label={`${cat} target hours`} />
                  <span className="text-xs text-gray-400">h</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-3">Staff get a push alert, and the owner an email, when a complaint passes its target.</p>
            {canEdit && <button onClick={() => mut.mutate()} disabled={!Object.keys(edits).length || mut.isPending} className="mt-4 w-full py-2.5 rounded-xl text-white text-sm font-semibold brand-gradient disabled:opacity-50">{mut.isPending ? 'Saving…' : 'Save targets'}</button>}
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-gray-50 rounded-xl p-3"><p className="text-lg font-bold text-gray-900">{value}</p><p className="text-[11px] text-gray-500 leading-tight">{label}</p></div>
}
