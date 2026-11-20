/** Labels and formatters shared by the stay-terms, safety and housekeeping screens. */
export const SAFETY_LABELS: Record<string, string> = {
  CCTV: 'CCTV',
  SECURITY_GUARD: 'Security guard',
  BIOMETRIC_ENTRY: 'Biometric / card entry',
  WOMEN_WARDEN: 'Woman warden',
  FIRE_EXTINGUISHERS: 'Fire extinguishers',
  FIRE_NOC: 'Fire NOC',
  EMERGENCY_EXIT: 'Emergency exit',
  FIRST_AID: 'First-aid kit',
  STAFF_VERIFIED: 'Staff police-verified',
  WELL_LIT_ENTRANCE: 'Well-lit entrance',
}

export const GUEST_LABELS: Record<string, string> = {
  NOT_ALLOWED: 'Guests are not allowed inside',
  DAYTIME: 'Guests allowed in the daytime only',
  OVERNIGHT_WITH_APPROVAL: 'Overnight guests allowed with approval',
}

export const DAY_LABELS: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' }

export const rupees = (v: unknown) => '₹' + Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export const fmtTime = (hhmm?: string | null) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}
