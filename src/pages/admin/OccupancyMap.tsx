import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { getHostelStructure } from '../../api/staff'
import { useAuthStore } from '../../store/authStore'

interface Bed {
  id: number
  status: 'occupied' | 'available' | 'reserved'
  member?: string
  bedName?: string
}

interface Room {
  number?: string
  roomNumber?: string
  type?: string
  beds: Bed[]
}

interface Floor {
  id: number
  name?: string
  floorName?: string
  rooms: Room[]
}

const STATUS_CONFIG = {
  occupied: { bg: 'bg-brand-100', text: 'text-brand-700', border: 'border-brand-200', dot: 'bg-brand-500', label: 'Occupied' },
  available: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Available' },
  reserved: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400', label: 'Reserved' },
}

function normalizeBedStatus(status: string): 'occupied' | 'available' | 'reserved' {
  if (status === 'OCCUPIED' || status === 'occupied') return 'occupied'
  if (status === 'RESERVED' || status === 'reserved') return 'reserved'
  return 'available'
}

function FloorCard({ floor }: { floor: Floor }) {
  const allBeds = (floor.rooms ?? []).flatMap((r) => r.beds ?? [])
  const totalBeds = allBeds.length
  const occupiedBeds = allBeds.filter((b) => normalizeBedStatus(b.status) === 'occupied').length
  const availableBeds = allBeds.filter((b) => normalizeBedStatus(b.status) === 'available').length
  const reservedBeds = allBeds.filter((b) => normalizeBedStatus(b.status) === 'reserved').length
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
  const floorName = floor.floorName ?? floor.name ?? `Floor ${floor.id}`

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Floor header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Building2 size={15} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">{floorName}</h3>
            <p className="text-xs text-gray-400">{(floor.rooms ?? []).length} rooms · {totalBeds} beds</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">{occupiedBeds} Occupied</span>
          <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{availableBeds} Available</span>
          {reservedBeds > 0 && (
            <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">{reservedBeds} Reserved</span>
          )}
        </div>
      </div>

      {/* Occupancy progress */}
      <div className="px-5 pt-3 pb-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400 font-medium">Occupancy</span>
          <span className="text-xs font-bold text-emerald-600">{occupancyPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${occupancyPct}%`, background: 'linear-gradient(90deg, #1d6ea8, #1a8fd1)' }}
          />
        </div>
      </div>

      {/* Room grid */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(floor.rooms ?? []).map((room) => {
          const roomNumber = room.roomNumber ?? room.number ?? '?'
          return (
            <div key={roomNumber} className="bg-gray-50 rounded-xl border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded-lg tracking-wider">
                  {roomNumber}
                </span>
                {room.type && (
                  <span className="text-xs text-gray-400 font-medium bg-white border border-gray-100 px-1.5 py-0.5 rounded-md">
                    {room.type}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                {(room.beds ?? []).map((bed) => {
                  const normalStatus = normalizeBedStatus(bed.status)
                  const cfg = STATUS_CONFIG[normalStatus]
                  return (
                    <div
                      key={bed.id}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <span className="truncate">{bed.member ?? bed.bedName ?? 'Bed'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OccupancyMap() {
  const { activeHostelId } = useAuthStore()

  const { data: floors = [], isLoading } = useQuery({
    queryKey: ['occupancy', activeHostelId],
    // /floors has no rooms/beds — the nested structure endpoint carries bed statuses
    queryFn: () => getHostelStructure(activeHostelId!),
    enabled: !!activeHostelId,
  })

  const allBeds = (floors as Floor[]).flatMap((f) => (f.rooms ?? []).flatMap((r) => r.beds ?? []))
  const totalBeds = allBeds.length
  const occupiedBeds = allBeds.filter((b) => normalizeBedStatus(b.status) === 'occupied').length
  const availableBeds = allBeds.filter((b) => normalizeBedStatus(b.status) === 'available').length

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Occupancy Map"
        subtitle={`${occupiedBeds} of ${totalBeds} beds occupied · ${availableBeds} available`}
      />

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Legend:</span>
        {(Object.entries(STATUS_CONFIG) as [keyof typeof STATUS_CONFIG, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => (
          <div
            key={key}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* Floor cards */}
      {(floors as Floor[]).length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center gap-2">
          <Building2 size={32} className="text-gray-300" />
          <p className="font-semibold text-gray-400 text-sm">No floor data available</p>
        </div>
      )}
      <div className="space-y-5">
        {(floors as Floor[]).map((floor) => (
          <FloorCard key={floor.id} floor={floor} />
        ))}
      </div>
    </div>
  )
}
