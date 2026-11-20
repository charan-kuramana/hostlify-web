import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, PackageCheck, Plus, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import ResidentPicker from '../../components/common/ResidentPicker'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { collectParcel, errMsg, fmtDateTime, getParcels, logParcel } from '../../api/ops'

export default function Parcels() {
  const { activeHostelId } = useAuthStore()
  const qc = useQueryClient()
  const { show } = useToastStore()
  const [adding, setAdding] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['parcels', activeHostelId], queryFn: () => getParcels(activeHostelId!), enabled: !!activeHostelId })
  const collect = useMutation({
    mutationFn: ({ id, by }: { id: number; by?: string }) => collectParcel(id, by),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parcels', activeHostelId] }); show('success', 'Marked collected') },
    onError: (e) => show('error', 'Failed', errMsg(e)),
  })
  const waiting = data?.waiting ?? []
  return (
    <div>
      <PageHeader title="Parcels" subtitle="Log deliveries at the desk; residents get a notification" count={waiting.length}
        action={<button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white brand-gradient"><Plus size={14} /> Log parcel</button>} />
      {isLoading ? <p className="text-sm text-gray-400">Loading…</p> : (
        <div className="space-y-5">
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-2">Waiting at desk</h3>
            {waiting.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400"><Package className="mx-auto mb-2 text-gray-300" />No parcels waiting.</div> : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {waiting.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center"><Package size={16} className="text-amber-600" /></div>
                    <div className="flex-1 min-w-[12rem]">
                      <p className="font-semibold text-gray-800 text-sm">{p.residentName}{p.roomNumber ? <span className="text-xs text-gray-400"> · room {p.roomNumber}</span> : null}</p>
                      <p className="text-xs text-gray-500">{[p.courier, p.description, p.shelf && `shelf ${p.shelf}`].filter(Boolean).join(' · ') || 'Parcel'} · received {fmtDateTime(p.receivedAt)}</p>
                    </div>
                    <button onClick={() => { const by = prompt('Collected by (leave blank if the resident collected it)') ?? null; if (by !== null) collect.mutate({ id: p.id, by: by || undefined }) }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 flex items-center gap-1"><PackageCheck size={12} /> Collected</button>
                  </div>
                ))}
              </div>
            )}
          </section>
          {(data?.collected ?? []).length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-700 mb-2">Collected (last 7 days)</h3>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {data.collected.map((p: any) => (
                  <div key={p.id} className="px-4 py-2.5 text-sm text-gray-600">
                    <b className="text-gray-700">{p.residentName}</b> · {p.courier ?? 'Parcel'} · collected {fmtDateTime(p.collectedAt)}{p.collectedByName ? ` by ${p.collectedByName}` : ''}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      {adding && activeHostelId && <LogModal hostelId={activeHostelId} onClose={() => setAdding(false)} onDone={() => qc.invalidateQueries({ queryKey: ['parcels', activeHostelId] })} />}
    </div>
  )
}

function LogModal({ hostelId, onClose, onDone }: { hostelId: number; onClose: () => void; onDone: () => void }) {
  const { show } = useToastStore()
  const [resident, setResident] = useState<number | null>(null)
  const [f, setF] = useState({ courier: '', description: '', shelf: '' })
  const mut = useMutation({
    mutationFn: () => logParcel(hostelId, { ...f, hostellerId: resident }),
    onSuccess: () => { onDone(); onClose(); show('success', 'Parcel logged', 'The resident has been notified.') },
    onError: (e) => show('error', 'Not saved', errMsg(e)),
  })
  const cls = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 mt-1'
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
        <div className="flex items-center"><h3 className="font-bold text-gray-900 flex-1">Log a parcel</h3><button onClick={onClose} aria-label="Close"><X size={18} className="text-gray-400" /></button></div>
        <div><p className="text-xs font-semibold text-gray-500 mb-1">For</p><ResidentPicker hostelId={hostelId} value={resident} onChange={setResident} /></div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-semibold text-gray-500">Courier<input value={f.courier} placeholder="Amazon, Flipkart…" onChange={(e) => setF({ ...f, courier: e.target.value })} className={cls} /></label>
          <label className="block text-xs font-semibold text-gray-500">Shelf / rack<input value={f.shelf} onChange={(e) => setF({ ...f, shelf: e.target.value })} className={cls} /></label>
        </div>
        <label className="block text-xs font-semibold text-gray-500">Description (optional)<input value={f.description} placeholder="Small box, envelope…" onChange={(e) => setF({ ...f, description: e.target.value })} className={cls} /></label>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !resident} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold brand-gradient disabled:opacity-50">{mut.isPending ? 'Saving…' : 'Log and notify'}</button>
      </div>
    </div>
  )
}
