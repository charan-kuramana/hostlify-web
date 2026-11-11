import { useNavigate } from 'react-router-dom'
import { BedDouble, Compass, CalendarClock } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'

/**
 * Shown on resident-only pages (complaints, leave, menu, …) when the hosteller
 * has no active stay yet — i.e. registered but no booking approved.
 */
export default function NoStay({ title, subtitle }: { title: string; subtitle?: string }) {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
          <BedDouble size={26} className="text-brand-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-800">Available once you move in</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm">
            This section unlocks after a hostel approves your booking. Find a hostel and request a bed to get started.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => navigate('/app/discover')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient hover:opacity-90 transition-opacity"
          >
            <Compass size={15} /> Discover Hostels
          </button>
          <button
            onClick={() => navigate('/app/booking-status')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-brand-600 border border-brand-200 hover:bg-brand-50 transition-colors"
          >
            <CalendarClock size={15} /> Booking Status
          </button>
        </div>
      </div>
    </div>
  )
}
