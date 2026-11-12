import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BedDouble, Building2, CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock, MapPin, MessageCircle, Navigation, Phone, Send } from 'lucide-react'
import PublicShell from '../../components/public/PublicShell'
import { HOSTEL_TYPE_LABEL, ROOM_TYPE_LABEL } from '../../lib/listing'
import { getPublicHostel, sendEnquiry } from '../../api/public'
import { useSeo } from '../../lib/seo'
import { inr, whatsappLink } from '../../lib/payments'

type Mode = 'enquire' | 'visit' | 'waitlist'
const SLOTS = [['MORNING', 'Morning (9–12)'], ['AFTERNOON', 'Afternoon (12–4)'], ['EVENING', 'Evening (4–8)']] as const
const today = () => new Date().toISOString().slice(0, 10)
const plusDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

export default function PublicHostelDetail() {
  const { slug = '' } = useParams()
  const { data: h, isLoading, isError } = useQuery({ queryKey: ['public-hostel', slug], queryFn: () => getPublicHostel(slug), retry: false })
  const [photoIdx, setPhotoIdx] = useState(0)

  const photos: { id: number; url: string; caption?: string }[] = (h?.photos ?? []).filter((p: any) => p.url)
  const pricing: any[] = h?.pricing ?? []
  const rents = pricing.map((p) => Number(p.baseRent)).filter((n) => n > 0)
  const minRent = rents.length ? Math.min(...rents) : Number(h?.defaultRent ?? 0)
  const freeBeds = Number(h?.totalAvailableBeds ?? 0)
  const address = h ? [h.address, h.city, h.pincode].filter(Boolean).join(', ') : ''

  const jsonLd = useMemo(() => !h ? null : ({
    '@context': 'https://schema.org',
    '@type': 'Hostel',
    name: h.name,
    description: h.about ?? undefined,
    image: photos.map((p) => p.url),
    telephone: h.contactPhone ?? undefined,
    address: { '@type': 'PostalAddress', streetAddress: h.address, addressLocality: h.city, postalCode: h.pincode, addressCountry: 'IN' },
    geo: h.latitude && h.longitude ? { '@type': 'GeoCoordinates', latitude: Number(h.latitude), longitude: Number(h.longitude) } : undefined,
    priceRange: rents.length ? `₹${Math.min(...rents)}–₹${Math.max(...rents)} per month` : undefined,
    amenityFeature: (h.amenities ?? []).map((a: string) => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })),
    url: window.location.href,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [h])

  useSeo({
    title: h ? `${h.name}, ${h.landmark ? h.landmark + ', ' : ''}${h.city} | ${HOSTEL_TYPE_LABEL[h.hostelType] ?? ''} Hostel from ${inr(minRent)}` : 'Hostel | Hostlify',
    description: h ? `${h.name} in ${h.city}: ${HOSTEL_TYPE_LABEL[h.hostelType] ?? ''} hostel/PG, rent from ${inr(minRent)}/month. ${freeBeds > 0 ? `${freeBeds} beds available.` : 'Join the waitlist.'} ${(h.amenities ?? []).slice(0, 5).join(', ')}. Enquire or book a free visit.` : undefined,
    image: photos[0]?.url,
    jsonLd,
  })

  if (isLoading) {
    return <PublicShell><div className="flex justify-center py-24"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div></PublicShell>
  }
  if (isError || !h) {
    return (
      <PublicShell>
        <div className="text-center py-20">
          <Building2 size={32} className="mx-auto text-gray-300" />
          <p className="font-semibold text-gray-700 mt-3">This hostel isn't listed right now</p>
          <Link to="/hostels" className="inline-block mt-4 text-sm font-semibold text-brand-600">Browse other hostels →</Link>
        </div>
      </PublicShell>
    )
  }

  const idx = photos.length ? photoIdx % photos.length : 0
  const mapSrc = h.latitude && h.longitude ? `https://maps.google.com/maps?q=${h.latitude},${h.longitude}&z=15&output=embed` : null
  const directions = h.latitude && h.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ', ' + address)}`

  return (
    <PublicShell>
      <Link to={`/hostels?city=${encodeURIComponent(h.city)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-brand-600 mb-3">
        <ArrowLeft size={13} /> Hostels in {h.city}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          {/* Gallery */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="aspect-[16/9] bg-gray-100 relative">
              {photos.length ? (
                <>
                  <img src={photos[idx].url} alt={photos[idx].caption || h.name} className="w-full h-full object-cover" />
                  {photos.length > 1 && (
                    <>
                      <button aria-label="Previous photo" onClick={() => setPhotoIdx((idx - 1 + photos.length) % photos.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center"><ChevronLeft size={18} /></button>
                      <button aria-label="Next photo" onClick={() => setPhotoIdx((idx + 1) % photos.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center"><ChevronRight size={18} /></button>
                    </>
                  )}
                  {photos[idx].caption && <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded-lg">{photos[idx].caption}</span>}
                  <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-1 rounded-lg">{idx + 1}/{photos.length}</span>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Building2 size={40} className="text-gray-300" /></div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 p-2 overflow-x-auto">
                {photos.map((p, i) => (
                  <button key={p.id} onClick={() => setPhotoIdx(i)} aria-label={`Photo ${i + 1}`}
                    className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 ${i === idx ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={p.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{HOSTEL_TYPE_LABEL[h.hostelType] ?? h.hostelType}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${freeBeds > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {freeBeds > 0 ? `${freeBeds} bed${freeBeds !== 1 ? 's' : ''} available` : 'Currently full'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-2 tracking-tight">{h.name}</h1>
            <p className="text-sm text-gray-500 flex items-start gap-1 mt-1"><MapPin size={14} className="mt-0.5 shrink-0" /> {address}{h.landmark ? ` (near ${h.landmark})` : ''}</p>
            <p className="mt-3 text-lg font-bold text-gray-900">{inr(minRent)}<span className="text-sm font-normal text-gray-400"> /month onwards</span></p>
            {h.about && <p className="text-sm text-gray-600 mt-3 whitespace-pre-line leading-relaxed">{h.about}</p>}
          </div>

          {/* Rooms & rent */}
          {pricing.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800">Rooms & rent</h2>
              <div className="mt-3 divide-y divide-gray-50">
                {pricing.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="flex items-center gap-2 text-gray-700"><BedDouble size={15} className="text-gray-400" /> {ROOM_TYPE_LABEL(p.roomType)}</span>
                    <span className="text-right">
                      <span className="font-bold text-gray-900">{inr(p.baseRent)}</span><span className="text-xs text-gray-400">/month</span>
                      {Number(p.depositMonths) > 0 && <span className="block text-[11px] text-gray-400">Deposit: {p.depositMonths} month{Number(p.depositMonths) !== 1 ? 's' : ''}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amenities */}
          {(h.amenities ?? []).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {h.amenities.map((a: string) => (
                  <span key={a} className="flex items-center gap-1.5 text-sm text-gray-600"><CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> {a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 flex items-center gap-3">
              <h2 className="font-bold text-gray-800">Location</h2>
              <a href={directions} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-600"><Navigation size={13} /> Directions</a>
            </div>
            {mapSrc ? (
              <iframe title={`Map of ${h.name}`} src={mapSrc} className="w-full h-72 border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            ) : (
              <p className="px-5 pb-5 text-sm text-gray-500">{address}</p>
            )}
          </div>
        </div>

        {/* Sticky enquiry card */}
        <aside className="lg:sticky lg:top-20 space-y-3">
          <EnquiryCard slug={slug} hostelName={h.name} pricing={pricing} full={freeBeds <= 0} />
          {h.contactPhone && (
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:${h.contactPhone.replace(/\s/g, '')}`} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"><Phone size={14} /> Call</a>
              <a href={whatsappLink(h.contactPhone, `Hi, I found ${h.name} on Hostlify. Is a bed available?`)} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"><MessageCircle size={14} /> WhatsApp</a>
            </div>
          )}
        </aside>
      </div>
    </PublicShell>
  )
}

function EnquiryCard({ slug, hostelName, pricing, full }: { slug: string; hostelName: string; pricing: any[]; full: boolean }) {
  const [mode, setMode] = useState<Mode>(full ? 'waitlist' : 'visit')
  const [f, setF] = useState({ name: '', mobile: '', email: '', gender: '', roomType: '', moveInDate: '', visitDate: plusDays(1), visitSlot: 'EVENING', message: '', website: '' })
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (f.name.trim().length < 2) return setErr('Please enter your name.')
    if (!/^(\+?91[\s-]?)?0?[6-9]\d{4}[\s-]?\d{5}$/.test(f.mobile.trim())) return setErr('Enter a valid 10-digit mobile number.')
    if (mode === 'visit' && !f.visitDate) return setErr('Pick a date for your visit.')
    setErr(null)
    setSending(true)
    try {
      const msg = await sendEnquiry(slug, {
        name: f.name, mobile: f.mobile, email: f.email || undefined, gender: f.gender || undefined,
        roomType: f.roomType || undefined, moveInDate: f.moveInDate || undefined, message: f.message || undefined,
        website: f.website, waitlist: mode === 'waitlist',
        ...(mode === 'visit' ? { visitDate: f.visitDate, visitSlot: f.visitSlot } : {}),
      })
      setDone(msg)
    } catch (ex: any) {
      setErr(ex?.response?.data?.message ?? 'Could not send. Please try again or call the hostel.')
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto"><CheckCircle2 size={26} className="text-emerald-500" /></div>
        <p className="font-bold text-gray-900 mt-3">Request sent</p>
        <p className="text-sm text-gray-500 mt-1">{done}</p>
      </div>
    )
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white'
  const tabs: [Mode, string, typeof Send][] = full
    ? [['waitlist', 'Join waitlist', Clock], ['enquire', 'Ask a question', Send]]
    : [['visit', 'Book a visit', CalendarCheck], ['enquire', 'Ask a question', Send]]

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3" noValidate>
      <div>
        <p className="font-bold text-gray-900">{full ? `${hostelName} is full right now` : `Interested in ${hostelName}?`}</p>
        <p className="text-xs text-gray-400 mt-0.5">{full ? "Join the waitlist and you'll be contacted when a bed is free." : 'Free, no brokerage. The owner contacts you directly.'}</p>
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(([k, l, Icon]) => (
          <button key={k} type="button" onClick={() => setMode(k)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold ${mode === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            <Icon size={12} /> {l}
          </button>
        ))}
      </div>

      <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" autoComplete="name" className={inputCls} aria-label="Your name" />
      <input value={f.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="Mobile number" inputMode="tel" autoComplete="tel" className={inputCls} aria-label="Mobile number" />
      <input value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="Email (optional, for confirmation)" type="email" autoComplete="email" className={inputCls} aria-label="Email" />
      <div className="grid grid-cols-2 gap-2">
        <select value={f.roomType} onChange={(e) => set('roomType', e.target.value)} className={inputCls} aria-label="Room type">
          <option value="">Room type</option>
          {pricing.map((p) => <option key={p.id} value={p.roomType}>{ROOM_TYPE_LABEL(p.roomType)}</option>)}
        </select>
        <select value={f.gender} onChange={(e) => set('gender', e.target.value)} className={inputCls} aria-label="Gender">
          <option value="">Gender</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {mode === 'visit' ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] font-semibold text-gray-500">Visit date
            <input type="date" min={today()} max={plusDays(30)} value={f.visitDate} onChange={(e) => set('visitDate', e.target.value)} className={inputCls + ' mt-1'} />
          </label>
          <label className="text-[11px] font-semibold text-gray-500">Time
            <select value={f.visitSlot} onChange={(e) => set('visitSlot', e.target.value)} className={inputCls + ' mt-1'}>
              {SLOTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        </div>
      ) : (
        <label className="block text-[11px] font-semibold text-gray-500">Move-in date (optional)
          <input type="date" min={today()} value={f.moveInDate} onChange={(e) => set('moveInDate', e.target.value)} className={inputCls + ' mt-1'} />
        </label>
      )}

      <textarea value={f.message} onChange={(e) => set('message', e.target.value)} rows={2} maxLength={1000}
        placeholder={mode === 'enquire' ? 'Your question' : 'Anything we should know? (optional)'} className={inputCls + ' resize-none'} aria-label="Message" />

      {/* Honeypot: hidden from people, filled by bots */}
      <input value={f.website} onChange={(e) => set('website', e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
        className="absolute -left-[9999px] w-px h-px opacity-0" />

      {err && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
      <button type="submit" disabled={sending} className="w-full py-3 rounded-xl text-sm font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-60">
        {sending ? 'Sending…' : mode === 'visit' ? 'Request visit' : mode === 'waitlist' ? 'Join waitlist' : 'Send enquiry'}
      </button>
      <p className="text-[11px] text-gray-400 text-center">Your number is shared only with this hostel.</p>
    </form>
  )
}
