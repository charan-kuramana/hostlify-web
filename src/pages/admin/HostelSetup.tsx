import { useState, useEffect, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Wifi, IndianRupee, CalendarClock, Building2, ScrollText } from 'lucide-react'
import PoliciesPanel from '../../components/admin/PoliciesPanel'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import {
  getHostelAmenities, updateHostelAmenities,
  getHostelPricing, updateHostelPricing,
  getBookingSettings, updateBookingSettings,
} from '../../api/staff'

type TabType = 'amenities' | 'pricing' | 'booking' | 'rules'

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors'

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
    >
      {children}
    </button>
  )
}

export default function HostelSetup() {
  const { activeHostelId } = useAuthStore()
  const queryClient = useQueryClient()
  const { show } = useToastStore()
  const [tab, setTab] = useState<TabType>('amenities')

  // ── Amenities ────────────────────────────────────────────────────────────────
  const { data: amenitiesData, isLoading: amenitiesLoading } = useQuery({
    queryKey: ['hostel-amenities', activeHostelId],
    queryFn: () => getHostelAmenities(activeHostelId!),
    enabled: !!activeHostelId && tab === 'amenities',
  })

  const [amenities, setAmenities] = useState<{ key: string; label: string; enabled: boolean }[]>([])

  useEffect(() => {
    if (amenitiesData) {
      setAmenities(
        Array.isArray(amenitiesData)
          ? amenitiesData.map((a: any) => ({ key: a.key ?? a.name, label: a.label ?? a.name, enabled: a.enabled ?? false }))
          : [],
      )
    }
  }, [amenitiesData])

  const saveAmenitiesMut = useMutation({
    mutationFn: () => updateHostelAmenities(activeHostelId!, amenities.map(({ key, enabled }) => ({ key, enabled }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel-amenities', activeHostelId] })
      show('success', 'Amenities saved')
    },
    onError: () => show('error', 'Failed to save amenities'),
  })

  // ── Pricing ──────────────────────────────────────────────────────────────────
  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['hostel-pricing', activeHostelId],
    queryFn: () => getHostelPricing(activeHostelId!),
    enabled: !!activeHostelId && tab === 'pricing',
  })

  // API fields: roomType, baseRent, depositMonths, lateFee (one tier per room type)
  const [tiers, setTiers] = useState<{ roomType: string; baseRent: string; depositMonths: string; lateFee: string; dailyRent: string; weeklyRent: string; fortnightRent: string }[]>([])

  useEffect(() => {
    if (pricingData) {
      setTiers(
        Array.isArray(pricingData)
          ? pricingData.map((t: any) => ({
              roomType: t.roomType ?? t.tierName ?? '',
              baseRent: String(t.baseRent ?? t.monthlyRent ?? ''),
              depositMonths: String(t.depositMonths ?? 1),
              lateFee: String(t.lateFee ?? 0),
              dailyRent: t.dailyRent != null ? String(t.dailyRent) : '',
              weeklyRent: t.weeklyRent != null ? String(t.weeklyRent) : '',
              fortnightRent: t.fortnightRent != null ? String(t.fortnightRent) : '',
            }))
          : [],
      )
    }
  }, [pricingData])

  const savePricingMut = useMutation({
    mutationFn: () =>
      updateHostelPricing(activeHostelId!, tiers.map((t) => ({
        roomType: t.roomType,
        baseRent: Number(t.baseRent),
        depositMonths: Number(t.depositMonths || 0),
        lateFee: Number(t.lateFee || 0),
        // short-stay rates: blank = not offered
        dailyRent: t.dailyRent === '' ? null : Number(t.dailyRent),
        weeklyRent: t.weeklyRent === '' ? null : Number(t.weeklyRent),
        fortnightRent: t.fortnightRent === '' ? null : Number(t.fortnightRent),
      }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel-pricing', activeHostelId] })
      show('success', 'Pricing updated')
    },
    onError: () => show('error', 'Failed to update pricing'),
  })

  function savePricing() {
    const types = tiers.map((t) => t.roomType)
    if (tiers.some((t) => !t.roomType)) { show('error', 'Room type required', 'Pick a room type for every tier.'); return }
    if (new Set(types).size !== types.length) { show('error', 'Duplicate room type', 'Each room type can only have one tier.'); return }
    if (tiers.some((t) => !(Number(t.baseRent) > 0))) { show('error', 'Invalid rent', 'Monthly rent must be greater than 0.'); return }
    if (tiers.some((t) => Number(t.depositMonths) < 0 || Number(t.lateFee) < 0)) { show('error', 'Invalid values', 'Deposit months and late fee cannot be negative.'); return }
    savePricingMut.mutate()
  }

  // ── Booking Settings ──────────────────────────────────────────────────────────
  const { data: bookingSettingsData, isLoading: bookingSettingsLoading } = useQuery({
    queryKey: ['booking-settings', activeHostelId],
    queryFn: () => getBookingSettings(activeHostelId!),
    enabled: !!activeHostelId && tab === 'booking',
  })

  const [bkSettings, setBkSettings] = useState({
    selfBookingEnabled: false,
    requiresAdminApproval: true,
    autoExpireDays: 7,
    shortStayEnabled: false,
    shortStayMinDays: 1,
    shortStayMaxDays: 30,
  })

  useEffect(() => {
    if (bookingSettingsData) {
      setBkSettings({
        selfBookingEnabled:    bookingSettingsData.selfBookingEnabled ?? false,
        requiresAdminApproval: bookingSettingsData.requiresAdminApproval ?? true,
        autoExpireDays:        bookingSettingsData.autoExpireDays ?? 7,
        shortStayEnabled:      bookingSettingsData.shortStayEnabled ?? false,
        shortStayMinDays:      bookingSettingsData.shortStayMinDays ?? 1,
        shortStayMaxDays:      bookingSettingsData.shortStayMaxDays ?? 30,
      })
    }
  }, [bookingSettingsData])

  const saveBookingMut = useMutation({
    mutationFn: () => {
      if (!Number.isInteger(bkSettings.autoExpireDays) || bkSettings.autoExpireDays < 1 || bkSettings.autoExpireDays > 30) {
        return Promise.reject(new Error('Auto-expire must be between 1 and 30 days.'))
      }
      return updateBookingSettings(activeHostelId!, bkSettings)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-settings', activeHostelId] })
      show('success', 'Booking settings saved')
    },
    onError: (e: any) => show('error', 'Failed to save booking settings', e?.response?.data?.message ?? e?.message),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Hostel Setup" subtitle="Manage amenities, pricing, booking settings, house rules and terms" />

      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <TabButton active={tab === 'amenities'} onClick={() => setTab('amenities')}>
          <span className="flex items-center gap-1.5"><Wifi size={13} /> Amenities</span>
        </TabButton>
        <TabButton active={tab === 'pricing'} onClick={() => setTab('pricing')}>
          <span className="flex items-center gap-1.5"><IndianRupee size={13} /> Pricing</span>
        </TabButton>
        <TabButton active={tab === 'booking'} onClick={() => setTab('booking')}>
          <span className="flex items-center gap-1.5"><CalendarClock size={13} /> Booking</span>
        </TabButton>
        <TabButton active={tab === 'rules'} onClick={() => setTab('rules')}>
          <span className="flex items-center gap-1.5"><ScrollText size={13} /> Rules &amp; terms</span>
        </TabButton>
      </div>

      {/* ── Amenities Tab ── */}
      {tab === 'amenities' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
              <Wifi size={14} className="text-brand-600" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">Amenities</h3>
          </div>
          {amenitiesLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
            </div>
          ) : amenities.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No amenities configured for this hostel.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {amenities.map((a, i) => (
                  <label key={a.key} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={a.enabled}
                      onChange={(e) => {
                        const updated = [...amenities]
                        updated[i] = { ...updated[i], enabled: e.target.checked }
                        setAmenities(updated)
                      }}
                      className="w-4 h-4 rounded text-brand-600 focus:ring-brand-400"
                    />
                    <span className="text-sm font-medium text-gray-700">{a.label || a.key}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => saveAmenitiesMut.mutate()}
                disabled={saveAmenitiesMut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
              >
                <Save size={14} />
                {saveAmenitiesMut.isPending ? 'Saving…' : 'Save Amenities'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Pricing Tab ── */}
      {tab === 'pricing' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <IndianRupee size={14} className="text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">Pricing Tiers</h3>
          </div>
          {pricingLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
            </div>
          ) : (
            <>
              {tiers.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No pricing tiers configured.</p>
              )}
              <div className="space-y-4 mb-5">
                {tiers.map((tier, i) => (
                  <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border border-gray-100 rounded-xl">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Room Type</label>
                      <select className={inputCls} value={tier.roomType}
                        onChange={(e) => { const u = [...tiers]; u[i] = { ...u[i], roomType: e.target.value }; setTiers(u) }}>
                        <option value="">Select…</option>
                        {['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY'].map((rt) => <option key={rt} value={rt}>{rt.charAt(0) + rt.slice(1).toLowerCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Monthly Rent (₹)</label>
                      <input type="number" min={0} className={inputCls} value={tier.baseRent}
                        onChange={(e) => { const u = [...tiers]; u[i] = { ...u[i], baseRent: e.target.value }; setTiers(u) }}
                        placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Deposit (months)</label>
                      <input type="number" min={0} className={inputCls} value={tier.depositMonths}
                        onChange={(e) => { const u = [...tiers]; u[i] = { ...u[i], depositMonths: e.target.value }; setTiers(u) }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Late Fee (₹)</label>
                      <input type="number" min={0} className={inputCls} value={tier.lateFee}
                        onChange={(e) => { const u = [...tiers]; u[i] = { ...u[i], lateFee: e.target.value }; setTiers(u) }} />
                    </div>
                    {([['dailyRent', 'Per day (₹)'], ['weeklyRent', 'Per 7 days (₹)'], ['fortnightRent', 'Per 15 days (₹)']] as const).map(([k, label]) => (
                      <div key={k}>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Short stay · {label}</label>
                        <input type="number" min={0} className={inputCls} value={tier[k]} placeholder="Not offered"
                          onChange={(e) => { const u = [...tiers]; u[i] = { ...u[i], [k]: e.target.value }; setTiers(u) }} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mb-4">Short-stay rates are used only when short stays are on (Booking tab). A stay is priced with the cheapest mix of 15-day, 7-day and daily rates, e.g. 9 days = 1 week + 2 days.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTiers((t) => [...t, { roomType: '', baseRent: '', depositMonths: '1', lateFee: '0', dailyRent: '', weeklyRent: '', fortnightRent: '' }])}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  + Add Tier
                </button>
                <button
                  onClick={savePricing}
                  disabled={savePricingMut.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
                >
                  <Save size={14} />
                  {savePricingMut.isPending ? 'Saving…' : 'Save Pricing'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Booking Settings Tab ── */}
      {tab === 'booking' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <CalendarClock size={14} className="text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">Booking Settings</h3>
          </div>
          {bookingSettingsLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bkSettings.selfBookingEnabled}
                  onChange={(e) => setBkSettings((s) => ({ ...s, selfBookingEnabled: e.target.checked }))}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-400"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Self Booking Enabled</p>
                  <p className="text-xs text-gray-400">Allow hostellers to book beds themselves via the app</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bkSettings.requiresAdminApproval}
                  onChange={(e) => setBkSettings((s) => ({ ...s, requiresAdminApproval: e.target.checked }))}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-400"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Requires Admin Approval</p>
                  <p className="text-xs text-gray-400">Booking requests must be approved by staff before confirmation</p>
                </div>
              </label>

              <div className="max-w-xs">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Auto-expire After (days)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  className={inputCls}
                  value={bkSettings.autoExpireDays}
                  onChange={(e) => setBkSettings((s) => ({ ...s, autoExpireDays: Number(e.target.value) }))}
                />
                <p className="text-xs text-gray-400 mt-1">Pending requests automatically expire after this many days</p>
              </div>

              <div className="border-t border-gray-100 pt-5 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={bkSettings.shortStayEnabled}
                    onChange={(e) => setBkSettings((s) => ({ ...s, shortStayEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Allow short stays (1 day, 1 week, 15 days …)</p>
                    <p className="text-xs text-gray-400">Residents pick check-in and check-out dates and pay once for the whole stay, using the per-day / 7-day / 15-day rates in the Pricing tab. No monthly rent is generated for them.</p>
                  </div>
                </label>
                {bkSettings.shortStayEnabled && (
                  <div className="grid grid-cols-2 gap-3 max-w-xs">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Min days</label>
                      <input type="number" min={1} max={90} className={inputCls} value={bkSettings.shortStayMinDays}
                        onChange={(e) => setBkSettings((s) => ({ ...s, shortStayMinDays: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Max days</label>
                      <input type="number" min={1} max={90} className={inputCls} value={bkSettings.shortStayMaxDays}
                        onChange={(e) => setBkSettings((s) => ({ ...s, shortStayMaxDays: Number(e.target.value) }))} />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => saveBookingMut.mutate()}
                disabled={saveBookingMut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}
              >
                <Save size={14} />
                {saveBookingMut.isPending ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'rules' && activeHostelId && <PoliciesPanel hostelId={activeHostelId} />}

      {/* Placeholder for hostel basic info note */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
          <Building2 size={14} className="text-brand-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-800">Hostel Basic Info</p>
          <p className="text-xs text-brand-600 mt-0.5">
            To update hostel name, address, contact, and rent — go to <strong>Settings → General</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
