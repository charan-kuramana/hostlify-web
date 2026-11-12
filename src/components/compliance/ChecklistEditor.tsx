import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Camera, Plus, Send, Trash2, X } from 'lucide-react'
import { addChecklistPhoto, deleteChecklistPhoto, saveChecklist, submitChecklist } from '../../api/compliance'
import { useToastStore } from '../../store/toastStore'

const CONDITIONS = [['GOOD', 'Good'], ['FAIR', 'Fair'], ['DAMAGED', 'Damaged'], ['MISSING', 'Missing'], ['NA', 'N/A']] as const
const COND_STYLE: Record<string, string> = {
  GOOD: 'bg-emerald-50 text-emerald-700 border-emerald-200', FAIR: 'bg-amber-50 text-amber-700 border-amber-200',
  DAMAGED: 'bg-red-50 text-red-700 border-red-200', MISSING: 'bg-red-50 text-red-700 border-red-200', NA: 'bg-gray-50 text-gray-500 border-gray-200',
}

/** Staff: fill the move-in / move-out checklist, add photos, then send it to the resident to confirm. */
export default function ChecklistEditor({ checklist, moveIn, onClose, onSaved }: { checklist: any; moveIn?: any; onClose: () => void; onSaved: () => void }) {
  const { show } = useToastStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<any[]>(checklist.items ?? [])
  const [keys, setKeys] = useState<string>(checklist.keysHanded != null ? String(checklist.keysHanded) : '')
  const [meter, setMeter] = useState<string>(checklist.meterReading ?? '')
  const [notes, setNotes] = useState<string>(checklist.staffNotes ?? '')
  const [photos, setPhotos] = useState<any[]>(checklist.photos ?? [])
  const [uploading, setUploading] = useState(false)
  const before: Record<string, string> = Object.fromEntries((moveIn?.items ?? []).map((i: any) => [i.key, i.condition]))
  const editable = checklist.status === 'DRAFT' || checklist.status === 'DISPUTED'
  const err = (e: any, f: string) => show('error', 'Failed', e?.response?.data?.message ?? f)

  const payload = () => ({ items, keysHanded: keys === '' ? null : Number(keys), meterReading: meter, staffNotes: notes })
  const saveMut = useMutation({ mutationFn: () => saveChecklist(checklist.id, payload()), onSuccess: () => { onSaved(); show('success', 'Saved') }, onError: (e) => err(e, 'Could not save.') })
  const submitMut = useMutation({
    mutationFn: async () => { await saveChecklist(checklist.id, payload()); return submitChecklist(checklist.id) },
    onSuccess: () => { onSaved(); onClose(); show('success', 'Sent', 'The resident has been asked to confirm.') },
    onError: (e) => err(e, 'Could not send.'),
  })

  async function onFiles(list: FileList | null) {
    if (!list?.length) return
    setUploading(true)
    for (const f of Array.from(list)) {
      try { const p = await addChecklistPhoto(checklist.id, f); setPhotos((x) => [...x, p]) } catch (e) { err(e, `Could not upload ${f.name}.`) }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const setItem = (i: number, patch: any) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const inputCls = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 z-10">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{checklist.kind === 'MOVE_IN' ? 'Move-in' : 'Move-out'} checklist</h3>
            <p className="text-xs text-gray-400">{editable ? 'Record the condition of each item. The resident will be asked to confirm.' : `Sent to resident · ${checklist.status.toLowerCase()}`}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-5">
          {checklist.residentComment && (
            <div className="bg-amber-50 text-amber-800 text-sm rounded-xl px-4 py-3"><b>Resident's concern:</b> {checklist.residentComment}</div>
          )}
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={it.key} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <input value={it.label} disabled={!editable} onChange={(e) => setItem(i, { label: e.target.value })}
                    className="flex-1 min-w-[10rem] text-sm font-semibold text-gray-800 bg-transparent focus:outline-none" aria-label="Item name" />
                  {before[it.key] && checklist.kind === 'MOVE_OUT' && <span className="text-[11px] text-gray-400">at move-in: {before[it.key].toLowerCase()}</span>}
                  {editable && <button onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} aria-label="Remove item" className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>}
                </div>
                <div className="flex gap-1 flex-wrap mt-2">
                  {CONDITIONS.map(([k, l]) => (
                    <button key={k} type="button" disabled={!editable} onClick={() => setItem(i, { condition: k })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${it.condition === k ? COND_STYLE[k] : 'border-gray-100 text-gray-400'}`}>{l}</button>
                  ))}
                </div>
                {(it.condition === 'DAMAGED' || it.condition === 'MISSING' || it.condition === 'FAIR' || it.note) && (
                  <input value={it.note ?? ''} disabled={!editable} onChange={(e) => setItem(i, { note: e.target.value })} placeholder="What's wrong?" maxLength={300}
                    className={inputCls + ' mt-2'} />
                )}
              </div>
            ))}
            {editable && (
              <button onClick={() => setItems((xs) => [...xs, { key: `custom${Date.now()}`, label: 'New item', condition: 'GOOD', note: null }])}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-600"><Plus size={13} /> Add item</button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-500">Keys handed over
              <input type="number" min={0} max={20} value={keys} disabled={!editable} onChange={(e) => setKeys(e.target.value)} className={inputCls + ' mt-1'} />
            </label>
            <label className="text-xs font-semibold text-gray-500">Electricity meter reading
              <input value={meter} disabled={!editable} onChange={(e) => setMeter(e.target.value)} maxLength={30} className={inputCls + ' mt-1'} />
            </label>
          </div>
          <label className="block text-xs font-semibold text-gray-500">Notes
            <textarea value={notes} disabled={!editable} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} className={inputCls + ' mt-1 resize-none'} />
          </label>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-gray-500 flex-1">Photos ({photos.length}/15)</p>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple hidden onChange={(e) => onFiles(e.target.files)} />
              {editable && (
                <button onClick={() => fileRef.current?.click()} disabled={uploading || photos.length >= 15}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  <Camera size={13} /> {uploading ? 'Uploading…' : 'Add photos'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((p) => (
                <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {p.url && <img src={p.url} alt={p.caption ?? 'Checklist photo'} className="w-full h-full object-cover" />}
                  {editable && (
                    <button onClick={async () => { try { await deleteChecklistPhoto(p.id); setPhotos((x) => x.filter((y) => y.id !== p.id)) } catch (e) { err(e, 'Could not delete.') } }}
                      aria-label="Delete photo" className="absolute top-1 right-1 w-6 h-6 rounded-md bg-black/50 text-white flex items-center justify-center"><Trash2 size={11} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {editable && (
            <div className="flex gap-2 sticky bottom-0 bg-white py-3">
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60">
                {saveMut.isPending ? 'Saving…' : 'Save draft'}
              </button>
              <button onClick={() => submitMut.mutate()} disabled={submitMut.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-60">
                <Send size={14} /> {submitMut.isPending ? 'Sending…' : 'Send to resident'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
