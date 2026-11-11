import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Save, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { getMenuForHostel, getMenuItems, saveMenu } from '../../api/staff'
import { useAuthStore } from '../../store/authStore'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const

type MealType = typeof MEAL_TYPES[number]

interface MenuRow {
  day: string
  breakfast: string
  lunch: string
  dinner: string
}

function buildRows(items: any[]): MenuRow[] {
  return DAYS.map((day) => {
    const row: MenuRow = { day, breakfast: '', lunch: '', dinner: '' }
    items.forEach((item: any) => {
      const d = (item.dayOfWeek ?? '').toLowerCase()
      const mt = (item.mealType ?? '').toLowerCase() as MealType
      if (d === day.toLowerCase() && (mt === 'breakfast' || mt === 'lunch' || mt === 'dinner')) {
        row[mt] = item.items ?? ''
      }
    })
    return row
  })
}

function rowsToItems(rows: MenuRow[]): { dayOfWeek: string; mealType: string; items: string }[] {
  const out: { dayOfWeek: string; mealType: string; items: string }[] = []
  rows.forEach((row) => {
    MEAL_TYPES.forEach((mt) => {
      if (row[mt].trim()) {
        out.push({ dayOfWeek: row.day, mealType: mt.toUpperCase(), items: row[mt].trim() })
      }
    })
  })
  return out
}

export default function AdminMenu() {
  const { activeHostelId } = useAuthStore()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<MenuRow[]>(DAYS.map((day) => ({ day, breakfast: '', lunch: '', dinner: '' })))

  const { data: menuMeta, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', activeHostelId],
    queryFn: () => getMenuForHostel(activeHostelId!),
    enabled: !!activeHostelId,
  })

  const menuId = menuMeta?.id

  const { data: menuItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['menuItems', menuId],
    queryFn: () => getMenuItems(menuId!),
    enabled: !!menuId,
  })

  const menu: MenuRow[] = buildRows(menuItems)

  // Seed the draft from the saved menu when editing starts (an effect keyed on
  // `menuItems` looped forever: the `= []` default is a new array every render).
  function startEditing() {
    setDraft(buildRows(menuItems))
    setEditing(true)
  }

  const saveMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => saveMenu(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', activeHostelId] })
      queryClient.invalidateQueries({ queryKey: ['menuItems', menuId] })
      setEditing(false)
    },
  })

  function handleSave() {
    saveMut.mutate({
      hostelId: activeHostelId,
      items: rowsToItems(draft),
    })
  }

  function handleCancel() {
    setDraft(buildRows(menuItems))
    setEditing(false)
  }

  function updateCell(dayIdx: number, field: MealType, value: string) {
    setDraft((prev) => prev.map((row, i) => i === dayIdx ? { ...row, [field]: value } : row))
  }

  if (menuLoading || itemsLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Menu"
        subtitle="Edit the hostel mess schedule"
        action={
          editing ? (
            <div className="flex gap-2">
              <button onClick={handleCancel} className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                <X size={14} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saveMut.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60"
              >
                <Save size={14} /> {saveMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          ) : (
            <button onClick={startEditing} className="flex items-center gap-1.5 px-4 py-2 text-sm text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50">
              <Pencil size={14} /> Edit Menu
            </button>
          )
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-gray-500 font-medium w-28">Day</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Breakfast</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Lunch</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Dinner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(editing ? draft : menu).map((row, i) => (
                <tr key={row.day} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 font-semibold text-gray-800">{row.day}</td>
                  {MEAL_TYPES.map((field) => (
                    <td key={field} className="px-5 py-3.5">
                      {editing ? (
                        <input
                          value={draft[i][field]}
                          onChange={(e) => updateCell(i, field, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"
                        />
                      ) : (
                        <span className="text-gray-600">{row[field] || '—'}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
