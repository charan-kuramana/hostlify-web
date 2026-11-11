import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MapPin, Search, Building2, BedDouble, IndianRupee, Compass } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { getNearbyHostels, searchHostels } from '../../api/hosteller'

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
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  MALE:    { label: 'Male',   cls: 'bg-blue-100 text-blue-700' },
  FEMALE:  { label: 'Female', cls: 'bg-pink-100 text-pink-700' },
  'CO-ED': { label: 'Co-ed',  cls: 'bg-purple-100 text-purple-700' },
  COED:    { label: 'Co-ed',  cls: 'bg-purple-100 text-purple-700' },
  // values actually stored by the API (hostel.hostelType)
  BOYS:    { label: 'Boys',   cls: 'bg-blue-100 text-blue-700' },
  GIRLS:   { label: 'Girls',  cls: 'bg-pink-100 text-pink-700' },
  MIXED:   { label: 'Co-ed',  cls: 'bg-purple-100 text-purple-700' },
}

function HostelCardItem({ hostel, onView }: { hostel: HostelCard; onView: () => void }) {
  const typeKey = (hostel.hostelType ?? hostel.type ?? '').toUpperCase()
  const typeBadge = TYPE_BADGE[typeKey]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-brand-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 text-sm">{hostel.name}</p>
              {typeBadge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeBadge.cls}`}>
                  {typeBadge.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={11} className="text-gray-400" />
              <p className="text-xs text-gray-400">{hostel.city}</p>
              {hostel.distanceKm != null && (
                <span className="text-xs text-gray-400 ml-1">· {hostel.distanceKm.toFixed(1)} km away</span>
              )}
            </div>
          </div>
        </div>
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
            <span key={a} className="text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100 px-2 py-0.5 rounded-full capitalize">
              {a}
            </span>
          ))}
          {hostel.amenities.length > 5 && (
            <span className="text-xs text-gray-400 px-1">+{hostel.amenities.length - 5} more</span>
          )}
        </div>
      )}

      <button
        onClick={onView}
        className="mt-auto w-full py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
      >
        View Details
      </button>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )
}

function NearbyTab() {
  const navigate = useNavigate()
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [requested, setRequested] = useState(false)

  function requestLocation() {
    setRequested(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError('Unable to get your location. Please allow location access and try again.'),
    )
  }

  const { data: hostels = [], isLoading } = useQuery({
    queryKey: ['nearby-hostels', coords?.lat, coords?.lng],
    queryFn: () => getNearbyHostels(coords!.lat, coords!.lng),
    enabled: !!coords,
  })

  if (!requested) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
          <Compass size={26} className="text-brand-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-800">Find hostels near you</p>
          <p className="text-sm text-gray-400 mt-1">We need your location to show nearby hostels</p>
        </div>
        <button
          onClick={requestLocation}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
        >
          Use My Location
        </button>
      </div>
    )
  }

  if (geoError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <MapPin size={32} className="text-red-300" />
        <p className="text-sm text-red-500 font-medium">{geoError}</p>
        <button onClick={requestLocation} className="text-sm text-brand-600 font-semibold hover:underline">
          Try again
        </button>
      </div>
    )
  }

  if (isLoading) return <Spinner />

  if ((hostels as HostelCard[]).length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Building2 size={32} className="text-gray-200" />
        <p className="text-sm text-gray-400 font-medium">No hostels found nearby</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {(hostels as HostelCard[]).map((h) => (
        <HostelCardItem key={h.id} hostel={h} onView={() => navigate(`/app/hostel/${h.id}`)} />
      ))}
    </div>
  )
}

function SearchTab() {
  const navigate = useNavigate()
  const [city, setCity] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)

  const { data: hostels = [], isLoading } = useQuery({
    queryKey: ['search-hostels', submitted],
    queryFn: () => searchHostels(submitted ?? undefined),
    enabled: submitted !== null,
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(city.trim())
  }

  function handleBrowseAll() {
    setCity('')
    setSubmitted('')
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by city (e.g. Hyderabad)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
          style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
        >
          Search
        </button>
        <button
          type="button"
          onClick={handleBrowseAll}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-brand-600 border border-brand-200 hover:bg-brand-50 transition-colors shrink-0"
        >
          Browse All
        </button>
      </form>

      {isLoading && <Spinner />}

      {!isLoading && submitted !== null && (hostels as HostelCard[]).length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Building2 size={26} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-500 font-semibold">
            {submitted ? `No hostels found for "${submitted}"` : 'No hostels found'}
          </p>
          <p className="text-xs text-gray-400">Try a different city or browse all available hostels</p>
        </div>
      )}

      {!isLoading && submitted !== null && (hostels as HostelCard[]).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(hostels as HostelCard[]).map((h) => (
            <HostelCardItem key={h.id} hostel={h} onView={() => navigate(`/app/hostel/${h.id}`)} />
          ))}
        </div>
      )}

      {submitted === null && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Search size={26} className="text-brand-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">Search for your ideal hostel</p>
            <p className="text-sm text-gray-400 mt-1">Enter a city name above or click "Browse All" to see all hostels</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HostelDiscovery() {
  const [activeTab, setActiveTab] = useState<'nearby' | 'search'>('nearby')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discover Hostels"
        subtitle="Find and book your perfect hostel stay"
      />

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['nearby', 'search'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'nearby' ? <><MapPin size={14} /> Nearby</> : <><Search size={14} /> Search</>}
          </button>
        ))}
      </div>

      {activeTab === 'nearby' ? <NearbyTab /> : <SearchTab />}
    </div>
  )
}
