import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, Inbox, MessageCircle, Phone, X, ExternalLink, Clock } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import PushToggle from '../../components/common/PushToggle'
import { getEnquiries, getEnquiryCounts, getHostel, getListing, updateEnquiry } from '../../api/staff'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { whatsappLink } from '../../lib/payments'

const STATUSES = [
  ['NEW', 'New', 'bg-brand-50 text-brand-700'],
  ['CONTACTED', 'Contacted', 'bg-amber-50 text-amber-700'],
  ['VISIT_SCHEDULED', 'Visit scheduled', 'bg-purple-50 text-purple-700'],
  ['WAITLIST', 'Waitlist', 'bg-gray-100 text-gray-600'],
  ['JOINED', 'Joined', 'bg-emerald-50 text-emerald-700'],
  ['LOST', 'Lost', 'bg-red-50 text-red-600'],
] as const
const STATUS_STYLE = Object.fromEntries(STATUSES.map(([k, , c]) => [k, c])) as Record<string, string>
const STATUS_LABEL = Object.fromEntries(STATUSES.map(([k, l]) => [k, l])) as Record<string, string>
const SLOT_LABEL: Record<string, string> = { MORNING: 'Morning', AFTERNOON: 'Afternoon', EVENING: 'Evening' }

function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '' }
function ago(d?: string) {
  if (!d) return ''
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 60) return `${Math.max(m, 1)}m ago`
  if (m < 1440) return `${Math.round(m / 60)}h ago`
  return `${Math.round(m / 1440)}d ago`
}
const roomLabel = (t?: string) => (t ? t.charAt(0) + t.slice(1).toLowerCase() + ' sharing' : '')

export default function Enquiries() {
  const { activeHostelId } = useAuthStore()
  const [params, setParams] = useSearchParams()
  const filter = params.get('status') ?? 'OPEN'
  const [selected, setSelected] = useState<any | null>(null)
  const qc = useQueryClient()
  const { show } = useToastStore()

  const { data: counts = {} } = useQuery({ queryKey: ['enq-counts', activeHostelId], queryFn: () => getEnquiryCounts(activeHostelId!), enabled: !!activeHostelId, refetchInterval: 60_000 })
  const { data: all = [], isLoading } = useQuery({ queryKey: ['enquiries', activeHostelId], queryFn: () => getEnquiries(activeHostelId!), enabled: !!activeHostelId, refetchInterval: 60_000 })
  const { data: hostel } = useQuery({ queryKey: ['hostel-info', activeHostelId], queryFn: () => getHostel(activeHostelId!), enabled: !!activeHostelId })
  const { data: listing } = useQuery({ queryKey: ['listing', activeHostelId], queryFn: () => getListing(activeHostelId!), enabled: !!activeHostelId, retry: false })

  const list = (all as any[]).filter((e) => filter === 'ALL' ? true : filter === 'OPEN' ? ['NEW', 'CONTACTED', 'VISIT_SCHEDULED'].includes(e.status) : e.status === filter)
  const openCount = (counts.NEW ?? 0) + (counts.CONTACTED ?? 0) + (counts.VISIT_SCHEDULED ?? 0)

  const mut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => updateEnquiry(id, data),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['enquiries', activeHostelId] })
      qc.invalidateQueries({ queryKey: ['enq-counts', activeHostelId] })
      setSelected(saved)
      show('success', 'Saved', `Marked as ${STATUS_LABEL[saved.status]}.`)
    },
    onError: (e: any) => show('error', 'Not saved', e?.response?.data?.message ?? 'Could not update.'),
  })

  function waText(e: any) {
    const first = e.name.split(' ')[0]
    const base = `Hi ${first}, this is ${hostel?.name ?? 'the hostel'}. Thanks for your enquiry`
    if (e.visitDate) return `${base}. Your visit on ${fmtDate(e.visitDate)} (${SLOT_LABEL[e.visitSlot]?.toLowerCase() ?? ''}) works for us. ${hostel?.address ? 'Address: ' + hostel.address + '.' : ''} See you!`
    if (e.status === 'WAITLIST') return `${base}. A bed is now available. Would you like to visit?`
    return `${base}${e.roomType ? ` for a ${roomLabel(e.roomType).toLowerCase()} room` : ''}. When would you like to visit?`
  }

  const tabs: [string, string][] = [
    ['OPEN', `Open (${openCount})`], ['NEW', `New (${counts.NEW ?? 0})`], ['VISIT_SCHEDULED', `Visits (${counts.VISIT_SCHEDULED ?? 0})`],
    ['WAITLIST', `Waitlist (${counts.WAITLIST ?? 0})`], ['JOINED', `Joined (${counts.JOINED ?? 0})`], ['ALL', 'All'],
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Enquiries" subtitle="Leads from your public hostel page: reply fast to fill beds" />

      {listing && !listing.listingEnabled && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 text-sm text-amber-800">
          Your hostel isn't public yet, so no new enquiries can come in. Publish it in <b>Settings → Public Listing</b>.
        </div>
      )}
      {listing?.listingEnabled && (
        <a href={listing.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800">
          <ExternalLink size={13} /> View your public page
        </a>
      )}

      <PushToggle title="New enquiry alerts on this device" description="Get a notification the moment someone enquires or requests a visit." />

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setParams(k === 'OPEN' ? {} : { status: k }, { replace: true })}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filter === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-16">
            <Inbox size={28} className="mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-500 mt-2">No enquiries here</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {list.map((e) => (
              <li key={e.id}>
                <button onClick={() => setSelected(e)} className="w-full text-left px-5 py-3.5 hover:bg-gray-50/70 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{e.name}</p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                      {e.visitDate && <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-1"><CalendarCheck size={11} /> {fmtDate(e.visitDate)} · {SLOT_LABEL[e.visitSlot] ?? ''}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {e.mobile}{e.roomType ? ` · ${roomLabel(e.roomType)}` : ''}{e.moveInDate ? ` · moving ${fmtDate(e.moveInDate)}` : ''}{e.message ? ` · "${e.message}"` : ''}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap flex items-center gap-1"><Clock size={11} /> {ago(e.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <EnquiryDrawer key={selected.id} e={selected} waLink={whatsappLink(selected.mobile, waText(selected))} saving={mut.isPending}
          onClose={() => setSelected(null)} onSave={(data) => mut.mutate({ id: selected.id, data })} />
      )}
    </div>
  )
}

function EnquiryDrawer({ e, waLink, saving, onClose, onSave }: { e: any; waLink: string; saving: boolean; onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [status, setStatus] = useState<string>(e.status)
  const [notes, setNotes] = useState<string>(e.staffNotes ?? '')
  const [visitDate, setVisitDate] = useState<string>(e.visitDate ?? '')
  const [visitSlot, setVisitSlot] = useState<string>(e.visitSlot ?? 'EVENING')
  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl p-6 space-y-5" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{e.name}</h3>
            <p className="text-xs text-gray-400">Enquired {new Date(e.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <a href={`tel:${e.mobile}`} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"><Phone size={14} /> Call</a>
          <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"><MessageCircle size={14} /> WhatsApp</a>
        </div>

        <dl className="rounded-xl bg-gray-50 divide-y divide-gray-100 text-sm">
          {[
            ['Mobile', e.mobile], ['Email', e.email], ['Gender', e.gender && e.gender.charAt(0) + e.gender.slice(1).toLowerCase()],
            ['Room type', roomLabel(e.roomType)], ['Move-in', e.moveInDate && fmtDate(e.moveInDate)],
            ['Requested visit', e.visitDate && `${fmtDate(e.visitDate)} · ${SLOT_LABEL[e.visitSlot] ?? ''}`], ['Message', e.message],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k as string} className="flex gap-3 px-4 py-2.5"><dt className="w-28 shrink-0 text-gray-400">{k}</dt><dd className="text-gray-800 break-words min-w-0">{v}</dd></div>
          ))}
        </dl>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-gray-500">Status
            <select value={status} onChange={(ev) => setStatus(ev.target.value)} className={inputCls + ' mt-1'}>
              {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          {status === 'VISIT_SCHEDULED' && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-gray-500">Visit date
                <input type="date" value={visitDate} onChange={(ev) => setVisitDate(ev.target.value)} className={inputCls + ' mt-1'} />
              </label>
              <label className="text-xs font-semibold text-gray-500">Time
                <select value={visitSlot} onChange={(ev) => setVisitSlot(ev.target.value)} className={inputCls + ' mt-1'}>
                  {Object.entries(SLOT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
            </div>
          )}
          <label className="block text-xs font-semibold text-gray-500">Notes (only staff see these)
            <textarea value={notes} onChange={(ev) => setNotes(ev.target.value)} rows={3} maxLength={2000} className={inputCls + ' mt-1 resize-none'} />
          </label>
          {status === 'VISIT_SCHEDULED' && e.email && <p className="text-[11px] text-gray-400">The visitor gets a confirmation email when you save.</p>}
          <button disabled={saving}
            onClick={() => onSave({ status, staffNotes: notes, ...(status === 'VISIT_SCHEDULED' ? { visitDate: visitDate || null, visitSlot } : {}) })}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
