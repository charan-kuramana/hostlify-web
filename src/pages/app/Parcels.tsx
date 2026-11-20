import { useQuery } from '@tanstack/react-query'
import { Package, PackageCheck } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import NoStay from './NoStay'
import { useAuthStore } from '../../store/authStore'
import { fmtDateTime, getMyParcels } from '../../api/ops'

export default function Parcels() {
  const { hostelId } = useAuthStore()
  const { data = [], isLoading } = useQuery({ queryKey: ['my-parcels'], queryFn: getMyParcels, enabled: !!hostelId, refetchInterval: 120_000 })
  if (!hostelId) return <NoStay title="Parcels" subtitle="Deliveries received at the desk" />
  const waiting = (data as any[]).filter((p) => p.status === 'WAITING')
  const collected = (data as any[]).filter((p) => p.status !== 'WAITING')
  return (
    <div className="space-y-5">
      <PageHeader title="Parcels" subtitle="Deliveries received for you at the hostel desk" count={waiting.length} />
      {isLoading ? <p className="text-sm text-gray-400">Loading…</p> : (
        <>
          {waiting.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400"><Package className="mx-auto mb-2 text-gray-300" />Nothing waiting for you.</div>
          ) : waiting.map((p) => (
            <div key={p.id} className="bg-amber-50 rounded-2xl p-4 flex items-center gap-3">
              <Package className="text-amber-600 shrink-0" />
              <div className="flex-1"><p className="font-semibold text-gray-800">{p.courier ?? 'Parcel'}{p.description ? ` · ${p.description}` : ''}</p>
                <p className="text-xs text-gray-600">Waiting at the desk since {fmtDateTime(p.receivedAt)}{p.shelf ? ` · shelf ${p.shelf}` : ''}</p></div>
            </div>
          ))}
          {collected.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-700 mb-2">Collected</h3>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {collected.map((p) => (
                  <div key={p.id} className="px-4 py-2.5 text-sm text-gray-600 flex items-center gap-2"><PackageCheck size={14} className="text-emerald-500" />
                    <span className="flex-1">{p.courier ?? 'Parcel'} · {fmtDateTime(p.collectedAt)}{p.collectedByName ? ` by ${p.collectedByName}` : ''}</span></div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
