import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, SprayCan } from 'lucide-react'
import { createComplaint, getMyHousekeeping } from '../../api/hosteller'
import { errMsg } from '../../api/ops'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { DAY_LABELS } from '../stay/stayLabels'

const fmt = (d?: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '')

/** Resident: when my room is cleaned, proof photos of recent cleanings, and a one-tap "it was missed" report. */
export default function MyRoomCleaning() {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const { hostellerProfileId, hostelId } = useAuthStore()
  const { data } = useQuery({ queryKey: ['my-housekeeping'], queryFn: getMyHousekeeping })
  const report = useMutation({
    mutationFn: () => createComplaint({
      title: `Room not cleaned on ${fmt(data.missedOn)}`,
      category: 'Cleanliness',
      description: `My room was due for cleaning on ${fmt(data.missedOn)} but there is no record of it being cleaned.`,
      hostellerProfileId, hostelId,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-complaints'] }); show('success', 'Reported', 'Added to your complaints; the hostel has been told.') },
    onError: (e) => show('error', 'Could not report', errMsg(e)),
  })

  if (!data?.activeStay) return null
  const days: string[] = data.scheduleDays ?? []
  const logs: any[] = data.logs ?? []
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <SprayCan size={16} className="text-brand-600" />
        <p className="font-bold text-gray-800 text-sm">My room</p>
      </div>
      <p className="text-sm text-gray-600">
        Cleaned {days.length ? `every ${days.map((d) => DAY_LABELS[d]).join(', ')}` : 'every day'}.
        {data.cleanedToday ? <span className="text-emerald-700 font-semibold"> Done today ✓</span> : <> Next: <b>{fmt(data.nextCleaning)}</b>.</>}
      </p>
      {data.missedOn && (
        <div className="flex items-center gap-2 flex-wrap text-xs bg-amber-50 text-amber-800 rounded-xl px-3 py-2">
          <AlertTriangle size={13} /> No cleaning was recorded on {fmt(data.missedOn)}.
          <button onClick={() => report.mutate()} disabled={report.isPending} className="font-semibold underline">Report it</button>
        </div>
      )}
      {logs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {logs.map((l) => (
            <div key={l.id} className="shrink-0 w-24 text-center">
              {l.photoUrl
                ? <a href={l.photoUrl} target="_blank" rel="noopener noreferrer"><img src={l.photoUrl} alt="" className="w-24 h-20 rounded-xl object-cover" /></a>
                : <div className="w-24 h-20 rounded-xl bg-emerald-50 flex items-center justify-center"><CheckCircle2 size={20} className="text-emerald-500" /></div>}
              <p className="text-[11px] text-gray-500 mt-1">{fmt(l.cleanedOn)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
