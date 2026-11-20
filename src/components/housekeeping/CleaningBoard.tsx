import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, CheckCircle2, Trash2 } from 'lucide-react'
import { deleteCleaningLog, getHousekeepingBoard, logCleaning } from '../../api/staff'
import { errMsg } from '../../api/ops'
import { useToastStore } from '../../store/toastStore'
import { DAY_LABELS } from '../stay/stayLabels'

const fmt = (d?: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'never')

/** Staff: today's room cleaning round with photo proof (residents see it on their Cleaning page). */
export default function CleaningBoard({ hostelId }: { hostelId: number }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const { data } = useQuery({ queryKey: ['housekeeping', hostelId], queryFn: () => getHousekeepingBoard(hostelId), enabled: !!hostelId })
  const [area, setArea] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [target, setTarget] = useState<{ roomId?: number; area?: string } | null>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: ['housekeeping', hostelId] })

  const log = useMutation({
    mutationFn: (v: { roomId?: number; area?: string; photo?: File | null }) => logCleaning(hostelId, v),
    onSuccess: (_, v) => { refresh(); if (v.area) setArea(''); show('success', 'Marked as cleaned', v.photo ? 'Photo saved as proof.' : '') },
    onError: (e) => show('error', 'Could not save', errMsg(e)),
  })
  const del = useMutation({ mutationFn: (id: number) => deleteCleaningLog(id), onSuccess: refresh })

  const pickPhoto = (t: { roomId?: number; area?: string }) => { setTarget(t); fileRef.current?.click() }
  const onFile = (f?: File | null) => {
    if (target) log.mutate({ ...target, photo: f ?? null })
    setTarget(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!data) return null
  const days: string[] = data.scheduleDays ?? []
  const rooms: any[] = data.rooms ?? []
  const recent: any[] = data.recent ?? []

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-bold text-gray-800">Today's cleaning round</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Rooms are cleaned {days.length ? days.map((d) => DAY_LABELS[d]).join(', ') : 'every day'} (change in Hostel Setup → Rules &amp; terms).
            {data.cleaningDay ? ` ${data.doneToday} done, ${data.dueToday} to go.` : ' No room cleaning scheduled today.'}
          </p>
        </div>
      </div>

      {rooms.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {rooms.map((r) => (
            <div key={r.roomId} className={`rounded-xl border p-2.5 ${r.cleanedToday ? 'border-emerald-200 bg-emerald-50' : r.dueToday ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100'}`}>
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">{r.roomName}{r.cleanedToday && <CheckCircle2 size={13} className="text-emerald-600" />}</p>
              <p className="text-[11px] text-gray-500">Last: {fmt(r.lastCleanedOn)}</p>
              {!r.cleanedToday && (
                <div className="flex gap-1 mt-1.5">
                  <button onClick={() => pickPhoto({ roomId: r.roomId })} disabled={log.isPending} className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-1 rounded-lg brand-gradient text-white"><Camera size={11} /> Photo</button>
                  <button onClick={() => log.mutate({ roomId: r.roomId })} disabled={log.isPending} className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-gray-200 text-gray-600">Done</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <input value={area} onChange={(e) => setArea(e.target.value)} maxLength={80} placeholder="Common area, e.g. 2nd floor bathroom, kitchen"
          className="flex-1 min-w-[12rem] px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        <button onClick={() => pickPhoto({ area: area.trim() })} disabled={!area.trim() || log.isPending} className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-white brand-gradient disabled:opacity-50"><Camera size={14} /> Photo &amp; mark</button>
      </div>

      {recent.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Last 7 days</p>
          <div className="divide-y divide-gray-50">
            {recent.slice(0, 15).map((l) => (
              <div key={l.id} className="py-2 flex items-center gap-3 text-sm">
                {l.photoUrl ? <a href={l.photoUrl} target="_blank" rel="noopener noreferrer"><img src={l.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" /></a> : <span className="w-10 h-10 rounded-lg bg-gray-50" />}
                <span className="flex-1 text-gray-700">{l.roomName ? `Room ${l.roomName}` : l.area}</span>
                <span className="text-xs text-gray-400">{fmt(l.cleanedOn)}</span>
                {l.cleanedOn === new Date().toLocaleDateString('en-CA') && (
                  <button onClick={() => del.mutate(l.id)} aria-label="Remove" className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
