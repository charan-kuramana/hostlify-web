import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SprayCan, Clock, CheckCircle2 } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import { getHostelCleaning, updateCleaningStatus } from '../../api/staff'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'

const AVATAR_COLORS = [
  'bg-brand-500', 'bg-emerald-500', 'bg-purple-500',
  'bg-rose-500', 'bg-amber-500', 'bg-teal-500',
]

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

type TabType = 'PENDING' | 'SCHEDULED' | 'COMPLETED'

export default function Cleaning() {
  const { activeHostelId } = useAuthStore()
  const queryClient = useQueryClient()
  const { show } = useToastStore()
  const [activeTab, setActiveTab] = useState<TabType>('PENDING')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['cleaning', activeHostelId],
    queryFn: () => getHostelCleaning(activeHostelId!),
    enabled: !!activeHostelId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateCleaningStatus(id, status),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['cleaning', activeHostelId] })
      show('success', vars.status === 'COMPLETED' ? 'Marked complete' : 'Cleaning scheduled')
    },
    onError: (e: any) => show('error', 'Update failed', e?.response?.data?.message ?? 'Could not update the request.'),
  })

  const pending = requests.filter((r: any) => r.status === 'PENDING')
  const scheduled = requests.filter((r: any) => r.status === 'SCHEDULED')
  const completed = requests.filter((r: any) => r.status === 'COMPLETED')

  const tabItems: { key: TabType; label: string; count: number }[] = [
    { key: 'PENDING', label: 'Pending', count: pending.length },
    { key: 'SCHEDULED', label: 'Scheduled', count: scheduled.length },
    { key: 'COMPLETED', label: 'Completed', count: completed.length },
  ]

  const displayed = requests.filter((r: any) => r.status === activeTab)

  function handleSchedule(id: number) {
    updateMut.mutate({ id, status: 'SCHEDULED' })
  }

  function handleComplete(id: number) {
    updateMut.mutate({ id, status: 'COMPLETED' })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cleaning Requests"
        subtitle={`${requests.length} total requests`}
        count={displayed.length}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pending"
          value={pending.length}
          sub="Awaiting schedule"
          icon={<Clock size={20} className="text-amber-600" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Scheduled"
          value={scheduled.length}
          sub="Cleaning assigned"
          icon={<SprayCan size={20} className="text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Completed"
          value={completed.length}
          sub="Cleaned successfully"
          icon={<CheckCircle2 size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === tab.key ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Request cards */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <SprayCan size={20} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-400 text-sm">No {activeTab.toLowerCase()} requests</p>
          <p className="text-xs text-gray-400">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((req: any, i: number) => (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                  {getInitials(req.hostellerName ?? req.memberName ?? '??')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{req.hostellerName ?? req.memberName}</p>
                      <span className="font-mono text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg tracking-wider">
                        {req.roomNumber ?? req.room ?? '—'}
                      </span>
                    </div>
                    <Badge status={req.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                    <span className="text-xs text-gray-400">Requested: <span className="font-medium text-gray-600">{(req.requestDate ?? req.createdAt) ? new Date(req.requestDate ?? req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></span>
                    {(req.timeSlot ?? req.preferredSlot) && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                        <Clock size={11} />
                        {req.timeSlot ?? req.preferredSlot}
                      </span>
                    )}
                  </div>
                  {req.notes && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{req.notes}</p>}
                  <div className="mt-3">
                    {req.status === 'PENDING' && (
                      <button
                        onClick={() => handleSchedule(req.id)}
                        disabled={updateMut.isPending}
                        className="px-4 py-1.5 rounded-xl text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
                      >
                        Schedule Cleaning
                      </button>
                    )}
                    {req.status === 'SCHEDULED' && (
                      <button
                        onClick={() => handleComplete(req.id)}
                        disabled={updateMut.isPending}
                        className="px-4 py-1.5 rounded-xl text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
                      >
                        Mark Complete
                      </button>
                    )}
                    {req.status === 'COMPLETED' && (
                      <span className="px-4 py-1.5 rounded-xl bg-gray-100 text-gray-400 text-xs font-semibold">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
