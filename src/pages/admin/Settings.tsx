import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, QrCode, Building2, Save, Plus, ChevronDown, ChevronRight, Pencil, X, Check, BedDouble } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import {
  getHostel, updateHostel, getHostelStructure, createFloor, createRoomWithBeds, createBed, renameFloor,
} from '../../api/staff'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'

interface HostelSettings {
  hostelName: string
  address: string
  city: string
  locality: string
  type: string
  contact: string
  pincode: string
  defaultRent: number
}

// Values stored in hostel_hostels.hostel_type
const HOSTEL_TYPES: { value: string; label: string }[] = [
  { value: 'BOYS', label: 'Gents Only' },
  { value: 'GIRLS', label: 'Ladies Only' },
  { value: 'MIXED', label: 'Co-ed' },
]

type TabType = 'general' | 'qr' | 'floors'

export default function AdminSettings() {
  const { activeHostelId } = useAuthStore()
  const queryClient = useQueryClient()
  const { show } = useToastStore()
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set())
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState<HostelSettings>({
    hostelName: '', address: '', city: '', locality: '',
    type: 'MIXED', contact: '', pincode: '', defaultRent: 0,
  })

  // Floor editing state
  const [editingFloorId, setEditingFloorId] = useState<number | null>(null)
  const [editFloorName, setEditFloorName] = useState('')

  // Add floor state
  const [showAddFloor, setShowAddFloor] = useState(false)
  const [newFloorName, setNewFloorName] = useState('')

  // Add room state — keyed by floorId
  const [addingRoomFloorId, setAddingRoomFloorId] = useState<number | null>(null)
  const [newRoom, setNewRoom] = useState({ roomNumber: '', type: 'SINGLE', totalBeds: '1' })

  // Add bed state — keyed by roomId (we track locally per-room; rooms come from floor.rooms)
  const [addingBedRoomId, setAddingBedRoomId] = useState<number | null>(null)
  const [newBedLabel, setNewBedLabel] = useState('')

  const { data: hostel, isLoading: hostelLoading } = useQuery({
    queryKey: ['hostel', activeHostelId],
    queryFn: () => getHostel(activeHostelId!),
    enabled: !!activeHostelId,
  })

  const { data: floors = [], isLoading: floorsLoading } = useQuery({
    queryKey: ['structure', activeHostelId],
    queryFn: () => getHostelStructure(activeHostelId!),
    enabled: !!activeHostelId && activeTab === 'floors',
  })

  useEffect(() => {
    if (hostel) {
      setSettings({
        hostelName: hostel.name ?? hostel.hostelName ?? '',
        address: hostel.address ?? '',
        city: hostel.city ?? '',
        // API field names: landmark (shown as locality), hostelType, contactPhone
        locality: hostel.landmark ?? hostel.locality ?? '',
        type: hostel.hostelType ?? 'MIXED',
        contact: hostel.contactPhone ?? '',
        pincode: hostel.pincode ?? '',
        defaultRent: Number(hostel.defaultRent ?? 0),
      })
    }
  }, [hostel])

  const updateMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateHostel(activeHostelId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel', activeHostelId] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      show('success', 'Saved', 'Hostel settings updated successfully.')
    },
    onError: (err: any) => show('error', 'Save failed', err?.response?.data?.message ?? 'Please try again.'),
  })

  const renameFloorMut = useMutation({
    mutationFn: ({ floorId, floorName }: { floorId: number; floorName: string }) => renameFloor(floorId, floorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structure', activeHostelId] })
      setEditingFloorId(null)
      show('success', 'Floor renamed')
    },
    onError: (err: any) => show('error', 'Rename failed', err?.response?.data?.message ?? 'Please try again.'),
  })

  const addFloorMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => createFloor(activeHostelId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structure', activeHostelId] })
      setShowAddFloor(false)
      setNewFloorName('')
      show('success', 'Floor added', 'New floor has been created.')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to add floor.'
      show('error', 'Error', msg)
    },
  })

  const addRoomMut = useMutation({
    mutationFn: ({ floorId, data }: { floorId: number; data: Record<string, unknown> }) =>
      createRoomWithBeds(activeHostelId!, floorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structure', activeHostelId] })
      setAddingRoomFloorId(null)
      setNewRoom({ roomNumber: '', type: 'SINGLE', totalBeds: '1' })
      show('success', 'Room added', 'New room and its beds have been created.')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to add room.'
      show('error', 'Error', msg)
    },
  })

  const addBedMut = useMutation({
    mutationFn: ({ roomId, data }: { roomId: number; data: Record<string, unknown> }) => createBed(roomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structure', activeHostelId] })
      setAddingBedRoomId(null)
      setNewBedLabel('')
      show('success', 'Bed added', 'New bed has been created.')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to add bed.'
      show('error', 'Error', msg)
    },
  })

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settings.hostelName.trim() || !settings.city.trim()) {
      show('error', 'Missing details', 'Hostel name and city are required.'); return
    }
    if (settings.pincode && !/^\d{6}$/.test(settings.pincode.trim())) {
      show('error', 'Invalid pincode', 'Pincode must be 6 digits.'); return
    }
    if (!(settings.defaultRent >= 0)) {
      show('error', 'Invalid rent', 'Default rent cannot be negative.'); return
    }
    updateMut.mutate({
      name: settings.hostelName.trim(),
      address: settings.address.trim(),
      city: settings.city.trim(),
      locality: settings.locality.trim(),
      hostelType: settings.type,
      contactPhone: settings.contact.trim(),
      ...(settings.pincode.trim() ? { pincode: settings.pincode.trim() } : {}),
      defaultRent: settings.defaultRent,
    })
  }

  function toggleFloor(id: number) {
    setExpandedFloors((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function startEditFloor(e: React.MouseEvent, floor: any) {
    e.stopPropagation()
    setEditingFloorId(floor.id)
    setEditFloorName(floor.floorName ?? floor.name ?? '')
  }

  function handleAddFloor(e: React.FormEvent) {
    e.preventDefault()
    if (!newFloorName.trim()) return
    if ((floors as any[]).some((f) => (f.floorName ?? '').toLowerCase() === newFloorName.trim().toLowerCase())) {
      show('error', 'Duplicate floor', `A floor named "${newFloorName.trim()}" already exists.`); return
    }
    // floor_number drives ordering; append after the highest existing floor
    const nextNumber = (floors as any[]).reduce((m, f) => Math.max(m, (f.floorNumber ?? -1) + 1), 0)
    addFloorMut.mutate({ floorName: newFloorName.trim(), floorNumber: nextNumber })
  }

  function handleAddRoom(e: React.FormEvent, floorId: number) {
    e.preventDefault()
    if (!newRoom.roomNumber.trim()) return
    const beds = Number(newRoom.totalBeds)
    if (!Number.isInteger(beds) || beds < 1 || beds > 20) {
      show('error', 'Invalid bed count', 'A room needs between 1 and 20 beds.'); return
    }
    const allRooms = (floors as any[]).flatMap((f) => f.rooms ?? [])
    if (allRooms.some((r) => (r.roomNumber ?? '').toLowerCase() === newRoom.roomNumber.trim().toLowerCase())) {
      show('error', 'Duplicate room', `Room ${newRoom.roomNumber.trim()} already exists.`); return
    }
    addRoomMut.mutate({
      floorId,
      data: {
        roomNumber: newRoom.roomNumber.trim(),
        roomType: newRoom.type,
        bedsPerRoom: Number(newRoom.totalBeds),
      },
    })
  }

  function handleAddBed(e: React.FormEvent, roomId: number) {
    e.preventDefault()
    addBedMut.mutate({
      roomId,
      data: { bedLabel: newBedLabel.trim() || undefined },
    })
  }

  const tabs: { key: TabType; label: string; icon: typeof Settings }[] = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'qr', label: 'QR Code', icon: QrCode },
    { key: 'floors', label: 'Floors & Rooms', icon: Building2 },
  ]

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors'

  if (hostelLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel Settings"
        subtitle="Configure your hostel details and structure"
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 text-sm mb-5">Hostel Information</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Hostel Name</label>
                <input value={settings.hostelName} onChange={(e) => setSettings((s) => ({ ...s, hostelName: e.target.value }))} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Address</label>
                <input value={settings.address} onChange={(e) => setSettings((s) => ({ ...s, address: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">City</label>
                <input value={settings.city} onChange={(e) => setSettings((s) => ({ ...s, city: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Locality</label>
                <input value={settings.locality} onChange={(e) => setSettings((s) => ({ ...s, locality: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Hostel Type</label>
                <select value={settings.type} onChange={(e) => setSettings((s) => ({ ...s, type: e.target.value }))} className={inputCls + ' bg-white'}>
                  {HOSTEL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Contact Number</label>
                <input value={settings.contact} onChange={(e) => setSettings((s) => ({ ...s, contact: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Default Monthly Rent (₹)</label>
                <input type="number" min={0} value={settings.defaultRent} onChange={(e) => setSettings((s) => ({ ...s, defaultRent: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Pincode</label>
                <input inputMode="numeric" maxLength={6} value={settings.pincode} onChange={(e) => setSettings((s) => ({ ...s, pincode: e.target.value.replace(/\D/g, '') }))} className={inputCls} />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={updateMut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
              >
                <Save size={14} />
                {updateMut.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              {saved && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                  Saved successfully!
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* QR Code Tab */}
      {activeTab === 'qr' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 text-sm mb-1">Registration QR Code</h3>
          <p className="text-xs text-gray-400 mb-6">Share this QR code with prospective members to register online.</p>
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 bg-gray-50">
                <QrCode size={56} className="text-gray-300" />
                <span className="text-xs text-gray-400 font-medium">QR Code</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">Scan to Register</p>
              <p className="text-xs text-gray-400 text-center max-w-xs">
                Members can scan this code to start their hostel registration process online.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-2.5 w-full text-center">
                <p className="text-xs text-gray-400 mb-0.5 font-medium">Registration Link</p>
                <p className="text-xs font-mono text-gray-600 break-all">{`${window.location.origin}/auth/signup?hostelId=${activeHostelId}`}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/auth/signup?hostelId=${activeHostelId}`
                    navigator.clipboard?.writeText(url).then(() => {
                      show('success', 'Link copied', 'Registration link copied to clipboard.')
                    }).catch(() => show('info', 'Registration link', url))
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
                >
                  Copy Link
                </button>
                <button
                  onClick={() => show('info', 'QR Code', 'QR code generation is coming soon.')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Generate QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floors & Rooms Tab */}
      {activeTab === 'floors' && (
        <div className="space-y-4">
          {/* Header row */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddFloor((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
            >
              <Plus size={14} />
              Add Floor
            </button>
          </div>

          {/* Add Floor inline form */}
          {showAddFloor && (
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
              <h4 className="font-semibold text-gray-800 text-sm mb-3">New Floor</h4>
              <form onSubmit={handleAddFloor} className="flex gap-3">
                <input
                  required
                  autoFocus
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  placeholder="e.g. Ground Floor, 1st Floor…"
                  className={inputCls + ' flex-1'}
                />
                <button
                  type="submit"
                  disabled={addFloorMut.isPending}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
                >
                  {addFloorMut.isPending ? 'Adding…' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddFloor(false); setNewFloorName('') }}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50"
                >
                  <X size={14} />
                </button>
              </form>
            </div>
          )}

          {floorsLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
            </div>
          )}

          {(floors as any[]).map((floor: any) => {
            const isExpanded = expandedFloors.has(floor.id)
            const rooms = floor.rooms ?? []
            const totalBeds = rooms.reduce((s: number, r: any) => s + (r.totalBeds ?? r.beds?.length ?? 0), 0)
            const floorName = floor.floorName ?? floor.name ?? `Floor ${floor.id}`
            const isEditingThisFloor = editingFloorId === floor.id

            return (
              <div key={floor.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Floor header */}
                <button
                  onClick={() => !isEditingThisFloor && toggleFloor(floor.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Building2 size={14} className="text-emerald-600" />
                    </div>
                    {isEditingThisFloor ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={editFloorName}
                          onChange={(e) => setEditFloorName(e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-emerald-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 font-semibold text-gray-800 w-44"
                        />
                        <button
                          onClick={() => editFloorName.trim() && renameFloorMut.mutate({ floorId: floor.id, floorName: editFloorName.trim() })}
                          disabled={renameFloorMut.isPending || !editFloorName.trim()}
                          title="Save floor name"
                          className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setEditingFloorId(null)}
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-gray-800 text-sm">{floorName}</span>
                    )}
                    <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {rooms.length} rooms
                    </span>
                    <span className="text-xs font-semibold bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                      {totalBeds} beds
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => startEditFloor(e, floor)}
                      title="Rename floor"
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded floor content */}
                {isExpanded && (
                  <div className="border-t border-gray-50">
                    {/* Room table */}
                    {rooms.length > 0 && (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Room</th>
                            <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                            <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Occupancy</th>
                            <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Beds</th>
                            <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {rooms.map((room: any) => {
                            const roomNum = room.roomNumber ?? room.number ?? '?'
                            const totalB = room.totalBeds ?? room.beds?.length ?? 0
                            const occupiedB = room.occupiedBeds ?? room.beds?.filter((b: any) => b.status === 'occupied' || b.status === 'OCCUPIED').length ?? 0
                            const isAddingBedHere = addingBedRoomId === room.id
                            return (
                              <>
                                <tr key={roomNum} className="hover:bg-gray-50/60 transition-colors">
                                  <td className="px-5 py-3">
                                    <span className="font-mono text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg tracking-wider whitespace-nowrap">
                                      {roomNum}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-xs font-medium text-gray-600">{room.type ?? '—'}</td>
                                  <td className="px-5 py-3">
                                    <span className="text-xs font-semibold text-gray-700">{occupiedB}/{totalB}</span>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex gap-1">
                                      {Array.from({ length: totalB }).map((_, idx) => (
                                        <span
                                          key={idx}
                                          className={`w-4 h-4 rounded-sm ${idx < occupiedB ? 'bg-brand-400' : 'bg-gray-200'}`}
                                        />
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <button
                                      onClick={() => { setAddingBedRoomId(isAddingBedHere ? null : room.id); setNewBedLabel('') }}
                                      className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                                    >
                                      <BedDouble size={12} />
                                      Add Bed
                                    </button>
                                  </td>
                                </tr>
                                {isAddingBedHere && (
                                  <tr key={`${roomNum}-add-bed`}>
                                    <td colSpan={5} className="px-5 py-3 bg-brand-50/50">
                                      <form
                                        onSubmit={(e) => handleAddBed(e, room.id)}
                                        className="flex items-center gap-2"
                                      >
                                        <span className="text-xs font-semibold text-brand-600">Bed label (optional):</span>
                                        <input
                                          autoFocus
                                          value={newBedLabel}
                                          onChange={(e) => setNewBedLabel(e.target.value)}
                                          placeholder={`e.g. ${roomNum}-A`}
                                          className="px-2.5 py-1.5 rounded-lg border border-brand-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 w-32"
                                        />
                                        <button
                                          type="submit"
                                          disabled={addBedMut.isPending}
                                          className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                                          style={{ background: '#6366f1' }}
                                        >
                                          {addBedMut.isPending ? '…' : 'Add'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setAddingBedRoomId(null)}
                                          className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-200"
                                        >
                                          <X size={12} />
                                        </button>
                                      </form>
                                    </td>
                                  </tr>
                                )}
                              </>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                    {rooms.length === 0 && (
                      <div className="px-5 py-4 text-center text-xs text-gray-400">
                        No rooms added yet.
                      </div>
                    )}

                    {/* Add Room form or button */}
                    {addingRoomFloorId === floor.id ? (
                      <div className="px-5 py-4 bg-emerald-50/40 border-t border-emerald-100">
                        <p className="text-xs font-semibold text-emerald-700 mb-3">Add New Room to {floorName}</p>
                        <form onSubmit={(e) => handleAddRoom(e, floor.id)} className="flex flex-wrap gap-3 items-end">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Room Number *</label>
                            <input
                              required
                              autoFocus
                              value={newRoom.roomNumber}
                              onChange={(e) => setNewRoom((r) => ({ ...r, roomNumber: e.target.value }))}
                              placeholder="e.g. 101"
                              className="px-2.5 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 w-24"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Type</label>
                            <select
                              value={newRoom.type}
                              onChange={(e) => setNewRoom((r) => ({ ...r, type: e.target.value }))}
                              className="px-2.5 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                            >
                              <option value="SINGLE">Single</option>
                              <option value="DOUBLE">Double</option>
                              <option value="TRIPLE">Triple</option>
                              <option value="DORMITORY">Dormitory</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Total Beds</label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={newRoom.totalBeds}
                              onChange={(e) => setNewRoom((r) => ({ ...r, totalBeds: e.target.value }))}
                              className="px-2.5 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 w-20"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={addRoomMut.isPending}
                              className="px-4 py-2 rounded-lg text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                              style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
                            >
                              {addRoomMut.isPending ? 'Adding…' : 'Add Room'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAddingRoomFloorId(null); setNewRoom({ roomNumber: '', type: 'SINGLE', totalBeds: '1' }) }}
                              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="px-5 py-3 border-t border-gray-50 flex justify-end">
                        <button
                          onClick={() => setAddingRoomFloorId(floor.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Plus size={12} />
                          Add Room
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {!floorsLoading && (floors as any[]).length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-10 text-center text-sm text-gray-400">
              No floors configured yet. Click "Add Floor" to get started.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
