import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, MapPin, Search, BedDouble } from 'lucide-react'
import PublicShell from '../../components/public/PublicShell'
import { HOSTEL_TYPE_LABEL } from '../../lib/listing'
import { getPublicCities, searchPublicHostels } from '../../api/public'
import { useSeo } from '../../lib/seo'
import { inr } from '../../lib/payments'

/** Public, no-login hostel search: /hostels?city=Vijayawada&type=GIRLS&maxRent=8000 */
export default function PublicHostels() {
  const [params, setParams] = useSearchParams()
  const city = params.get('city') ?? ''
  const type = params.get('type') ?? ''
  const maxRent = params.get('maxRent') ?? ''
  const q = params.get('q') ?? ''
  const [text, setText] = useState(q)

  const { data: cities = [] } = useQuery({ queryKey: ['public-cities'], queryFn: getPublicCities })
  const { data: hostels = [], isLoading, isError } = useQuery({
    queryKey: ['public-hostels', city, type, maxRent, q],
    queryFn: () => searchPublicHostels({ city: city || undefined, type: type || undefined, maxRent: maxRent ? Number(maxRent) : undefined, q: q || undefined }),
  })

  const place = city || 'your city'
  useSeo({
    title: `${type ? HOSTEL_TYPE_LABEL[type] + ' ' : ''}Hostels & PGs in ${place} | Hostlify`,
    description: `Find ${type ? HOSTEL_TYPE_LABEL[type].toLowerCase() + ' ' : ''}hostels and PGs in ${place} with photos, rent, amenities and live bed availability. Enquire or book a visit for free.`,
  })

  function set(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const selectCls = 'px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400'

  return (
    <PublicShell>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
        {type ? `${HOSTEL_TYPE_LABEL[type]} hostels` : 'Hostels & PGs'}{city ? ` in ${city}` : ''}
      </h1>
      <p className="text-sm text-gray-500 mt-1">Photos, rent and free beds, straight from the owners. No brokerage.</p>

      <form onSubmit={(e) => { e.preventDefault(); set('q', text.trim()) }}
        className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2">
        <div className="col-span-2 sm:col-span-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Area, landmark or hostel name"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <select value={city} onChange={(e) => set('city', e.target.value)} className={selectCls} aria-label="City">
          <option value="">All cities</option>
          {cities.map((c) => <option key={c.city} value={c.city}>{c.city} ({c.count})</option>)}
        </select>
        <select value={type} onChange={(e) => set('type', e.target.value)} className={selectCls} aria-label="Hostel type">
          <option value="">Boys / Girls / Co-ed</option>
          <option value="BOYS">Boys</option>
          <option value="GIRLS">Girls</option>
          <option value="MIXED">Co-ed</option>
        </select>
        <select value={maxRent} onChange={(e) => set('maxRent', e.target.value)} className={selectCls} aria-label="Budget">
          <option value="">Any budget</option>
          {[4000, 6000, 8000, 10000, 15000].map((r) => <option key={r} value={r}>Up to {inr(r)}</option>)}
        </select>
        <button type="submit" className="col-span-2 sm:col-span-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient hover:opacity-90">Search</button>
      </form>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>
        ) : isError ? (
          <p className="text-center text-sm text-gray-500 py-16">Couldn't load hostels. Please refresh the page.</p>
        ) : hostels.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={32} className="mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-600 mt-3">No hostels match your search</p>
            <p className="text-xs text-gray-400 mt-1">Try another area or a higher budget.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">{hostels.length} hostel{hostels.length !== 1 ? 's' : ''} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hostels.map((h) => (
                <Link key={h.id} to={`/hostels/${h.slug}`} className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-[16/10] bg-gray-100 relative">
                    {h.coverUrl
                      ? <img src={h.coverUrl} alt={`${h.name}, ${h.city}`} loading="lazy" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Building2 size={32} className="text-gray-300" /></div>}
                    <span className="absolute top-2 left-2 text-[11px] font-semibold bg-white/90 text-gray-700 px-2 py-0.5 rounded-full">{HOSTEL_TYPE_LABEL[h.hostelType] ?? h.hostelType}</span>
                  </div>
                  <div className="p-4">
                    <h2 className="font-bold text-gray-900 group-hover:text-brand-700">{h.name}</h2>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {[h.locality || h.landmark, h.city].filter(Boolean).join(', ')}</p>
                    <div className="flex items-end justify-between mt-3">
                      <div>
                        <p className="text-[11px] text-gray-400">Rent from</p>
                        <p className="font-bold text-gray-900">{h.minRent != null ? inr(h.minRent) : '—'}<span className="text-xs font-normal text-gray-400">/month</span></p>
                      </div>
                      <span className={`text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-lg ${h.availableBeds > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        <BedDouble size={12} /> {h.availableBeds > 0 ? `${h.availableBeds} bed${h.availableBeds !== 1 ? 's' : ''} free` : 'Full (waitlist)'}
                      </span>
                    </div>
                    {h.amenities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {h.amenities.slice(0, 4).map((a) => <span key={a} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a}</span>)}
                        {h.amenities.length > 4 && <span className="text-[11px] text-gray-400 px-1">+{h.amenities.length - 4}</span>}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </PublicShell>
  )
}
