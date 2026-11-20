import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DoorOpen, LogIn, LogOut, Search, UserPlus, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import ResidentPicker from '../../components/common/ResidentPicker'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import {
  addWalkIn, cancelVisitor, errMsg, findVisitorByCode, fmtTime, getVisitors, todayIST, visitorCheckIn, visitorCheckOut,
} from '../../api/ops'

const STATUS_STYLE: Record<string, string> = {
  EXPECTED: 'bg-brand-50 text-brand-700', INSIDE: 'bg-emerald-50 text-emerald-700', LEFT: 'bg-gray-100 text-gray-500', CANCELLED: 'bg-red-50 text-red-500',
}
const STATUS_LABEL: Record<string, string> = { EXPECTED: 'Expected', INSIDE: 'Inside', LEFT: 'Left', CANCELLED: 'Cancelled' }

export default function Visitors() {
  const { activeHostelId } = useAuthStore()
  const qc = useQueryClient()
  const { show } = useToastStore()
  const [date, setDate] = useState(todayIST())
  const [code, setCode] = useState('')
  const [found, setFound] = useState<any[] | null>(null)
  const [walkIn, setWalkIn] = useState(false)
  const { data: list = [], isLoading } = useQuery({ queryKey: ['visitors', activeHostelId, date], queryFn: () => getVisitors(activeHostelId!, date), enabled: !!activeHostelId, refetchInterval: 30_000 })

  const refresh = () => qc.invalidateQueries({ queryKey: ['visitors', activeHostelId] })
  const act = useMutation({
    mutationFn: ({ id, kind }: { id: number; kind: 'in' | 'out' | 'cancel' }) => (kind === 'in' ? visitorCheckIn(id) : kind === 'out' ? visitorCheckOut(id) : cancelVisitor(id)),
    onSuccess: (_d, v) => { refresh(); setFound(null); setCode(''); show('success', v.kind === 'in' ? 'Checked in' : v.kind === 'out' ? 'Checked out' : 'Pass cancelled') },
    onError: (e) => show('error', 'Failed', errMsg(e)),
  })
  async function lookup() {
    if (!/^\d{6}$/.test(code.trim())) { show('error', 'Enter the 6-digit pass code'); return }
    try {
      const r = await findVisitorByCode(activeHostelId!, code.trim())
      setFound(r)
      if (!r.length) show('error', 'No expected visitor with this code', 'Check the code, or log them as a walk-in.')
    } catch (e) { show('error', 'Lookup failed', errMsg(e)) }
  }

  const inside = (list as any[]).filter((v) => v.status === 'INSIDE')
  return (
    <div>
      <PageHeader title="Visitors" subtitle="Gate pass check-in and check-out" count={inside.length}
        action={<button onClick={() => setWalkIn(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white brand-gradient"><UserPlus size={14} /> Walk-in</button>} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">Visitor has a pass? Enter their code</p>
        <div className="flex gap-2 max-w-md">
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && lookup()} inputMode="numeric" placeholder="6-digit code"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-lg tracking-[0.3em] font-mono bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400" />
          <button onClick={lookup} className="px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold flex items-center gap-1.5"><Search size={14} /> Find</button>
        </div>
        {found && found.map((v) => (
          <div key={v.id} className="mt-3 flex items-center gap-3 bg-brand-50 rounded-xl px-4 py-3">
            <div className="flex-1"><p className="font-semibold text-gray-800">{v.visitorName} {v.relation && <span className="text-xs text-gray-500">({v.relation})</span>}</p>
              <p className="text-xs text-gray-500">Visiting {v.residentName}{v.roomNumber ? `, room ${v.roomNumber}` : ''} · {v.visitDate}</p></div>
            <button onClick={() => act.mutate({ id: v.id, kind: 'in' })} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 flex items-center gap-1.5"><LogIn size={14} /> Check in</button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white" />
        {date !== todayIST() && <button onClick={() => setDate(todayIST())} className="text-xs font-semibold text-brand-600">Today</button>}
      </div>
      {isLoading ? <p className="text-sm text-gray-400">Loading…</p> : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm"><DoorOpen className="mx-auto mb-2 text-gray-300" />No visitors for this day.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {(list as any[]).map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
              <div className="flex-1 min-w-[12rem]">
                <p className="font-semibold text-gray-800 text-sm">{v.visitorName} <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLE[v.status]}`}>{STATUS_LABEL[v.status]}</span></p>
                <p className="text-xs text-gray-500">{v.residentName ? `Visiting ${v.residentName}${v.roomNumber ? `, room ${v.roomNumber}` : ''}` : 'No resident'}{v.visitorMobile ? ` · ${v.visitorMobile}` : ''}{v.purpose ? ` · ${v.purpose}` : ''}</p>
                <p className="text-[11px] text-gray-400">{v.createdByRole === 'HOSTELLER' ? 'Pre-approved by resident' : 'Walk-in'}{v.entryAt ? ` · in ${fmtTime(v.entryAt)}` : ''}{v.exitAt ? ` · out ${fmtTime(v.exitAt)}` : ''}</p>
              </div>
              {v.status === 'EXPECTED' && v.visitDate === todayIST() && <button onClick={() => act.mutate({ id: v.id, kind: 'in' })} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 flex items-center gap-1"><LogIn size={12} /> Check in</button>}
              {v.status === 'EXPECTED' && <button onClick={() => confirm('Cancel this pass?') && act.mutate({ id: v.id, kind: 'cancel' })} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-500">Cancel</button>}
              {v.status === 'INSIDE' && <button onClick={() => act.mutate({ id: v.id, kind: 'out' })} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 text-white flex items-center gap-1"><LogOut size={12} /> Check out</button>}
            </div>
          ))}
        </div>
      )}
      {walkIn && activeHostelId && <WalkInModal hostelId={activeHostelId} onClose={() => setWalkIn(false)} onDone={refresh} />}
    </div>
  )
}

function WalkInModal({ hostelId, onClose, onDone }: { hostelId: number; onClose: () => void; onDone: () => void }) {
  const { show } = useToastStore()
  const [f, setF] = useState({ visitorName: '', visitorMobile: '', relation: '', purpose: '' })
  const [resident, setResident] = useState<number | null>(null)
  const mut = useMutation({
    mutationFn: () => addWalkIn(hostelId, { ...f, hostellerId: resident }),
    onSuccess: () => { onDone(); onClose(); show('success', 'Visitor checked in', resident ? 'The resident has been notified.' : undefined) },
    onError: (e) => show('error', 'Not saved', errMsg(e)),
  })
  const cls = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 mt-1'
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
        <div className="flex items-center"><h3 className="font-bold text-gray-900 flex-1">Walk-in visitor</h3><button onClick={onClose} aria-label="Close"><X size={18} className="text-gray-400" /></button></div>
        <label className="block text-xs font-semibold text-gray-500">Visitor name<input value={f.visitorName} onChange={(e) => setF({ ...f, visitorName: e.target.value })} className={cls} /></label>
        <label className="block text-xs font-semibold text-gray-500">Mobile (optional)<input value={f.visitorMobile} inputMode="tel" onChange={(e) => setF({ ...f, visitorMobile: e.target.value })} className={cls} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-semibold text-gray-500">Relation<input value={f.relation} placeholder="Parent, friend…" onChange={(e) => setF({ ...f, relation: e.target.value })} className={cls} /></label>
          <label className="block text-xs font-semibold text-gray-500">Purpose<input value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} className={cls} /></label>
        </div>
        <div><p className="text-xs font-semibold text-gray-500 mb-1">Visiting</p><ResidentPicker hostelId={hostelId} value={resident} onChange={setResident} optional="Nobody in particular (delivery, repair…)" /></div>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || f.visitorName.trim().length < 2} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold brand-gradient disabled:opacity-50">{mut.isPending ? 'Saving…' : 'Check in now'}</button>
      </div>
    </div>
  )
}
