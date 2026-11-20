import { apiClient } from './client'

const d = (r: { data: { data: any } }) => r.data.data

// ═══ Section 4: resident experience ═══════════════════════════════════════

// Mess — resident
export const getMyMeals = () => apiClient.get('/mess/my').then(d)
export const setMealSkip = (date: string, meal: string, skip: boolean) => apiClient.put('/mess/my/skip', { date, meal, skip }).then(d)
export const rateMeal = (date: string, meal: string, rating: number, comment?: string) =>
  apiClient.put('/mess/my/rating', { date, meal, rating, comment }).then(d)
export const getMySuggestions = () => apiClient.get('/mess/suggestions/my').then(d)
export const suggestDish = (dish: string) => apiClient.post('/mess/suggestions', { dish }).then(d)
export const voteDish = (id: number, up: boolean) => apiClient.put(`/mess/suggestions/${id}/vote`, { up }).then(d)

// Mess — staff
export const getMessSettings = (hostelId: number) => apiClient.get(`/mess/hostel/${hostelId}/settings`).then(d)
export const saveMessSettings = (hostelId: number, data: Record<string, unknown>) => apiClient.put(`/mess/hostel/${hostelId}/settings`, data).then(d)
export const getHeadcount = (hostelId: number, date: string) => apiClient.get(`/mess/hostel/${hostelId}/headcount`, { params: { date } }).then(d)
export const getMessBill = (hostelId: number, year: number, month: number) => apiClient.get(`/mess/hostel/${hostelId}/bill`, { params: { year, month } }).then(d)
export const runMessBill = (hostelId: number, year: number, month: number) => apiClient.post(`/mess/hostel/${hostelId}/bill`, { year, month }).then(d)
export const getMessBills = (hostelId: number) => apiClient.get(`/mess/hostel/${hostelId}/bills`).then(d)
export const getMealRatings = (hostelId: number) => apiClient.get(`/mess/hostel/${hostelId}/ratings`).then(d)
export const getDishSuggestions = (hostelId: number) => apiClient.get(`/mess/hostel/${hostelId}/suggestions`).then(d)
export const closeDishSuggestion = (id: number, status: 'ADDED' | 'DISMISSED') => apiClient.put(`/mess/suggestions/${id}/status`, { status }).then(d)

// Complaint SLAs
export const getComplaintSla = (hostelId: number) => apiClient.get(`/complaints/sla/hostel/${hostelId}`).then(d)
export const saveComplaintSla = (hostelId: number, targets: Record<string, number>) => apiClient.put(`/complaints/sla/hostel/${hostelId}`, targets).then(d)
export const rateComplaint = (id: number, rating: number, feedback?: string) => apiClient.put(`/complaints/${id}/rating`, { rating, feedback }).then(d)

// Visitors
export const getMyVisitors = () => apiClient.get('/gate/visitors/my').then(d)
export const addMyVisitor = (data: Record<string, unknown>) => apiClient.post('/gate/visitors/my', data).then(d)
export const cancelMyVisitor = (id: number) => apiClient.post(`/gate/visitors/my/${id}/cancel`).then(d)
export const getVisitors = (hostelId: number, date: string) => apiClient.get(`/gate/visitors/hostel/${hostelId}`, { params: { date } }).then(d)
export const findVisitorByCode = (hostelId: number, code: string) => apiClient.get(`/gate/visitors/hostel/${hostelId}/code/${encodeURIComponent(code)}`).then(d)
export const addWalkIn = (hostelId: number, data: Record<string, unknown>) => apiClient.post(`/gate/visitors/hostel/${hostelId}/walk-in`, data).then(d)
export const visitorCheckIn = (id: number) => apiClient.post(`/gate/visitors/${id}/check-in`).then(d)
export const visitorCheckOut = (id: number) => apiClient.post(`/gate/visitors/${id}/check-out`).then(d)
export const cancelVisitor = (id: number) => apiClient.post(`/gate/visitors/${id}/cancel`).then(d)

// Parcels
export const getMyParcels = () => apiClient.get('/gate/parcels/my').then(d)
export const getParcels = (hostelId: number) => apiClient.get(`/gate/parcels/hostel/${hostelId}`).then(d)
export const logParcel = (hostelId: number, data: Record<string, unknown>) => apiClient.post(`/gate/parcels/hostel/${hostelId}`, data).then(d)
export const collectParcel = (id: number, collectedBy?: string) => apiClient.post(`/gate/parcels/${id}/collect`, { collectedBy }).then(d)

// ═══ Section 5: owner operations ══════════════════════════════════════════

export const getAttendanceDay = (hostelId: number, date: string) => apiClient.get(`/ops/attendance/hostel/${hostelId}`, { params: { date } }).then(d)
export const saveAttendance = (hostelId: number, date: string, entries: Record<string, unknown>[]) =>
  apiClient.put(`/ops/attendance/hostel/${hostelId}`, { date, entries }).then(d)
export const getAttendanceMonth = (hostelId: number, year: number, month: number) =>
  apiClient.get(`/ops/attendance/hostel/${hostelId}/month`, { params: { year, month } }).then(d)

export const getMeterMonth = (hostelId: number, type: string, year: number, month: number) =>
  apiClient.get(`/ops/meters/hostel/${hostelId}`, { params: { type, year, month } }).then(d)
export const saveMeterReading = (hostelId: number, data: Record<string, unknown>) => apiClient.put(`/ops/meters/hostel/${hostelId}`, data).then(d)
export const deleteMeterReading = (id: number) => apiClient.delete(`/ops/meters/${id}`).then(d)
export const billMeters = (hostelId: number, type: string, year: number, month: number) =>
  apiClient.post(`/ops/meters/hostel/${hostelId}/bill`, { type, year, month }).then(d)

export const getInsights = (hostelId: number) => apiClient.get(`/ops/insights/hostel/${hostelId}`).then(d)

// ═══ Section 6: plans & billing ═══════════════════════════════════════════

export const getMyPlan = () => apiClient.get('/platform/plan').then(d)
export const getMyPlanPayments = () => apiClient.get('/platform/plan/payments').then(d)
export const getPlanQuote = (beds: number, months: number) => apiClient.get('/platform/plan/quote', { params: { beds, months } }).then(d)
export const startPlanCheckout = (beds: number, months: number) => apiClient.post('/platform/plan/checkout', { beds, months }).then(d)
export const verifyPlanPayment = (data: Record<string, unknown>) => apiClient.post('/platform/plan/verify', data).then(d)

export const getPlatformSettings = () => apiClient.get('/platform/settings').then(d)
export const savePlatformSettings = (data: Record<string, unknown>) => apiClient.put('/platform/settings', data).then(d)
export const getPlatformPayments = () => apiClient.get('/platform/payments').then(d)
export const getOwnerPlan = (ownerId: number) => apiClient.get(`/platform/owners/${ownerId}/plan`).then(d)
export const recordOwnerPayment = (ownerId: number, data: Record<string, unknown>) => apiClient.post(`/platform/owners/${ownerId}/manual-payment`, data).then(d)

// ─── shared helpers ───────────────────────────────────────────────────────

export const MEAL_LABEL: Record<string, string> = { BREAKFAST: 'Breakfast', LUNCH: 'Lunch', DINNER: 'Dinner' }
export const errMsg = (e: any, fallback = 'Please try again.') => e?.response?.data?.message ?? fallback
/** Today's date in India as yyyy-mm-dd. */
export const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)
export const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10)
export const fmtDay = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
export const fmtTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '')
export const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''
/** Previous calendar month as {year, month}. */
export const lastMonth = () => {
  const t = new Date(todayIST())
  t.setUTCDate(1)
  t.setUTCMonth(t.getUTCMonth() - 1)
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1 }
}
