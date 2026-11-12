import axios from 'axios'
import { apiClient } from './client'

// ─── Booking / Profile ────────────────────────────────────────────────────────
export const getMyBooking = () =>
  apiClient.get('/booking/me').then((r) => r.data.data)

/** True when the API answered 404 — i.e. "nothing yet" (no booking / no due / no request). */
export const isNotFound = (err: any) => err?.response?.status === 404

/** react-query retry policy: never retry a 404 ("nothing yet"), retry other failures twice. */
export const retryUnless404 = (count: number, err: any) => !isNotFound(err) && count < 2

/**
 * Active booking enriched with display names (hostel / floor / room / bed).
 * /booking/me returns only ids, so resolve names from the hostel-detail + room-availability endpoints.
 */
export const getMyStay = async () => {
  const b = await getMyBooking()
  if (!b) return b
  const [hostel, rooms] = await Promise.all([
    b.hostelName && b.floorName ? null : getHostelDetail(b.hostelId).catch(() => null),
    b.roomName && b.bedName ? [] : (b.floorId ? getRoomsWithAvailability(b.floorId).catch(() => []) : []),
  ])
  const room = ((rooms ?? []) as any[]).find((r: any) => (r.id ?? r.roomId) === b.roomId)
  const bed = room?.beds?.find((x: any) => x.id === b.bedId)
  const floor = hostel?.floors?.find((f: any) => (f.floorId ?? f.id) === b.floorId)
  return {
    ...b,
    hostelName: b.hostelName ?? hostel?.name,
    floorName: b.floorName ?? floor?.floorName,
    roomName: b.roomName ?? room?.roomName,
    bedName: b.bedName ?? bed?.bedName,
    roomType: b.roomType ?? room?.roomType,
  }
}

export const getHostellerProfile = (id: number) =>
  apiClient.get(`/hostellers/${id}`).then((r) => r.data.data)

export const updateHostellerProfile = (id: number, data: Record<string, unknown>) =>
  apiClient.put(`/hostellers/${id}`, data).then((r) => r.data.data)

export const getEmergencyContact = (id: number) =>
  apiClient.get(`/hostellers/${id}/emergency-contact`).then((r) => r.data.data)

export const saveEmergencyContact = (id: number, data: Record<string, unknown>) =>
  apiClient.put(`/hostellers/${id}/emergency-contact`, data).then((r) => r.data.data)

export const uploadProfilePhoto = (hostellerId: number, file: File) => {
  const fd = new FormData(); fd.append('file', file)
  return apiClient.post(`/hostellers/profile/photo?hostellerId=${hostellerId}`, fd,
    { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data)
}

export const uploadIdProof = (hostellerId: number, file: File) => {
  const fd = new FormData(); fd.append('file', file)
  return apiClient.post(`/hostellers/profile/id-proof?hostellerId=${hostellerId}`, fd,
    { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data)
}

// ─── Payment / Dues ───────────────────────────────────────────────────────────
export const getCurrentDue = () =>
  apiClient.get('/payment/dues/current').then((r) => r.data.data)

export const getDuesHistory = () =>
  apiClient.get('/payment/dues/history').then((r) => r.data.data)

// My actual payment transactions (records)
export const getMyPaymentRecords = () =>
  apiClient.get('/payment/records/my').then((r) => r.data.data)

// Returns Razorpay checkout info: { keyId, orderId, amountPaise, currency, dueId, hostellerName, description }
export const initiateRazorpay = (dueId: number) =>
  apiClient.post('/payment/razorpay/initiate', { dueId }).then((r) => r.data.data)

// How to pay (hostel UPI ID) + the hostel's late-fee policy
export const getMyPaymentSettings = () =>
  apiClient.get('/payment/settings/my').then((r) => r.data.data)

// "I paid by UPI" — staff confirm it against the owner's UPI app
export const submitUpiClaim = (payload: { dueId: number; amount: number; utr: string }) =>
  apiClient.post('/payment/upi/claim', payload).then((r) => r.data.data)

// Verify the checkout signature server-side and capture the payment
export const verifyRazorpay = (payload: { razorpayPaymentId: string; razorpayOrderId: string; razorpaySignature: string }) =>
  apiClient.post('/payment/razorpay/verify', payload).then((r) => r.data.data)

// ─── Complaints ───────────────────────────────────────────────────────────────
export const getMyComplaints = (hostellerProfileId: number) =>
  apiClient.get(`/complaints/hosteller/${hostellerProfileId}`).then((r) => r.data.data)

export const createComplaint = (data: Record<string, unknown>) =>
  apiClient.post('/complaints', data).then((r) => r.data.data)

// ─── Announcements ────────────────────────────────────────────────────────────
export const getAnnouncements = (hostelId: number) =>
  apiClient.get(`/announcements/hostel/${hostelId}`).then((r) => r.data.data)

// ─── Menu ─────────────────────────────────────────────────────────────────────
export const getCurrentMenu = (hostelId: number) =>
  apiClient.get(`/menu/current?hostelId=${hostelId}`).then((r) => r.data.data)

export const getMenuItems = (menuId: number) =>
  apiClient.get(`/menu/${menuId}/items`).then((r) => r.data.data)

// ─── Leave ────────────────────────────────────────────────────────────────────
export const getMyLeaves = (hostellerProfileId: number) =>
  apiClient.get(`/leaves/hosteller/${hostellerProfileId}`).then((r) => r.data.data)

export const applyLeave = (data: Record<string, unknown>) =>
  apiClient.post('/leaves', data).then((r) => r.data.data)

// ─── Referral ─────────────────────────────────────────────────────────────────
export const getMyReferralCode = () =>
  apiClient.get('/referral/my-code').then((r) => r.data.data)

export const getMyReferrals = () =>
  apiClient.get('/referral/my-referrals').then((r) => r.data.data)

// ─── Parking ──────────────────────────────────────────────────────────────────
export const getMyParking = () =>
  apiClient.get('/parking/me').then((r) => r.data.data)

export const registerParking = (data: Record<string, unknown>) =>
  apiClient.post('/parking', data).then((r) => r.data.data)

export const deregisterParking = (recordId: number) =>
  apiClient.delete(`/parking/${recordId}`).then((r) => r.data.data)

// ─── Cleaning ─────────────────────────────────────────────────────────────────
export const getMyCleaning = () =>
  apiClient.get('/cleaning/me').then((r) => r.data.data)

export const requestCleaning = (data: Record<string, unknown>) =>
  apiClient.post('/cleaning', data).then((r) => r.data.data)

export const cancelCleaning = (requestId: number) =>
  apiClient.patch(`/cleaning/${requestId}/cancel`).then((r) => r.data.data)

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const submitReview = (data: { rating: number; reviewText: string }) =>
  apiClient.post('/reviews', data).then((r) => r.data.data)

// { hostelId, totalReviews, averageRating, reviews: [...] } — visible reviews only
export const getHostelReviews = (hostelId: number) =>
  apiClient.get(`/reviews/hostel/${hostelId}`).then((r) => r.data.data)

// ─── Referral (applied right after signup, with the new account's token) ─────
// Uses plain axios so the interceptor can't swap in some other stored session's token.
export const applyReferralCode = (code: string, hostellerId: number, accessToken: string) =>
  axios.post(`${apiClient.defaults.baseURL}/referral/validate`, { code, hostellerId: String(hostellerId) },
    { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.data.data)

// ─── Hostel Discovery ─────────────────────────────────────────────────────────
export const getNearbyHostels = (lat: number, lng: number, radius = 10) =>
  apiClient.get(`/hostel/nearby?lat=${lat}&lng=${lng}&radius=${radius}`).then((r) => r.data.data)

export const searchHostels = (city?: string, roomType?: string, maxRent?: number) => {
  const params = new URLSearchParams()
  if (city) params.append('city', city)
  if (roomType) params.append('roomType', roomType)
  if (maxRent) params.append('maxRent', String(maxRent))
  return apiClient.get(`/hostel/search?${params}`).then((r) => r.data.data)
}

export const getHostelDetail = (hostelId: number) =>
  apiClient.get(`/hostels/${hostelId}/detail`).then((r) => r.data.data)

export const getFloorsWithAvailability = (hostelId: number) =>
  apiClient.get(`/hostels/${hostelId}/floors-with-availability`).then((r) => r.data.data)

export const getRoomsWithAvailability = (floorId: number) =>
  apiClient.get(`/floors/${floorId}/rooms-with-availability`).then((r) => r.data.data)

export const getBedsByRoom = (roomId: number) =>
  apiClient.get(`/rooms/${roomId}/beds`).then((r) => r.data.data)

export const submitBookingRequest = (data: Record<string, unknown>) =>
  apiClient.post('/booking/request', data).then((r) => r.data.data)

export const getMyBookingRequest = () =>
  apiClient.get('/booking/request/my').then((r) => r.data.data)

export const cancelBookingRequest = (id: number) =>
  apiClient.delete(`/booking/request/${id}`).then((r) => r.data.data)

export const getProfileCompletion = () =>
  apiClient.get('/hostellers/profile/completion').then((r) => r.data.data)
