import { apiClient } from './client'

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getSADashboard = () =>
  apiClient.get('/admin/dashboard').then((r) => r.data.data)

// ─── Owners ───────────────────────────────────────────────────────────────────
export const getOwners = (page = 0, size = 20, search = '', status = 'ALL') => {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (search.trim()) params.append('search', search.trim())
  if (status && status !== 'ALL') params.append('status', status)
  return apiClient.get(`/admin/owners?${params}`).then((r) => r.data.data)
}

export const getOwnerById = (id: number) =>
  apiClient.get(`/admin/owners/${id}`).then((r) => r.data.data)

export const createOwner = (data: Record<string, unknown>) =>
  apiClient.post('/admin/owners', data).then((r) => r.data.data)

export const suspendOwner = (id: number) =>
  apiClient.put(`/admin/owners/${id}/suspend`).then((r) => r.data.data)

export const activateOwner = (id: number) =>
  apiClient.put(`/admin/owners/${id}/activate`).then((r) => r.data.data)

export const resetOwnerPassword = (id: number, newPassword: string) =>
  apiClient.put(`/admin/owners/${id}/reset-password`, { newPassword }).then((r) => r.data.data)

// ─── Hostels for owner ────────────────────────────────────────────────────────
export const getOwnerHostels = (ownerId: number) =>
  apiClient.get(`/owners/${ownerId}/hostels`).then((r) => r.data.data)

// ─── Subscription ─────────────────────────────────────────────────────────────
export const getSubscription = (ownerId: number) =>
  apiClient.get(`/admin/subscription/${ownerId}`).then((r) => r.data.data)

export const upsertSubscription = (data: Record<string, unknown>) =>
  apiClient.post('/admin/subscription', data).then((r) => r.data.data)

// ─── Feature Flags ────────────────────────────────────────────────────────────
/** Returns only the ENABLED flags of an owner; any known flag not in the list is disabled. */
export const getFeatureFlags = (ownerId: number) =>
  apiClient.get(`/admin/flags/${ownerId}`).then((r) => r.data.data)

export const setFeatureFlag = (data: { ownerId: number; flagName: string; enabled: boolean; reason?: string }) =>
  apiClient.post('/admin/flags', data).then((r) => r.data.data)

// ─── Reports ──────────────────────────────────────────────────────────────────
export const getRevenueReport = (month?: number, year?: number) => {
  const params = new URLSearchParams()
  if (month) params.append('month', String(month))
  if (year) params.append('year', String(year))
  const qs = params.toString()
  return apiClient.get(`/admin/reports/revenue${qs ? '?' + qs : ''}`).then((r) => r.data.data)
}

export const getOccupancyReport = () =>
  apiClient.get('/admin/reports/occupancy').then((r) => r.data.data)

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const getAuditLogs = (hostelId: number, page = 0, size = 20) =>
  apiClient.get(`/admin/audit/hostel/${hostelId}?page=${page}&size=${size}`).then((r) => r.data.data)

/** Super-admin actions taken on an owner (suspend, plan change, flags, password reset...). */
export const getOwnerAuditLogs = (ownerId: number, page = 0, size = 20) =>
  apiClient.get(`/admin/audit/owner/${ownerId}?page=${page}&size=${size}`).then((r) => r.data.data)

// ─── Complaints (platform-wide) ───────────────────────────────────────────────
export const getAllComplaints = () =>
  apiClient.get('/admin/complaints').then((r) => r.data.data)

// ─── Own account ──────────────────────────────────────────────────────────────
export const getSAAccount = () =>
  apiClient.get('/admin/account').then((r) => r.data.data)

export const changeSAPassword = (currentPassword: string, newPassword: string) =>
  apiClient.put('/admin/account/password', { currentPassword, newPassword }).then((r) => r.data)

// ─── Shared constants ─────────────────────────────────────────────────────────
/** Plans and limits exactly as the backend applies them (SuperAdminService.PLAN_LIMITS). */
export const PLANS = [
  { id: 'FREE', name: 'Free', price: '₹0/mo', maxHostels: 1, maxBeds: 30, priceMonthly: 0 },
  { id: 'STARTER', name: 'Starter', price: '₹999/mo', maxHostels: 1, maxBeds: 75, priceMonthly: 999 },
  { id: 'PROFESSIONAL', name: 'Professional', price: '₹2,999/mo', maxHostels: 3, maxBeds: 200, priceMonthly: 2999 },
  { id: 'ENTERPRISE', name: 'Enterprise', price: '₹7,999/mo', maxHostels: 10, maxBeds: 1000, priceMonthly: 7999 },
] as const

export const PLAN_CHIP: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-500',
  STARTER: 'bg-gray-100 text-gray-600',
  PROFESSIONAL: 'bg-brand-50 text-brand-700',
  ENTERPRISE: 'bg-violet-50 text-violet-700',
}

/** Feature flags known to the platform (backend flag_name -> label). */
export const FEATURE_FLAGS: { id: string; label: string }[] = [
  { id: 'online_payment', label: 'Online Payments' },
  { id: 'referral_program', label: 'Referral Program' },
  { id: 'parking_management', label: 'Parking Management' },
  { id: 'cleaning_requests', label: 'Cleaning Requests' },
  { id: 'weekly_menu', label: 'Weekly Menu' },
  { id: 'hostel_reviews', label: 'Hostel Reviews' },
]

/** Error message from an API error (axios), with a fallback. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string; data?: Record<string, string> | null } } }
  const data = e?.response?.data
  if (data?.data && typeof data.data === 'object') {
    const first = Object.values(data.data).find((v) => typeof v === 'string')
    if (first) return first
  }
  return data?.message ?? fallback
}
