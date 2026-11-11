import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  MapPin,
  Phone,
  Building2,
  BedDouble,
  IndianRupee,
  Wifi,
  Wind,
  UtensilsCrossed,
  Car,
  Dumbbell,
  WashingMachine,
  Layers,
  CheckCircle2,
} from 'lucide-react'
import { getHostelDetail, getMyBooking } from '../../api/hosteller'

const AMENITY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  wifi:      { label: 'Wi-Fi',     icon: <Wifi size={14} /> },
  ac:        { label: 'AC',        icon: <Wind size={14} /> },
  food:      { label: 'Food',      icon: <UtensilsCrossed size={14} /> },
  parking:   { label: 'Parking',   icon: <Car size={14} /> },
  gym:       { label: 'Gym',       icon: <Dumbbell size={14} /> },
  laundry:   { label: 'Laundry',   icon: <WashingMachine size={14} /> },
}

const HOSTEL_TYPE_LABEL: Record<string, string> = { BOYS: 'Boys', GIRLS: 'Girls', MIXED: 'Co-ed', MALE: 'Boys', FEMALE: 'Girls', COED: 'Co-ed', 'CO-ED': 'Co-ed' }

function getAmenityMeta(key: string) {
  return AMENITY_META[key.toLowerCase()] ?? { label: key, icon: <CheckCircle2 size={14} /> }
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )
}

export default function HostelDetail() {
  const { hostelId } = useParams<{ hostelId: string }>()
  const navigate = useNavigate()
  const id = Number(hostelId)

  const { data: hostel, isLoading, isError } = useQuery({
    queryKey: ['hostel-detail', id],
    queryFn: () => getHostelDetail(id),
    enabled: !!id,
  })

  // An active resident can't book a second bed — show that instead of the booking CTA.
  const { data: activeBooking } = useQuery({ queryKey: ['my-booking-sync'], queryFn: getMyBooking, retry: false })

  if (isLoading) return <Spinner />

  if (isError || !hostel) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <Building2 size={36} className="text-gray-200" />
        <p className="font-semibold text-gray-400">Hostel not found</p>
        <button onClick={() => navigate(-1)} className="text-sm text-brand-600 font-semibold hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const enabledAmenities: { key: string; label?: string }[] = Array.isArray(hostel.amenities)
    ? hostel.amenities.filter((a: any) => a.enabled).map((a: any) => ({ key: String(a.key), label: a.label }))
    : []

  const pricing: any[] = hostel.pricingTiers ?? hostel.pricing ?? []
  const floors: any[] = hostel.floors ?? []

  return (
    <div className="space-y-6 pb-40 lg:pb-24">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0">
              <Building2 size={26} className="text-brand-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">{hostel.name}</h1>
                {(hostel.hostelType ?? hostel.type) && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                    {HOSTEL_TYPE_LABEL[hostel.hostelType ?? hostel.type] ?? (hostel.hostelType ?? hostel.type)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={13} className="text-gray-400" />
                <p className="text-sm text-gray-500">{hostel.address || hostel.city}</p>
              </div>
              {(hostel.contactPhone ?? hostel.phone) && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Phone size={13} className="text-gray-400" />
                  <p className="text-sm text-gray-500">{hostel.contactPhone ?? hostel.phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {hostel.about && (
          <p className="mt-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-4">
            {hostel.about}
          </p>
        )}
      </div>

      {/* Amenities */}
      {enabledAmenities.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {enabledAmenities.map(({ key, label }) => {
              const meta = getAmenityMeta(key)
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-100"
                >
                  {meta.icon}
                  {AMENITY_META[key.toLowerCase()] ? meta.label : (label ?? meta.label)}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Pricing */}
      {pricing.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">Pricing</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 rounded-xl">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide rounded-l-xl">Room Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Base Rent</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide rounded-r-xl">Deposit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pricing.map((tier: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 capitalize">{tier.roomType?.replace(/_/g, ' ') ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 text-gray-800 font-semibold">
                        <IndianRupee size={13} className="text-gray-500" />
                        {tier.baseRent != null ? Number(tier.baseRent).toLocaleString('en-IN') : '—'}
                        <span className="text-xs text-gray-400 font-normal ml-0.5">/mo</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {tier.depositMonths != null ? `${tier.depositMonths} month${tier.depositMonths !== 1 ? 's' : ''}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floors */}
      {floors.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">Floors & Availability</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {floors.map((floor: any) => (
              <div key={floor.floorId ?? floor.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                  <Layers size={15} className="text-brand-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{floor.floorName ?? floor.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <BedDouble size={11} className="text-gray-400" />
                    <p className="text-xs text-gray-500">
                      {floor.availableBeds ?? '?'}/{floor.totalBeds ?? '?'} beds
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {/* bottom-16 on mobile: sit above the bottom tab bar (z-40), which used to hide this CTA */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg z-30">
        <div className="max-w-screen-xl mx-auto">
          {activeBooking ? (
            <p className="text-center text-sm font-semibold text-gray-500 py-2">
              You already have an active stay{activeBooking.hostelId === id ? ' at this hostel' : ''} — contact your hostel to change beds.
            </p>
          ) : (
            <button
              onClick={() => navigate(`/app/hostel/${hostelId}/book`)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
            >
              Select Bed &amp; Book
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
