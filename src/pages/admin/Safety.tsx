import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, HeartPulse, MapPin, Moon, Phone, Siren } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { errMsg } from '../../api/ops'
import {
  ackSos, getLateEntries, getSafetySummary, getSosHistory, getUnwell, markCheckedOn, markLateArrived, resolveSos, reviewLateEntry,
} from '../../api/staff'
import { fmtTime } from '../../components/stay/stayLabels'

const card = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'
const input = 'px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
const when = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '')
const NEED_LABELS: Record<string, string> = { FOOD_IN_ROOM: 'Food in room', MEDICINE: 'Medicine', DOCTOR: 'Doctor', CHECK_ON_ME: 'Check on them' }
type Tab = 'sos' | 'unwell' | 'late'

/** Staff: live SOS alerts, residents who are unwell, and late-entry requests. */
export default function Safety() {
  const { activeHostelId } = useAuthStore()
  const hostelId = activeHostelId as number
  const [tab, setTab] = useState<Tab>('sos')
  const { data: summary } = useQuery({ queryKey: ['safety-summary', hostelId], queryFn: () => getSafetySummary(hostelId), enabled: !!hostelId, refetchInterval: 15000 })
  const live: any[] = summary?.sos ?? []

  return (
    <div className="space-y-5">
      <PageHeader title="Safety" subtitle="SOS alerts, residents who are unwell, and late entries" />

      {live.map((s) => <LiveSos key={s.id} s={s} hostelId={hostelId} />)}

      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['sos', 'SOS history', Siren, 0], ['unwell', 'Unwell', HeartPulse, summary?.unwell ?? 0], ['late', 'Late entry', Moon, summary?.latePending ?? 0]] as const).map(([k, l, Icon, n]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${tab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            <Icon size={13} /> {l}{n ? <span className="ml-1 text-[11px] px-1.5 rounded-full bg-red-500 text-white">{n}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'sos' && <SosHistory hostelId={hostelId} />}
      {tab === 'unwell' && <UnwellList hostelId={hostelId} />}
      {tab === 'late' && <LateList hostelId={hostelId} />}
    </div>
  )
}

function Resident({ r }: { r: any }) {
  return (
    <div className="text-sm">
      <p className="font-bold text-gray-900">{r?.name ?? 'Resident'}{r?.room ? <span className="font-normal text-gray-500"> · Room {r.room}</span> : null}</p>
      <p className="text-xs text-gray-500">
        {r?.bloodGroup && <>Blood group <b>{r.bloodGroup}</b> · </>}
        {r?.medicalNotes && <>{r.medicalNotes} · </>}
        {r?.emergencyContact?.mobile && <>Emergency contact: {r.emergencyContact.name} ({r.emergencyContact.relationship}) <a className="text-brand-600 font-semibold" href={`tel:${r.emergencyContact.mobile}`}>{r.emergencyContact.mobile}</a></>}
      </p>
    </div>
  )
}

function LiveSos({ s, hostelId }: { s: any; hostelId: number }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const [note, setNote] = useState('')
  const refresh = () => { qc.invalidateQueries({ queryKey: ['safety-summary', hostelId] }); qc.invalidateQueries({ queryKey: ['sos-history', hostelId] }) }
  const ack = useMutation({ mutationFn: () => ackSos(s.id), onSuccess: () => { refresh(); show('success', 'Resident told you are responding') } })
  const resolve = useMutation({ mutationFn: () => resolveSos(s.id, note.trim()), onSuccess: () => { refresh(); show('success', 'Alert closed') }, onError: (e) => show('error', 'Could not close', errMsg(e)) })
  return (
    <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
        <p className="font-black text-red-700 uppercase tracking-wide text-sm">SOS · {when(s.createdAt)}</p>
        {s.status === 'ACKNOWLEDGED' && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Responding since {when(s.acknowledgedAt)}</span>}
      </div>
      <Resident r={s.resident} />
      {s.message && <p className="text-sm text-gray-800">"{s.message}"</p>}
      <div className="flex flex-wrap gap-2">
        {s.resident?.mobile && <a href={`tel:${s.resident.mobile}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-bold"><Phone size={14} /> Call {s.resident.name?.split(' ')[0]}</a>}
        {s.mapsUrl
          ? <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-white text-sm font-semibold text-red-700"><MapPin size={14} /> Location{s.accuracyM ? ` (±${s.accuracyM} m)` : ''}</a>
          : <span className="text-xs text-gray-500 self-center">Location not shared</span>}
        {s.status === 'OPEN' && <button onClick={() => ack.mutate()} disabled={ack.isPending} className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold">I'm responding</button>}
      </div>
      <div className="flex gap-2 flex-wrap">
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="What happened? (needed to close)" className={input + ' flex-1 min-w-[12rem] bg-white'} />
        <button onClick={() => resolve.mutate()} disabled={resolve.isPending || !note.trim()} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1"><CheckCircle2 size={14} /> Close alert</button>
      </div>
    </div>
  )
}

const SOS_STATUS: Record<string, string> = { OPEN: 'bg-red-50 text-red-700', ACKNOWLEDGED: 'bg-amber-50 text-amber-700', RESOLVED: 'bg-emerald-50 text-emerald-700', CANCELLED: 'bg-gray-100 text-gray-500' }

function SosHistory({ hostelId }: { hostelId: number }) {
  const { data = [] } = useQuery({ queryKey: ['sos-history', hostelId], queryFn: () => getSosHistory(hostelId), enabled: !!hostelId })
  if (!data.length) return <p className={card + ' text-sm text-gray-400 text-center'}>No SOS alerts yet. Residents can send one from Safety &amp; help in their app.</p>
  return (
    <div className={card + ' divide-y divide-gray-50'}>
      {data.map((s: any) => (
        <div key={s.id} className="py-3 flex flex-wrap items-start gap-3">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${SOS_STATUS[s.status] ?? ''}`}>{s.status === 'CANCELLED' ? 'Marked safe' : s.status.charAt(0) + s.status.slice(1).toLowerCase()}</span>
          <div className="flex-1 min-w-[12rem]">
            <p className="text-sm font-semibold text-gray-800">{s.resident?.name} <span className="font-normal text-gray-400">· {when(s.createdAt)}</span></p>
            {s.resolutionNote && <p className="text-xs text-gray-500">{s.resolutionNote}</p>}
          </div>
          {s.mapsUrl && <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 font-semibold">Map</a>}
        </div>
      ))}
    </div>
  )
}

function UnwellList({ hostelId }: { hostelId: number }) {
  const qc = useQueryClient()
  const { data = [] } = useQuery({ queryKey: ['unwell', hostelId], queryFn: () => getUnwell(hostelId), enabled: !!hostelId })
  const [notes, setNotes] = useState<Record<number, string>>({})
  const mut = useMutation({
    mutationFn: (id: number) => markCheckedOn(id, notes[id]?.trim() || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['unwell', hostelId] }); qc.invalidateQueries({ queryKey: ['safety-summary', hostelId] }) },
  })
  if (!data.length) return <p className={card + ' text-sm text-gray-400 text-center'}>No one has said they're unwell in the last 3 days.</p>
  return (
    <div className="space-y-3">
      {data.map((f: any) => (
        <div key={f.id} className={card + ' space-y-2'}>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <Resident r={f.resident} />
            <span className="text-xs text-gray-400">{when(f.createdAt)}</span>
          </div>
          {f.needList?.length > 0 && <div className="flex gap-1.5 flex-wrap">{f.needList.map((n: string) => <span key={n} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">{NEED_LABELS[n] ?? n}</span>)}</div>}
          {f.note && <p className="text-sm text-gray-700">"{f.note}"</p>}
          {f.checkedAt
            ? <p className="text-xs text-emerald-700">Checked on at {when(f.checkedAt)}{f.staffNote ? ` — ${f.staffNote}` : ''}</p>
            : (
              <div className="flex gap-2 flex-wrap">
                <input value={notes[f.id] ?? ''} onChange={(e) => setNotes((x) => ({ ...x, [f.id]: e.target.value }))} maxLength={300} placeholder="Note for the resident (optional), e.g. Sent soup and paracetamol" className={input + ' flex-1 min-w-[12rem]'} />
                <button onClick={() => mut.mutate(f.id)} disabled={mut.isPending} className="px-3 py-2 rounded-xl text-sm font-semibold text-white brand-gradient">Checked on them</button>
                {f.resident?.mobile && <a href={`tel:${f.resident.mobile}`} className="px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 flex items-center gap-1"><Phone size={13} /> Call</a>}
              </div>
            )}
        </div>
      ))}
    </div>
  )
}

const LATE_STATUS: Record<string, string> = { PENDING: 'bg-amber-50 text-amber-700', APPROVED: 'bg-emerald-50 text-emerald-700', REJECTED: 'bg-red-50 text-red-700' }

function LateList({ hostelId }: { hostelId: number }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const { data = [] } = useQuery({ queryKey: ['late-entries', hostelId], queryFn: () => getLateEntries(hostelId), enabled: !!hostelId })
  const [notes, setNotes] = useState<Record<number, string>>({})
  const refresh = () => { qc.invalidateQueries({ queryKey: ['late-entries', hostelId] }); qc.invalidateQueries({ queryKey: ['safety-summary', hostelId] }) }
  const review = useMutation({
    mutationFn: ({ id, approve }: { id: number; approve: boolean }) => reviewLateEntry(id, approve, notes[id]?.trim() || undefined),
    onSuccess: refresh, onError: (e) => show('error', 'Could not save', errMsg(e)),
  })
  const arrived = useMutation({ mutationFn: (id: number) => markLateArrived(id), onSuccess: refresh })
  if (!data.length) return <p className={card + ' text-sm text-gray-400 text-center'}>No late-entry requests for the coming days. Set a curfew under Hostel Setup → Rules &amp; terms to enable them.</p>
  return (
    <div className={card + ' divide-y divide-gray-50'}>
      {data.map((l: any) => (
        <div key={l.id} className="py-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${LATE_STATUS[l.status] ?? ''}`}>{l.status.charAt(0) + l.status.slice(1).toLowerCase()}</span>
            <p className="text-sm font-semibold text-gray-800">{l.resident?.name}{l.resident?.room ? ` · Room ${l.resident.room}` : ''}</p>
            <p className="text-sm text-gray-600">{new Date(l.entryDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} by {fmtTime(l.expectedTime)}</p>
            {l.arrivedAt && <span className="text-xs text-emerald-700">Arrived {when(l.arrivedAt)}</span>}
          </div>
          <p className="text-xs text-gray-500">{l.reason}{l.staffNote ? ` · Note: ${l.staffNote}` : ''}</p>
          {l.status === 'PENDING' && (
            <div className="flex gap-2 flex-wrap">
              <input value={notes[l.id] ?? ''} onChange={(e) => setNotes((x) => ({ ...x, [l.id]: e.target.value }))} maxLength={300} placeholder="Note (needed to reject)" className={input + ' flex-1 min-w-[10rem]'} />
              <button onClick={() => review.mutate({ id: l.id, approve: true })} className="px-3 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600">Approve</button>
              <button onClick={() => review.mutate({ id: l.id, approve: false })} className="px-3 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200">Reject</button>
            </div>
          )}
          {l.status === 'APPROVED' && !l.arrivedAt && (
            <button onClick={() => arrived.mutate(l.id)} className="text-xs font-semibold text-brand-600">Mark arrived</button>
          )}
        </div>
      ))}
    </div>
  )
}
