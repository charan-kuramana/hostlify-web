import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ambulance, CheckCircle2, Clock, HeartPulse, Hospital, MessageCircle, Moon, Phone, ShieldCheck, Siren } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { getMySafety, sendSos, markSafe, flagUnwell, clearUnwell, requestLateEntry, cancelLateEntry } from '../../api/hosteller'
import { errMsg } from '../../api/ops'
import { useToastStore } from '../../store/toastStore'
import { SafetyBadges } from '../../components/stay/StayTerms'
import { fmtTime } from '../../components/stay/stayLabels'

const NEED_LABELS: Record<string, string> = { FOOD_IN_ROOM: 'Food in my room', MEDICINE: 'Medicine', DOCTOR: 'A doctor', CHECK_ON_ME: 'Someone to check on me' }
const card = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'
const input = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
const fmtDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const fmtAt = (d?: string) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '')

/** WhatsApp link to a phone number with a pre-filled message (free, uses the resident's own WhatsApp). */
function waLink(mobile: string, text: string) {
  const digits = mobile.replace(/\D/g, '')
  const num = digits.length === 10 ? '91' + digits : digits
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 })
  })
}

export default function Safety() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['my-safety'], queryFn: getMySafety, refetchInterval: (q) => (q.state.data?.sos && ['OPEN', 'ACKNOWLEDGED'].includes(q.state.data.sos.status) ? 15000 : false) })
  const refresh = () => qc.invalidateQueries({ queryKey: ['my-safety'] })

  if (isLoading || !data) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>

  if (!data.activeStay) {
    return (
      <div className="space-y-5 max-w-2xl">
        <PageHeader title="Safety & help" subtitle="Emergency numbers" />
        <EmergencyNumbers />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="Safety & help" subtitle={data.hostel?.name} />
      <SosCard data={data} onChanged={refresh} />
      <EmergencyNumbers hostel={data.hostel} />
      {(!data.bloodGroup) && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
          Add your blood group and any allergies in <Link to="/app/profile" className="text-brand-600 font-semibold">My Profile</Link> — staff see them if you send an SOS.
          {!data.emergencyContact && ' Add an emergency contact there too.'}
        </p>
      )}
      <UnwellCard data={data} onChanged={refresh} />
      {data.lateEntryEnabled && <LateEntryCard data={data} onChanged={refresh} />}
      {data.hostel?.safetyFeatures?.length > 0 && (
        <div className={card}>
          <p className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> At your hostel</p>
          <SafetyBadges features={data.hostel.safetyFeatures} />
        </div>
      )}
    </div>
  )
}

// ─── SOS ────────────────────────────────────────────────────────────────────────
function SosCard({ data, onChanged }: { data: any; onChanged: () => void }) {
  const { show } = useToastStore()
  const [progress, setProgress] = useState(0)
  const timer = useRef<number | null>(null)
  const sos = data.sos
  const live = sos && ['OPEN', 'ACKNOWLEDGED'].includes(sos.status)

  const send = useMutation({
    mutationFn: async () => {
      const pos = await getPosition()
      return sendSos(pos ? { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) } : {})
    },
    onSuccess: () => { onChanged(); show('success', 'SOS sent', 'Hostel staff and the owner have been alerted.') },
    onError: (e) => show('error', 'SOS failed — call 112', errMsg(e)),
  })
  const safe = useMutation({ mutationFn: () => markSafe(sos.id), onSuccess: () => { onChanged(); show('success', 'Glad you are safe', 'The hostel has been told.') } })

  const stop = () => { if (timer.current) window.clearInterval(timer.current); timer.current = null; setProgress(0) }
  const start = () => {
    if (send.isPending) return
    stop()
    const began = Date.now()
    timer.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - began) / 1500)
      setProgress(p)
      if (p >= 1) { stop(); send.mutate() }
    }, 30)
  }
  useEffect(() => stop, [])

  const contact = data.emergencyContact
  const shareText = `SOS: I need help.${sos?.mapsUrl ? ` My location: ${sos.mapsUrl}` : ''} I'm at ${data.hostel?.name ?? 'my hostel'}.`

  return (
    <div className={`${card} ${live ? 'border-red-200 bg-red-50/40' : ''}`}>
      {!live ? (
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <button
            onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()}
            disabled={send.isPending}
            className="relative w-36 h-36 rounded-full bg-red-600 text-white font-black text-2xl shadow-lg select-none touch-none active:scale-95 transition-transform disabled:opacity-70"
            style={{ boxShadow: `0 0 0 ${6 + progress * 14}px rgba(220,38,38,${0.15 + progress * 0.25})` }}
            aria-label="Hold for SOS"
          >
            <span className="flex flex-col items-center gap-1"><Siren size={30} />{send.isPending ? 'Sending' : 'SOS'}</span>
          </button>
          <p className="text-sm text-gray-600">{send.isPending ? 'Getting your location…' : 'Press and hold for 1.5 seconds'}</p>
          <p className="text-xs text-gray-400">Alerts your hostel's staff, warden and owner with your location. In danger? Also call 112.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
            <p className="font-bold text-red-700">SOS sent at {fmtAt(sos.createdAt)}</p>
          </div>
          <p className="text-sm text-gray-700">
            {sos.status === 'ACKNOWLEDGED' ? 'Hostel staff have seen your alert and are responding.' : 'Your hostel staff and owner have been alerted. Waiting for them to respond…'}
            {!sos.mapsUrl && ' Your location could not be shared — tell them where you are.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a href="tel:112" className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold"><Phone size={15} /> Call 112</a>
            {data.hostel?.phone && <a href={`tel:${data.hostel.phone}`} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold"><Phone size={15} /> Call hostel</a>}
            {contact?.mobile && <a href={waLink(contact.mobile, shareText)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"><MessageCircle size={15} /> WhatsApp {contact.name?.split(' ')[0] ?? 'contact'}</a>}
            {contact?.mobile && <a href={`tel:${contact.mobile}`} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold"><Phone size={15} /> Call {contact.name?.split(' ')[0] ?? 'contact'}</a>}
          </div>
          <button onClick={() => safe.mutate()} disabled={safe.isPending} className="w-full py-2.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-1.5">
            <CheckCircle2 size={15} /> I'm safe now
          </button>
        </div>
      )}
      {sos && !live && sos.status === 'RESOLVED' && (
        <p className="text-xs text-gray-500 mt-3 text-center">Your last alert was closed by the hostel{sos.resolutionNote ? `: ${sos.resolutionNote}` : ''}.</p>
      )}
    </div>
  )
}

function EmergencyNumbers({ hostel }: { hostel?: any }) {
  const nums = [
    { n: '112', l: 'Emergency (police, fire, ambulance)', icon: Siren },
    { n: '108', l: 'Ambulance', icon: Ambulance },
    { n: '181', l: "Women's helpline", icon: Phone },
    ...(hostel?.phone ? [{ n: hostel.phone, l: 'Your hostel', icon: Phone }] : []),
  ]
  const hospitals = hostel?.latitude != null
    ? `https://www.google.com/maps/search/hospitals/@${hostel.latitude},${hostel.longitude},14z`
    : 'https://www.google.com/maps/search/hospitals+near+me'
  return (
    <div className={card}>
      <p className="text-sm font-bold text-gray-800 mb-3">Emergency numbers</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {nums.map(({ n, l, icon: Icon }) => (
          <a key={n} href={`tel:${n}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50">
            <Icon size={16} className="text-red-500 shrink-0" />
            <span className="text-sm"><b>{n}</b> <span className="text-gray-500 text-xs block">{l}</span></span>
          </a>
        ))}
        <a href={hospitals} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50">
          <Hospital size={16} className="text-brand-600 shrink-0" />
          <span className="text-sm"><b>Hospitals nearby</b> <span className="text-gray-500 text-xs block">Opens Google Maps</span></span>
        </a>
      </div>
    </div>
  )
}

// ─── Not feeling well ───────────────────────────────────────────────────────────
function UnwellCard({ data, onChanged }: { data: any; onChanged: () => void }) {
  const { show } = useToastStore()
  const flag = data.unwell
  const [needs, setNeeds] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)
  const send = useMutation({
    mutationFn: () => flagUnwell({ note: note.trim() || undefined, needs }),
    onSuccess: () => { setOpen(false); onChanged(); show('success', 'The hostel has been told', 'Someone will check on you.') },
    onError: (e) => show('error', 'Could not send', errMsg(e)),
  })
  const better = useMutation({ mutationFn: clearUnwell, onSuccess: () => { onChanged(); show('success', 'Glad you feel better!', '') } })

  return (
    <div className={card}>
      <p className="text-sm font-bold text-gray-800 flex items-center gap-2"><HeartPulse size={16} className="text-rose-500" /> Not feeling well?</p>
      {flag ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-gray-700">
            You told the hostel at {fmtAt(flag.createdAt)}{flag.needList?.length ? ` — needs: ${flag.needList.map((n: string) => NEED_LABELS[n]?.toLowerCase() ?? n).join(', ')}` : ''}.
          </p>
          {flag.checkedAt
            ? <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">Staff checked on you at {fmtAt(flag.checkedAt)}{flag.staffNote ? `: ${flag.staffNote}` : ''}.</p>
            : <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Waiting for staff to check on you.</p>}
          <button onClick={() => better.mutate()} className="text-sm font-semibold text-brand-600">I'm feeling better</button>
        </div>
      ) : !open ? (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-3">Let the warden know so someone can check on you, send food to your room or help you see a doctor.</p>
          <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl text-sm font-semibold border border-rose-200 text-rose-600 hover:bg-rose-50">Tell the hostel</button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(NEED_LABELS).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setNeeds((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${needs.includes(k) ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-gray-500 border-gray-200'}`}>{v}</button>
            ))}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder="Anything else? e.g. fever since morning" className={input + ' resize-none'} />
          <div className="flex gap-2">
            <button onClick={() => send.mutate()} disabled={send.isPending} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-rose-600 disabled:opacity-60">{send.isPending ? 'Sending…' : 'Send'}</button>
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl text-sm text-gray-500">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Late entry ─────────────────────────────────────────────────────────────────
const LATE_STATUS: Record<string, string> = { PENDING: 'bg-amber-50 text-amber-700', APPROVED: 'bg-emerald-50 text-emerald-700', REJECTED: 'bg-red-50 text-red-700', CANCELLED: 'bg-gray-100 text-gray-500' }

function LateEntryCard({ data, onChanged }: { data: any; onChanged: () => void }) {
  const { show } = useToastStore()
  const today = new Date().toLocaleDateString('en-CA')
  const [f, setF] = useState({ date: today, time: '23:30', reason: '' })
  const send = useMutation({
    mutationFn: () => requestLateEntry({ ...f, reason: f.reason.trim() }),
    onSuccess: () => { setF((x) => ({ ...x, reason: '' })); onChanged(); show('success', 'Request sent', 'You will be notified when the hostel replies.') },
    onError: (e) => show('error', 'Could not send', errMsg(e)),
  })
  const cancel = useMutation({ mutationFn: (id: number) => cancelLateEntry(id), onSuccess: onChanged })
  const list: any[] = data.lateEntries ?? []
  return (
    <div className={card}>
      <p className="text-sm font-bold text-gray-800 flex items-center gap-2"><Moon size={16} className="text-indigo-500" /> Coming back late?</p>
      <p className="text-xs text-gray-500 mt-1 mb-3">The gate closes at {fmtTime(data.curfewTime)}. Ask in advance so the warden knows to expect you.</p>
      <div className="grid grid-cols-2 gap-2">
        <input type="date" min={today} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={input} />
        <input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} className={input} />
        <input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} maxLength={300} placeholder="Reason, e.g. office night shift" className={input + ' col-span-2'} />
      </div>
      <button onClick={() => send.mutate()} disabled={send.isPending || f.reason.trim().length < 3} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white brand-gradient disabled:opacity-50">
        {send.isPending ? 'Sending…' : 'Ask for late entry'}
      </button>
      {list.length > 0 && (
        <div className="mt-4 space-y-2">
          {list.slice(0, 6).map((l) => (
            <div key={l.id} className="flex items-center gap-2 text-sm border border-gray-100 rounded-xl px-3 py-2 flex-wrap">
              <Clock size={13} className="text-gray-400" />
              <span className="font-medium text-gray-700">{fmtDay(l.entryDate)} · {fmtTime(l.expectedTime)}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${LATE_STATUS[l.status] ?? ''}`}>{l.status.charAt(0) + l.status.slice(1).toLowerCase()}</span>
              {l.staffNote && <span className="text-xs text-gray-500 w-full">Hostel: {l.staffNote}</span>}
              {(l.status === 'PENDING' || l.status === 'APPROVED') && l.entryDate >= today && (
                <button onClick={() => cancel.mutate(l.id)} className="ml-auto text-xs text-red-500 font-semibold">Cancel</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
