import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MapPin, Search, Building2, BedDouble, IndianRupee, Navigation, LocateFixed, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { discoverHostels } from '../../api/hosteller'
import { directionsUrl } from '../../api/gateways'
import { SafetyBadges } from '../../components/stay/StayTerms'

type HostelCard = {
  id: number
  name: string
  city: string
  type?: string
  hostelType?: string
  distanceKm?: number
  availableBeds: number
  minRent?: number
  amenities?: string[]
  safetyFeatures?: string[]
  address?: string
  landmark?: string
  latitude?: number | null
  longitude?: number | null
}

type Coords = { lat: number; lng: number }

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  MALE:    { label: 'Male',   cls: 'bg-blue-100 text-blue-700' },
  FEMALE:  { label: 'Female', cls: 'bg-pink-100 text-pink-700' },
  'CO-ED': { label: 'Co-ed',  cls: 'bg-purple-100 text-purple-700' },
  COED:    { label: 'Co-ed',  cls: 'bg-purple-100 text-purple-700' },
  BOYS:    { label: 'Boys',   cls: 'bg-blue-100 text-blue-700' },
  GIRLS:   { label: 'Girls',  cls: 'bg-pink-100 text-pink-700' },
  MIXED:   { label: 'Co-ed',  cls: 'bg-purple-100 text-purple-700' },
}

// The last known location is remembered on this device so the list shows straight away next time.
const LOC_KEY = 'hostlify-last-location'
function cachedCoords(): Coords | null {
  try {
    const v = JSON.parse(localStorage.getItem(LOC_KEY) ?? 'null')
    return v && typeof v.lat === 'number' && typeof v.lng === 'number' ? { lat: v.lat, lng: v.lng } : null
  } catch { return null }
}
function saveCoords(c: Coords) {
  try { localStorage.setItem(LOC_KEY, JSON.stringify({ ...c, at: Date.now() })) } catch { /* private mode */ }
}

/** 0.45 → "450 m", 2.34 → "2.3 km" */
function fmtDistance(km: number) {
  return km < 1 ? `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m` : `${km.toFixed(1)} km`
}

function HostelCardItem({ hostel, onView }: { hostel: HostelCard; onView: () => void }) {
  const typeBadge = TYPE_BADGE[(hostel.hostelType ?? hostel.type ?? '').toUpperCase()]
  const dir = directionsUrl(hostel)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <Building2 size={18} className="text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">{hostel.name}</p>
            {typeBadge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeBadge.cls}`}>{typeBadge.label}</span>}
          </div>
          <div className="flex items-center gap-1 mt-0.5 min-w-0">
            <MapPin size={11} className="text-gray-400 shrink-0" />
            <p className="text-xs text-gray-400 truncate">{[hostel.landmark, hostel.city].filter(Boolean).join(', ')}</p>
          </div>
        </div>
        {hostel.distanceKm != null && (
          <span className="shrink-0 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg" title="Distance from you">
            {fmtDistance(hostel.distanceKm)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <BedDouble size={14} className="text-emerald-500" />
          <span className="text-xs font-semibold text-gray-700">{hostel.availableBeds} beds available</span>
        </div>
        {hostel.minRent != null && (
          <div className="flex items-center gap-1">
            <IndianRupee size={12} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-700">₹{Number(hostel.minRent).toLocaleString('en-IN')}<span className="font-normal text-gray-400">/mo</span></span>
          </div>
        )}
      </div>

      {hostel.amenities && hostel.amenities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hostel.amenities.slice(0, 5).map((a) => (
            <span key={a} className="text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100 px-2 py-0.5 rounded-full capitalize">{a}</span>
          ))}
          {hostel.amenities.length > 5 && <span className="text-xs text-gray-400 px-1">+{hostel.amenities.length - 5} more</span>}
        </div>
      )}

      <SafetyBadges features={hostel.safetyFeatures} max={3} />

      <div className="mt-auto flex gap-2">
        <button onClick={onView} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white brand-gradient hover:opacity-90 transition-opacity">
          View Details
        </button>
        {dir && (
          <a href={dir} target="_blank" rel="noopener noreferrer" title="Open directions in Google Maps"
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-brand-700 border border-brand-200 hover:bg-brand-50">
            <Navigation size={14} /> Directions
          </a>
        )}
      </div>
    </div>
  )
}

export default function HostelDiscovery() {
  const navigate = useNavigate()
  const [coords, setCoords] = useState<Coords | null>(cachedCoords)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')

  function locate(silent = false) {
    if (!navigator.geolocation) return
    if (!silent) { setLocating(true); setGeoError(null) }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        saveCoords(c)
        setCoords(c)
        setLocating(false)
      },
      () => {
        setLocating(false)
        if (!silent) setGeoError('Location is blocked. Allow it in your browser settings, or just search by area or city.')
      },
      { maximumAge: 5 * 60 * 1000, timeout: 15000 },
    )
  }

  // Once the browser already allows location, refresh it quietly on every visit — no button needed.
  useEffect(() => {
    let cancelled = false
    navigator.permissions?.query({ name: 'geolocation' as PermissionName })
      .then((p) => { if (!cancelled && p.state === 'granted') locate(true) })
      .catch(() => { /* older browsers: keep the cached location */ })
    return () => { cancelled = true }
  }, [])

  // Debounce typing
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 350)
    return () => clearTimeout(t)
  }, [input])

  const { data: hostels = [], isLoading } = useQuery<HostelCard[]>({
    queryKey: ['discover', q, coords?.lat?.toFixed(3), coords?.lng?.toFixed(3)],
    queryFn: () => discoverHostels(q, coords),
  })

  return (
    <div className="space-y-5">
      <PageHeader title="Discover Hostels" subtitle={coords && !q ? 'Hostels near you, nearest first' : 'Search by hostel name, area or city'} />

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search hostel, area or city (e.g. Benz Circle)"
          className="w-full pl-9 pr-10 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400" />
        {input && (
          <button onClick={() => setInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Clear search"><X size={15} /></button>
        )}
      </div>

      {!coords && (
        <div className="flex items-center gap-3 bg-brand-50/60 border border-brand-100 rounded-xl px-4 py-3 flex-wrap">
          <LocateFixed size={16} className="text-brand-600 shrink-0" />
          <p className="text-sm text-gray-700 flex-1 min-w-[12rem]">{geoError ?? 'Share your location once to see hostels near you and how far each one is.'}</p>
          <button onClick={() => locate()} disabled={locating} className="px-4 py-2 rounded-xl text-xs font-semibold text-white brand-gradient disabled:opacity-60">
            {locating ? 'Finding you…' : 'Use my location'}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>
      ) : hostels.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Building2 size={32} className="text-gray-200" />
          <p className="text-sm text-gray-500 font-semibold">{q ? `No hostels match "${q}"` : 'No hostels near you yet'}</p>
          <p className="text-xs text-gray-400">{q ? 'Try another area or city.' : 'Each hostel chooses how far away it is shown. Try searching your area or city.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostels.map((h) => <HostelCardItem key={h.id} hostel={h} onView={() => navigate(`/app/hostel/${h.id}`)} />)}
        </div>
      )}
    </div>
  )
}
