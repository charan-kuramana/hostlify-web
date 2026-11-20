import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, Globe, ImagePlus, Star, Trash2, X } from 'lucide-react'
import { deleteListingPhoto, getListing, reorderListingPhotos, setCoverPhoto, updateListing, updatePhotoCaption, uploadListingPhoto } from '../../api/staff'
import { useToastStore } from '../../store/toastStore'

const CHECKS: [string, string][] = [
  ['photos', 'At least one photo (5+ recommended)'],
  ['about', 'An "About" description (General tab / Hostel Setup)'],
  ['location', 'Map location (latitude/longitude in Hostel Setup)'],
  ['phone', 'Contact phone number (General tab)'],
]

/** Settings → Public Listing: publish switch, public link, checklist and the photo gallery. */
export default function ListingSettingsPanel({ hostelId }: { hostelId: number }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const key = ['listing', hostelId]
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => getListing(hostelId) })
  const refresh = () => qc.invalidateQueries({ queryKey: key })
  const err = (e: any, f: string) => show('error', 'Failed', e?.response?.data?.message ?? f)

  const publishMut = useMutation({
    mutationFn: (body: { listingEnabled?: boolean; slug?: string }) => updateListing(hostelId, body),
    onSuccess: (d) => { qc.setQueryData(key, d); setEditingSlug(null); show('success', 'Saved', d.listingEnabled ? 'Your hostel page is live.' : 'Your hostel page is hidden.') },
    onError: (e) => err(e, 'Could not update the listing.'),
  })
  const coverMut = useMutation({ mutationFn: setCoverPhoto, onSuccess: refresh, onError: (e) => err(e, 'Could not set cover.') })
  const deleteMut = useMutation({ mutationFn: deleteListingPhoto, onSuccess: refresh, onError: (e) => err(e, 'Could not delete.') })
  const orderMut = useMutation({ mutationFn: (ids: number[]) => reorderListingPhotos(hostelId, ids), onSuccess: refresh, onError: (e) => err(e, 'Could not reorder.') })
  const captionMut = useMutation({
    mutationFn: ({ id, caption }: { id: number; caption: string }) => updatePhotoCaption(id, caption),
    onSuccess: () => { refresh(); show('success', 'Saved', 'Caption updated.') },
    onError: (e) => err(e, 'Could not save caption.'),
  })

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    const list = Array.from(files)
    setUploading(list.length)
    let okCount = 0
    for (const f of list) {
      if (f.size > 5 * 1024 * 1024) { show('error', 'Too large', `${f.name} is over 5 MB.`); setUploading((n) => n - 1); continue }
      try { await uploadListingPhoto(hostelId, f); okCount++ } catch (e: any) { err(e, `Could not upload ${f.name}.`) }
      setUploading((n) => n - 1)
    }
    if (fileRef.current) fileRef.current.value = ''
    refresh()
    if (okCount) show('success', 'Uploaded', `${okCount} photo${okCount !== 1 ? 's' : ''} added.`)
  }

  if (isLoading || !data) return <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>

  const photos: any[] = data.photos ?? []
  const move = (i: number, d: number) => {
    const ids = photos.map((p) => p.id)
    const j = i + d
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    orderMut.mutate(ids)
  }
  const ready = Object.values(data.checklist ?? {}).filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><Globe size={15} className="text-brand-600" /></div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-sm">Public hostel page</h3>
            <p className="text-xs text-gray-400 mt-0.5">When it's on, anyone can find your hostel on Google and Hostlify, see photos, rent and free beds, and send you an enquiry or book a visit. It's free.</p>
          </div>
          <button type="button" role="switch" aria-checked={data.listingEnabled} aria-label="Publish hostel page" disabled={publishMut.isPending}
            onClick={() => publishMut.mutate({ listingEnabled: !data.listingEnabled })}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${data.listingEnabled ? 'bg-brand-600' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${data.listingEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap bg-gray-50 rounded-xl px-3 py-2">
          {editingSlug === null ? (
            <>
              <span className="text-xs font-mono text-gray-600 break-all">{data.publicUrl}</span>
              <button type="button" onClick={() => { navigator.clipboard?.writeText(data.publicUrl); show('success', 'Copied', 'Link copied. Share it on WhatsApp or Google Business.') }}
                className="text-gray-400 hover:text-brand-600" aria-label="Copy link"><Copy size={13} /></button>
              {data.listingEnabled && <a href={data.publicUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600" aria-label="Open page"><ExternalLink size={13} /></a>}
              <button type="button" onClick={() => setEditingSlug(data.slug)} className="ml-auto text-xs font-semibold text-brand-600">Change link</button>
            </>
          ) : (
            <>
              <span className="text-xs text-gray-400">…/hostels/</span>
              <input value={editingSlug} onChange={(e) => setEditingSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className="flex-1 min-w-[10rem] px-2 py-1 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-400" />
              <button type="button" onClick={() => publishMut.mutate({ slug: editingSlug })} className="text-emerald-600" aria-label="Save link"><Check size={15} /></button>
              <button type="button" onClick={() => setEditingSlug(null)} className="text-gray-400" aria-label="Cancel"><X size={15} /></button>
            </>
          )}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500">Listing checklist ({ready}/{CHECKS.length})</p>
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {CHECKS.map(([k, l]) => (
              <li key={k} className={`text-xs flex items-center gap-1.5 ${data.checklist?.[k] ? 'text-emerald-700' : 'text-gray-400'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${data.checklist?.[k] ? 'bg-emerald-100' : 'bg-gray-100'}`}>{data.checklist?.[k] && <Check size={10} />}</span> {l}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 text-sm">Photos ({photos.length}/{data.maxPhotos})</h3>
            <p className="text-xs text-gray-400 mt-0.5">Bright, wide photos of rooms, beds, bathroom, dining and the building front get the most enquiries. JPG/PNG/WebP up to 5 MB.</p>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading > 0 || photos.length >= data.maxPhotos}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-60">
            <ImagePlus size={14} /> {uploading > 0 ? `Uploading ${uploading}…` : 'Add photos'}
          </button>
        </div>

        {photos.length === 0 ? (
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-12 text-sm text-gray-400 hover:border-brand-300 hover:text-brand-600">
            Add your first photo. It becomes the cover shown in search results.
          </button>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((p, i) => (
              <div key={p.id} className={`rounded-xl border overflow-hidden ${p.cover ? 'border-brand-400 ring-2 ring-brand-100' : 'border-gray-100'}`}>
                <div className="aspect-[4/3] bg-gray-100 relative">
                  {p.url ? <img src={p.url} alt={p.caption ?? ''} className="w-full h-full object-cover" /> : null}
                  {p.cover && <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-brand-600 text-white px-1.5 py-0.5 rounded">COVER</span>}
                </div>
                <div className="p-2 space-y-1.5">
                  <input defaultValue={p.caption ?? ''} placeholder="Caption, e.g. Double room" maxLength={150}
                    onBlur={(e) => { if ((e.target.value || '') !== (p.caption ?? '')) captionMut.mutate({ id: p.id, caption: e.target.value }) }}
                    className="w-full px-2 py-1 rounded-lg border border-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move left" className="w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-500 disabled:opacity-30"><ArrowUp size={12} className="-rotate-90" /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label="Move right" className="w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-500 disabled:opacity-30"><ArrowDown size={12} className="-rotate-90" /></button>
                    {!p.cover && <button type="button" onClick={() => coverMut.mutate(p.id)} title="Make cover" className="w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-500 hover:text-amber-500"><Star size={12} /></button>}
                    <button type="button" onClick={() => { if (confirm('Delete this photo?')) deleteMut.mutate(p.id) }} aria-label="Delete photo"
                      className="ml-auto w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
