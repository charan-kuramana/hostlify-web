import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DoorOpen, Plus, Share2, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import NoStay from './NoStay'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { addDays, addMyVisitor, cancelMyVisitor, errMsg, fmtDay, fmtTime, getMyVisitors, todayIST } from '../../api/ops'

const STATUS: Record<string, [string, string]> = {
  EXPECTED: ['Expected', 'bg-brand-50 text-brand-700'], INSIDE: ['Inside now', 'bg-emerald-50 text-emerald-700'],
  LEFT: ['Visited', 'bg-gray-100 text-gray-500'], CANCELLED: ['Cancelled', 'bg-red-50 text-red-500'],
}

export default function Visitors() {
  const { hostelId } = useAuthStore()
  const qc = useQueryClient()
  const { show } = useToastStore()
  const [adding, setAdding] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['my-visitors'], queryFn: getMyVisitors, enabled: !!hostelId })
  const cancel = useMutation({
    mutationFn: (id: number) => cancelMyVisitor(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-visitors'] }); show('success', 'Pass cancelled') },
    onError: (e) => show('error', 'Failed', errMsg(e)),
  })
  if (!hostelId) return <NoStay title="Visitors" subtitle="Pre-approve your guests" />

  const share = (v: any) => {
    const text = `Your visitor pass for my hostel on ${fmtDay(v.visitDate)}: code ${v.passCode}. Show this code at the gate.`
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else window.open(`https://wa.me/${v.visitorMobile ? '91' + String(v.visitorMobile).replace(/\D/g, '').slice(-10) : ''}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Visitors" subtitle="Pre-approve a guest and share the pass code. The gate checks them in and you get a notification."
        action={<button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white brand-gradient"><Plus size={14} /> Add visitor</button>} />
      {isLoading ? <p className="text-sm text-gray-400">Loading…</p> : (
        <>
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-gray-700">Upcoming</h3>
            {(data?.upcoming ?? []).length === 0 && <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400"><DoorOpen className="mx-auto mb-2 text-gray-300" />No visitors planned.</div>}
            {(data?.upcoming ?? []).map((v: any) => (
              <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[12rem]">
                  <p className="font-semibold text-gray-800">{v.visitorName} <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-full ${STATUS[v.status][1]}`}>{STATUS[v.status][0]}</span></p>
                  <p className="text-xs text-gray-500">{fmtDay(v.visitDate)}{v.relation ? ` · ${v.relation}` : ''}{v.entryAt ? ` · arrived ${fmtTime(v.entryAt)}` : ''}</p>
                </div>
                {v.status === 'EXPECTED' && (
                  <>
                    <span className="font-mono text-xl font-bold tracking-[0.25em] text-brand-700 bg-brand-50 rounded-xl px-3 py-1">{v.passCode}</span>
                    <button onClick={() => share(v)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 flex items-center gap-1"><Share2 size={12} /> Share</button>
                    <button onClick={() => confirm('Cancel this visitor pass?') && cancel.mutate(v.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600">Cancel</button>
                  </>
                )}
              </div>
            ))}
          </section>
          {(data?.past ?? []).length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-700 mb-2">Past</h3>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {data.past.map((v: any) => (
                  <div key={v.id} className="px-4 py-2.5 text-sm text-gray-600 flex gap-2"><span className="flex-1">{v.visitorName} · {fmtDay(v.visitDate)}</span><span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS[v.status][1]}`}>{v.status === 'EXPECTED' ? 'Did not come' : STATUS[v.status][0]}</span></div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {adding && <AddVisitor onClose={() => setAdding(false)} onDone={(v) => { qc.invalidateQueries({ queryKey: ['my-visitors'] }); show('success', 'Pass created', `Share code ${v.passCode} with ${v.visitorName}.`) }} />}
    </div>
  )
}

function AddVisitor({ onClose, onDone }: { onClose: () => void; onDone: (v: any) => void }) {
  const { show } = useToastStore()
  const [f, setF] = useState({ visitorName: '', visitorMobile: '', relation: '', purpose: '', visitDate: todayIST() })
  const mut = useMutation({
    mutationFn: () => addMyVisitor(f),
    onSuccess: (v) => { onDone(v); onClose() },
    onError: (e) => show('error', 'Not created', errMsg(e)),
  })
  const cls = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 mt-1'
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
        <div className="flex items-center"><h3 className="font-bold text-gray-900 flex-1">Add a visitor</h3><button onClick={onClose} aria-label="Close"><X size={18} className="text-gray-400" /></button></div>
        <label className="block text-xs font-semibold text-gray-500">Visitor name<input value={f.visitorName} onChange={(e) => setF({ ...f, visitorName: e.target.value })} className={cls} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-semibold text-gray-500">Mobile (optional)<input value={f.visitorMobile} inputMode="tel" onChange={(e) => setF({ ...f, visitorMobile: e.target.value })} className={cls} /></label>
          <label className="block text-xs font-semibold text-gray-500">Relation<input value={f.relation} placeholder="Parent, friend…" onChange={(e) => setF({ ...f, relation: e.target.value })} className={cls} /></label>
        </div>
        <label className="block text-xs font-semibold text-gray-500">Date<input type="date" min={todayIST()} max={addDays(todayIST(), 30)} value={f.visitDate} onChange={(e) => setF({ ...f, visitDate: e.target.value })} className={cls} /></label>
        <label className="block text-xs font-semibold text-gray-500">Purpose (optional)<input value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} className={cls} /></label>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || f.visitorName.trim().length < 2} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold brand-gradient disabled:opacity-50">{mut.isPending ? 'Creating…' : 'Create pass'}</button>
      </div>
    </div>
  )
}
