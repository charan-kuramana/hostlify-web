import NoticeEstimate from '../../components/stay/NoticeEstimate'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, Plus, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { apiClient } from '../../api/client'
import { errMsg } from '../../api/ops'

const d = (r: any) => r.data.data
const getRequests = (hostelId: number, status: string) => apiClient.get(`/checkout-requests/hostel/${hostelId}`, { params: status ? { status } : {} }).then(d)
const getItems = (): Promise<string[]> => apiClient.get('/checkout-requests/items').then(d)
const approve = (id: number, body: unknown) => apiClient.post(`/checkout-requests/${id}/approve`, body).then(d)
const reject = (id: number, note: string) => apiClient.post(`/checkout-requests/${id}/reject`, { note }).then(d)

const fmt = (s?: string | null) => (s ? new Date(s.length === 10 ? s + 'T00:00:00' : s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—')
type Item = { label: string; status: 'OK' | 'DAMAGED' | 'MISSING' | 'NA'; note: string }
const STATUSES: Item['status'][] = ['OK', 'DAMAGED', 'MISSING', 'NA']
const ST_CLS: Record<string, string> = { OK: 'bg-emerald-600 text-white', DAMAGED: 'bg-amber-500 text-white', MISSING: 'bg-red-600 text-white', NA: 'bg-gray-500 text-white' }

function Inspect({ req, defaults, onClose }: { req: any; defaults: string[]; onClose: () => void }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const [items, setItems] = useState<Item[]>(defaults.map((label) => ({ label, status: 'OK', note: '' })))
  const [extra, setExtra] = useState('')
  const [note, setNote] = useState('')
  const done = (title: string) => { qc.invalidateQueries({ queryKey: ['checkouts'] }); show('success', title, ''); onClose() }
  const ok = useMutation({ mutationFn: () => approve(req.id, { items, note }), onSuccess: () => done('Checked out'), onError: (e) => show('error', 'Could not approve', errMsg(e)) })
  const back = useMutation({ mutationFn: () => reject(req.id, note), onSuccess: () => done('Sent back to the resident'), onError: (e) => show('error', 'Could not send back', errMsg(e)) })
  const set = (i: number, patch: Partial<Item>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const problems = items.filter((i) => i.status === 'DAMAGED' || i.status === 'MISSING').length

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Room check · {req.residentName}</h2>
            <p className="text-xs text-gray-500">{req.roomName}{req.bedName ? ` / ${req.bedName}` : ''} · leaving {fmt(req.requestedDate)}{req.reason ? ` · ${req.reason}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400"><X size={18} /></button>
        </div>
        {req.estimate && <NoticeEstimate e={req.estimate} staff />}
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-800">{it.label}</span>
                <div className="flex gap-1">
                  {STATUSES.map((s) => (
                    <button key={s} type="button" onClick={() => set(i, { status: s })}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${it.status === s ? ST_CLS[s] : 'bg-gray-100 text-gray-500'}`}>
                      {s === 'NA' ? 'N/A' : s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
              {(it.status === 'DAMAGED' || it.status === 'MISSING') && (
                <input value={it.note} onChange={(e) => set(i, { note: e.target.value })} placeholder="What's wrong?" maxLength={200}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs" />
              )}
            </div>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); if (extra.trim()) { setItems((xs) => [...xs, { label: extra.trim(), status: 'OK', note: '' }]); setExtra('') } }} className="flex gap-2">
            <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Add another item (e.g. Iron box)" maxLength={80}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm" />
            <button className="px-3 rounded-xl border border-gray-200 text-gray-600"><Plus size={14} /></button>
          </form>
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500}
          placeholder="Note to the resident (required to send back, e.g. Return the locker key first)"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none" />
        {problems > 0 && <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3">{problems} item(s) damaged or missing. After approving, record any deduction in the resident's deposit settlement.</p>}
        <div className="flex gap-3">
          <button onClick={() => back.mutate()} disabled={back.isPending || !note.trim()} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 disabled:opacity-50">Send back</button>
          <button onClick={() => ok.mutate()} disabled={ok.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient disabled:opacity-60">
            {ok.isPending ? 'Checking out…' : 'Approve & check out'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Checkouts() {
  const { activeHostelId } = useAuthStore()
  const [status, setStatus] = useState('REQUESTED')
  const [open, setOpen] = useState<any>(null)
  const { data: list = [], isLoading } = useQuery({ queryKey: ['checkouts', activeHostelId, status], queryFn: () => getRequests(activeHostelId!, status), enabled: !!activeHostelId })
  const { data: defaults = [] } = useQuery({ queryKey: ['checkout-items'], queryFn: getItems, staleTime: Infinity })

  return (
    <div className="space-y-6">
      <PageHeader title="Check-outs" subtitle="Residents who asked to leave. Check the room, then approve." />
      {open && <Inspect key={open.id} req={open} defaults={defaults} onClose={() => setOpen(null)} />}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[['REQUESTED', 'Waiting'], ['APPROVED', 'Checked out'], ['REJECTED', 'Sent back'], ['', 'All']].map(([v, l]) => (
          <button key={v} onClick={() => setStatus(v)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${status === v ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500'}`}>{l}</button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {isLoading && <p className="p-5 text-sm text-gray-400">Loading…</p>}
        {!isLoading && list.length === 0 && <p className="p-8 text-center text-sm text-gray-400">No check-out requests here.</p>}
        {list.map((r: any) => (
          <div key={r.id} className="p-4 flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><ClipboardCheck size={16} className="text-brand-600" /></div>
            <div className="flex-1 min-w-[12rem]">
              <p className="text-sm font-semibold text-gray-800">{r.residentName} <span className="font-normal text-gray-400">· {r.roomName}{r.bedName ? ` / ${r.bedName}` : ''}</span></p>
              <p className="text-xs text-gray-500">Leaving {fmt(r.requestedDate)}{r.reason ? ` · ${r.reason}` : ''}{r.staffNote ? ` · Note: ${r.staffNote}` : ''}</p>
            </div>
            {r.status === 'REQUESTED'
              ? <button onClick={() => setOpen(r)} className="px-4 py-2 rounded-xl text-xs font-semibold text-white brand-gradient">Check room</button>
              : <span className="text-xs font-semibold text-gray-500">{r.status === 'APPROVED' ? `Checked out ${fmt(r.decidedAt)}` : r.status.toLowerCase()}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
