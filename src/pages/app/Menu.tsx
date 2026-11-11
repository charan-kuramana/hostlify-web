import { useQuery } from '@tanstack/react-query'
import { Coffee, Sun, Moon, UtensilsCrossed } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { getCurrentMenu, getMenuItems, retryUnless404, isNotFound } from '../../api/hosteller'
import NoStay from './NoStay'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const TODAY = new Date().toLocaleDateString('en-US', { weekday: 'long' })

export default function Menu() {
  const { hostelId } = useAuthStore()

  const { data: menu, isLoading: menuLoading, error: menuError } = useQuery({
    queryKey: ['current-menu', hostelId],
    queryFn: () => getCurrentMenu(hostelId!),
    enabled: !!hostelId,
    retry: retryUnless404,
  })

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['menu-items', menu?.id],
    queryFn: () => getMenuItems(menu!.id),
    enabled: !!menu?.id,
  })

  const isLoading = menuLoading || itemsLoading

  if (!hostelId) return <NoStay title="Weekly Menu" subtitle="Hostel mess schedule for this week" />

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  if (menuError && !isNotFound(menuError)) return <div className="text-center py-20 text-gray-400">Failed to load data</div>

  if (!menu) return (
    <div className="space-y-6">
      <PageHeader title="Weekly Menu" subtitle="Hostel mess schedule for this week" />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <UtensilsCrossed size={22} className="text-gray-300" />
        </div>
        <p className="font-semibold text-gray-500 text-sm">No menu available for this week</p>
        <p className="text-xs text-gray-400 mt-1">Check back later when the menu is updated</p>
      </div>
    </div>
  )

  // dayOfWeek may be stored as "Monday" or "MONDAY"
  const find = (day: string, meal: string) =>
    (items as any[] | undefined)?.find((i: any) => i.dayOfWeek?.toLowerCase() === day.toLowerCase() && i.mealType?.toUpperCase() === meal)
  const timing = (meal: string, fallback: string) =>
    (items as any[] | undefined)?.find((i: any) => i.mealType?.toUpperCase() === meal && i.timing)?.timing ?? fallback
  const menuRows = DAYS.map((day) => ({
    day,
    breakfast: find(day, 'BREAKFAST')?.items ?? '—',
    lunch: find(day, 'LUNCH')?.items ?? '—',
    dinner: find(day, 'DINNER')?.items ?? '—',
  }))

  const todayRow = menuRows.find((r) => r.day === TODAY)

  return (
    <div className="space-y-6">
      <PageHeader title="Weekly Menu" subtitle="Hostel mess schedule for this week" />

      {/* Today's meal hero */}
      {todayRow && (
        <div
          className="rounded-2xl p-6 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
        >
          <div
            className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #3aaee8, transparent)', transform: 'translate(30%, -30%)' }}
          />
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <UtensilsCrossed size={13} className="text-white" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Today's Meals · {todayRow.day}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Breakfast', value: todayRow.breakfast, icon: Coffee, time: timing('BREAKFAST', '7:30 – 9:30 AM') },
              { label: 'Lunch',     value: todayRow.lunch,     icon: Sun,    time: timing('LUNCH', '12:30 – 2:30 PM') },
              { label: 'Dinner',    value: todayRow.dinner,    icon: Moon,   time: timing('DINNER', '7:30 – 9:30 PM') },
            ].map((meal) => (
              <div
                key={meal.label}
                className="rounded-xl p-3.5"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <meal.icon size={13} className="text-sky-300" />
                  <p className="text-xs font-semibold text-sky-200 uppercase tracking-wide">{meal.label}</p>
                </div>
                <p className="text-sm font-medium text-white leading-snug">{meal.value}</p>
                <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{meal.time}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
          <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
            <UtensilsCrossed size={14} className="text-brand-600" />
          </div>
          <h2 className="font-semibold text-gray-800 text-sm">Full Week Schedule</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-32">Day</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <span className="flex items-center gap-1.5"><Coffee size={12} /> Breakfast</span>
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <span className="flex items-center gap-1.5"><Sun size={12} /> Lunch</span>
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <span className="flex items-center gap-1.5"><Moon size={12} /> Dinner</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {menuRows.map((row) => {
                const isToday = row.day === TODAY
                return (
                  <tr
                    key={row.day}
                    className={isToday ? '' : 'hover:bg-gray-50/70 transition-colors'}
                    style={isToday ? { background: '#eef2ff' } : {}}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isToday ? 'text-brand-700' : 'text-gray-800'}`}>
                          {row.day}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-bold bg-brand-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Today
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-5 py-4 text-sm ${isToday ? 'text-brand-800 font-medium' : 'text-gray-600'}`}>
                      {row.breakfast}
                    </td>
                    <td className={`px-5 py-4 text-sm ${isToday ? 'text-brand-800 font-medium' : 'text-gray-600'}`}>
                      {row.lunch}
                    </td>
                    <td className={`px-5 py-4 text-sm ${isToday ? 'text-brand-800 font-medium' : 'text-gray-600'}`}>
                      {row.dinner}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
