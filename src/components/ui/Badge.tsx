const GREEN  = { bg: 'bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-700' }
const AMBER  = { bg: 'bg-amber-50',   dot: 'bg-amber-400',   text: 'text-amber-700' }
const RED    = { bg: 'bg-red-50',     dot: 'bg-red-500',     text: 'text-red-600' }
const GRAY   = { bg: 'bg-gray-100',   dot: 'bg-gray-400',    text: 'text-gray-500' }
const BRAND  = { bg: 'bg-brand-50',   dot: 'bg-brand-500',   text: 'text-brand-700' }

const CONFIG: Record<string, { bg: string; dot: string; text: string; label?: string }> = {
  // Complaints / maintenance
  OPEN:            { ...AMBER },
  IN_PROGRESS:     { ...BRAND, label: 'In Progress' },
  RESOLVED:        { ...GREEN },
  CLOSED:          { ...GRAY },
  COMPLETED:       { ...GREEN },
  SCHEDULED:       { ...BRAND },
  // Payments
  PENDING:         { ...AMBER },
  PAID:            { ...GREEN },
  UNPAID:          { ...AMBER },
  OVERDUE:         { ...RED },
  PARTIAL:         { ...AMBER },
  PENDING_VERIFICATION: { ...AMBER, label: 'Verifying' },
  SUCCESS:         { ...GREEN },
  FAILED:          { ...RED },
  // Generic lifecycle
  ACTIVE:          { ...GREEN },
  INACTIVE:        { ...GRAY },
  SUSPENDED:       { ...RED },
  APPROVED:       { ...GREEN },
  REJECTED:        { ...RED },
  CANCELLED:       { ...GRAY },
  EXPIRED:         { ...GRAY },
  ALLOCATED:       { ...BRAND },
  // Booking request lifecycle
  PENDING_APPROVAL:{ ...AMBER, label: 'Pending Approval' },
  REASSIGNED:      { ...BRAND },
  // Bed statuses
  AVAILABLE:       { ...GREEN },
  RESERVED:        { ...AMBER, label: 'Allocated · Waiting' },
  OCCUPIED:        { ...RED },
}

const DEFAULT = { bg: 'bg-gray-100', dot: 'bg-gray-400', text: 'text-gray-500' }

export default function Badge({ status }: { status?: string | null }) {
  if (!status) return null
  const cfg = CONFIG[status] ?? DEFAULT
  const label = cfg.label ?? status.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {label}
    </span>
  )
}
