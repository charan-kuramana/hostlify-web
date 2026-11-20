import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Siren } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { getSafetySummary } from '../../api/staff'

/** Red banner on every staff page while a resident's SOS is open (polled; push alerts also go out). */
export default function SosBanner() {
  const { activeHostelId } = useAuthStore()
  const { pathname } = useLocation()
  const { data } = useQuery({
    queryKey: ['safety-summary', activeHostelId],
    queryFn: () => getSafetySummary(activeHostelId as number),
    enabled: !!activeHostelId,
    refetchInterval: 20000,
    refetchIntervalInBackground: true,
  })
  const live: any[] = data?.sos ?? []
  if (!live.length || pathname.startsWith('/admin/safety')) return null
  const first = live[0]
  return (
    <Link to="/admin/safety" className="mb-5 flex items-center gap-3 rounded-2xl bg-red-600 text-white px-4 py-3 shadow-lg animate-pulse">
      <Siren size={20} className="shrink-0" />
      <span className="text-sm font-bold flex-1">
        SOS: {first.resident?.name ?? 'A resident'}{first.resident?.room ? ` (room ${first.resident.room})` : ''}
        {first.status === 'ACKNOWLEDGED' ? ' — someone is responding' : ' needs help now'}
        {live.length > 1 ? ` · +${live.length - 1} more` : ''}
      </span>
      <span className="text-xs font-semibold underline shrink-0">Open</span>
    </Link>
  )
}
