import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Car, CheckCircle2 } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import { getMyParking, registerParking, deregisterParking } from '../../api/hosteller'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import NoStay from './NoStay'

// Indian registration plates, e.g. AP16CK4521 / AP 16 CK 4521 / AP-16-CK-4521 / 22BH1234AA
const PLATE_RE = /^([A-Z]{2}[ -]?\d{1,2}[ -]?[A-Z]{0,3}[ -]?\d{1,4}|\d{2}[ -]?BH[ -]?\d{4}[ -]?[A-Z]{1,2})$/

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const VEHICLE_TYPES = ['Car', 'Bike', 'Scooter']

export default function Parking() {
  const queryClient = useQueryClient()
  const { hostelId } = useAuthStore()
  const { show } = useToastStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ vehicleNumber: '', type: '' })
  const [plateErr, setPlateErr] = useState<string | null>(null)

  const { data: parkingData, isLoading, error } = useQuery({
    queryKey: ['my-parking'],
    queryFn: getMyParking,
  })

  const registerMutation = useMutation({
    mutationFn: registerParking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-parking'] })
      setShowForm(false)
      setForm({ vehicleNumber: '', type: '' })
      show('success', 'Vehicle registered', 'Staff will assign you a parking slot.')
    },
    onError: (e: any) => {
      if (![400, 409].includes(e?.response?.status)) show('error', 'Registration failed', 'Could not register your vehicle. Please try again.')
    },
  })

  const deregisterMutation = useMutation({
    mutationFn: (id: number) => deregisterParking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-parking'] })
      show('success', 'Parking removed', 'Your vehicle has been de-registered.')
    },
    onError: (e: any) => {
      if (![400, 409].includes(e?.response?.status)) show('error', 'Could not remove', 'Please try again.')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const plate = form.vehicleNumber.trim().replace(/\s+/g, ' ')
    if (!PLATE_RE.test(plate)) {
      setPlateErr('Enter a valid vehicle number, e.g. AP 16 CK 4521')
      return
    }
    setPlateErr(null)
    registerMutation.mutate({ vehicleNumber: plate, vehicleType: form.type })
  }

  const parkingList = parkingData ?? []
  const activeSlot = parkingList.find((p: any) => p.status === 'ACTIVE')

  if (!hostelId) return <NoStay title="Vehicle Parking" subtitle="Request a vehicle parking slot" />

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  if (error) return <div className="text-center py-20 text-gray-400">Failed to load data</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Parking"
        subtitle="Request a vehicle parking slot"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
          >
            <Plus size={16} /> Request Parking
          </button>
        }
      />

      {/* Active Slot Card */}
      {activeSlot && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shrink-0">
                <CheckCircle2 size={22} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-0.5">Active Slot</p>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {activeSlot.slotNumber ?? activeSlot.slot ?? 'Slot not assigned yet'}
                </h3>
              </div>
            </div>
            <Badge status={activeSlot.status} />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-emerald-100">
            <div>
              <p className="text-xs text-emerald-600 font-medium">Vehicle Number</p>
              <p className="font-mono text-sm font-bold text-gray-800 mt-0.5">{activeSlot.vehicleNumber}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-medium">Type</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{activeSlot.vehicleType ?? activeSlot.type ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-medium">Since</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{fmtDate(activeSlot.registeredAt ?? activeSlot.requestedDate ?? activeSlot.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={() => { if (window.confirm(`Remove parking for ${activeSlot.vehicleNumber}?`)) deregisterMutation.mutate(activeSlot.id) }}
            disabled={deregisterMutation.isPending}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {deregisterMutation.isPending ? 'Removing…' : 'Remove Slot'}
          </button>
        </div>
      )}

      {/* New Request Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
                <Car size={14} className="text-brand-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">New Parking Request</h3>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Vehicle Number
                </label>
                <input
                  required
                  maxLength={20}
                  value={form.vehicleNumber}
                  onChange={(e) => { setForm((f) => ({ ...f, vehicleNumber: e.target.value.toUpperCase() })); setPlateErr(null) }}
                  placeholder="AP 16 CK 4521"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors"
                />
                {plateErr && <p className="mt-1 text-xs text-red-500">{plateErr}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Vehicle Type
                </label>
                <select
                  required
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors"
                >
                  <option value="">Select type</option>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="px-5 py-2 text-sm rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
              >
                {registerMutation.isPending ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My Requests Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
          <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
            <Car size={14} className="text-brand-600" />
          </div>
          <h2 className="font-semibold text-gray-800 text-sm">My Parking Requests</h2>
          <span className="ml-auto text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {parkingList.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Vehicle Number</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Slot</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Requested Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {parkingList.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg tracking-wider whitespace-nowrap">
                      {r.vehicleNumber}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-semibold bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full">
                      {r.vehicleType ?? r.type ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-gray-700">{r.slotNumber ?? r.slot ?? '—'}</td>
                  <td className="px-5 py-3.5 text-gray-500">{fmtDate(r.registeredAt ?? r.requestedDate ?? r.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <Badge status={r.status} />
                  </td>
                </tr>
              ))}
              {parkingList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">No parking requests</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
