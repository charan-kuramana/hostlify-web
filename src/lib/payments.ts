import { apiClient } from '../api/client'

export const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const DUE_TYPE_LABEL: Record<string, string> = {
  RENT: 'Rent',
  DEPOSIT: 'Deposit',
  MESS: 'Mess',
  ELECTRICITY: 'Electricity',
  FINE: 'Fine',
  LATE_FEE: 'Late fee',
  OTHER: 'Other',
}

export const DUE_TYPE_STYLE: Record<string, string> = {
  RENT: 'bg-brand-50 text-brand-700',
  DEPOSIT: 'bg-purple-50 text-purple-700',
  MESS: 'bg-amber-50 text-amber-700',
  ELECTRICITY: 'bg-yellow-50 text-yellow-700',
  FINE: 'bg-rose-50 text-rose-700',
  LATE_FEE: 'bg-red-50 text-red-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

/** Charge types staff can add by hand (rent is generated, late fee is automatic). */
export const MANUAL_CHARGE_TYPES = ['MESS', 'ELECTRICITY', 'DEPOSIT', 'FINE', 'OTHER'] as const

export const inr = (n: unknown) => '₹' + Number(n ?? 0).toLocaleString('en-IN')
export const periodOf = (d: { periodMonth?: number; periodYear?: number }) =>
  d.periodMonth ? `${MONTHS[d.periodMonth]} ${d.periodYear}` : '—'
export const dueTitle = (d: { dueType?: string; periodMonth?: number; periodYear?: number }) =>
  `${DUE_TYPE_LABEL[d.dueType ?? 'RENT'] ?? 'Charge'} · ${periodOf(d)}`

/** Amount still owed on a due (excludes successful payments). */
export const outstandingOf = (d: { amount?: unknown; paidAmount?: unknown }) =>
  Math.max(0, Number(d.amount ?? 0) - Number(d.paidAmount ?? 0))

/** Financial year (Apr–Mar) start year for a date: Nov 2026 -> 2026, Feb 2027 -> 2026. */
export const fyStartYear = (date = new Date()) => (date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1)

/** Downloads a PDF from an authenticated endpoint (axios adds the token). */
export async function downloadPdf(path: string, filename: string) {
  const res = await apiClient.get(path, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Reads the server's error message from a blob error response (PDF endpoints). */
export async function blobErrorMessage(e: any, fallback: string): Promise<string> {
  try {
    const data = e?.response?.data
    if (data instanceof Blob) return JSON.parse(await data.text())?.message ?? fallback
    return data?.message ?? fallback
  } catch {
    return fallback
  }
}

/** upi://pay deep link: opens GPay / PhonePe / Paytm with payee + amount filled in. */
export function upiLink(opts: { upiId: string; payeeName?: string; amount: number; note: string }) {
  const p = new URLSearchParams({
    pa: opts.upiId,
    pn: opts.payeeName || 'Hostel',
    am: opts.amount.toFixed(2),
    cu: 'INR',
    tn: opts.note.slice(0, 50),
  })
  return `upi://pay?${p.toString()}`
}

/** WhatsApp one-tap link (free): opens the owner's own WhatsApp with the message typed in. */
export function whatsappLink(mobile: string | undefined | null, text: string) {
  const digits = (mobile ?? '').replace(/\D/g, '')
  const intl = digits.length === 10 ? '91' + digits : digits.replace(/^0+/, '')
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`
}
