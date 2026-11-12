import { apiClient } from './client'

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getStaffDashboard = (hostelId: number) =>
  Promise.all([
    apiClient.get(`/payment/dues/hostel/${hostelId}/pending`).then((r) => r.data.data),
    apiClient.get(`/booking/requests?hostelId=${hostelId}`).then((r) => r.data.data),
    apiClient.get(`/hostellers/hostel/${hostelId}`).then((r) => r.data.data),
    apiClient.get(`/payment/records/hostel/${hostelId}`).then((r) => r.data.data),
    apiClient.get(`/complaints/hostel/${hostelId}`).then((r) => r.data.data),
  ]).then(([pendingDues, bookingRequests, members, payments, complaints]) => ({
    pendingDues, bookingRequests, members, payments, complaints,
  }))

// ─── Hostel Structure ─────────────────────────────────────────────────────────
export const getHostel = (hostelId: number) =>
  apiClient.get(`/hostels/${hostelId}`).then((r) => r.data.data)

export const updateHostel = (hostelId: number, data: Record<string, unknown>) =>
  apiClient.put(`/hostels/${hostelId}`, data).then((r) => r.data.data)

export const getFloors = (hostelId: number) =>
  apiClient.get(`/hostels/${hostelId}/floors`).then((r) => r.data.data)

// Full nested structure: floors → rooms → beds (with occupancy)
export const getHostelStructure = (hostelId: number) =>
  apiClient.get(`/hostels/${hostelId}/structure`).then((r) => r.data.data)

export const createFloor = (hostelId: number, data: Record<string, unknown>) =>
  apiClient.post(`/hostels/${hostelId}/floors`, data).then((r) => r.data.data)

export const renameFloor = (floorId: number, floorName: string) =>
  apiClient.put(`/floors/${floorId}`, { floorName }).then((r) => r.data.data)

export const getRooms = (floorId: number) =>
  apiClient.get(`/floors/${floorId}/rooms`).then((r) => r.data.data)

export const createRoom = (floorId: number, data: Record<string, unknown>) =>
  apiClient.post(`/floors/${floorId}/rooms`, data).then((r) => r.data.data)

// Create a room and auto-generate its beds in one call (staff)
export const createRoomWithBeds = (hostelId: number, floorId: number, data: Record<string, unknown>) =>
  apiClient.post(`/hostels/${hostelId}/floors/${floorId}/rooms-with-beds`, data).then((r) => r.data.data)

export const getBeds = (roomId: number) =>
  apiClient.get(`/rooms/${roomId}/beds`).then((r) => r.data.data)

export const createBed = (roomId: number, data: Record<string, unknown>) =>
  apiClient.post(`/rooms/${roomId}/beds`, data).then((r) => r.data.data)

// ─── Booking / Allocation ─────────────────────────────────────────────────────
export const getPendingAllocations = (hostelId: number) =>
  apiClient.get(`/booking/pending?hostelId=${hostelId}`).then((r) => r.data.data)

export const allocateBed = (data: Record<string, unknown>) =>
  apiClient.post('/booking/allocate', data).then((r) => r.data.data)

export const checkoutHosteller = (bookingId: number, data: Record<string, unknown>) =>
  apiClient.post(`/booking/${bookingId}/checkout`, data).then((r) => r.data.data)

// ─── Members ──────────────────────────────────────────────────────────────────
export const getMembers = (hostelId: number) =>
  apiClient.get(`/hostellers/hostel/${hostelId}`).then((r) => r.data.data)

export const getMemberById = (id: number) =>
  apiClient.get(`/hostellers/${id}`).then((r) => r.data.data)

export const updateMember = (id: number, data: Record<string, unknown>) =>
  apiClient.put(`/hostellers/${id}`, data).then((r) => r.data.data)

export const getEmergencyContact = (id: number) =>
  apiClient.get(`/hostellers/${id}/emergency-contact`).then((r) => r.data.data)

export const saveEmergencyContact = (id: number, data: Record<string, unknown>) =>
  apiClient.put(`/hostellers/${id}/emergency-contact`, data).then((r) => r.data.data)

// ─── Payments ─────────────────────────────────────────────────────────────────
export const getPendingDues = (hostelId: number) =>
  apiClient.get(`/payment/dues/hostel/${hostelId}/pending`).then((r) => r.data.data)

// All dues (paid + unpaid) for the hostel
export const getAllDues = (hostelId: number) =>
  apiClient.get(`/payment/dues/hostel/${hostelId}/all`).then((r) => r.data.data)

// All payment transactions received for the hostel
export const getPaymentRecords = (hostelId: number) =>
  apiClient.get(`/payment/records/hostel/${hostelId}`).then((r) => r.data.data)

export const recordCashPayment = (data: Record<string, unknown>) =>
  apiClient.post('/payment/cash', data).then((r) => r.data.data)

// ─── Payment settings, charges, reminders, UPI verification ─────────────────
export const getPaymentSettings = (hostelId: number) =>
  apiClient.get(`/payment/settings/hostel/${hostelId}`).then((r) => r.data.data)

export const updatePaymentSettings = (hostelId: number, data: Record<string, unknown>) =>
  apiClient.put(`/payment/settings/hostel/${hostelId}`, data).then((r) => r.data.data)

export const addCharge = (data: {
  hostelId: number; hostellerId?: number; applyToAll?: boolean; dueType: string
  amount: number; description?: string; dueDate?: string
}) => apiClient.post('/payment/dues/charge', data).then((r) => r.data.data)

export const waiveDue = (dueId: number) =>
  apiClient.delete(`/payment/dues/${dueId}`).then((r) => r.data.data)

export const sendDueReminder = (dueId: number) =>
  apiClient.post(`/payment/dues/${dueId}/remind`).then((r) => r.data.data)

// ─── Public listing, photos, enquiries ───────────────────────────────────────
export const getListing = (hostelId: number) =>
  apiClient.get(`/listing/hostel/${hostelId}`).then((r) => r.data.data)

export const updateListing = (hostelId: number, data: { listingEnabled?: boolean; slug?: string }) =>
  apiClient.put(`/listing/hostel/${hostelId}`, data).then((r) => r.data.data)

export const uploadListingPhoto = (hostelId: number, file: File, caption?: string) => {
  const fd = new FormData()
  fd.append('file', file)
  if (caption) fd.append('caption', caption)
  return apiClient.post(`/listing/hostel/${hostelId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data)
}

export const reorderListingPhotos = (hostelId: number, ids: number[]) =>
  apiClient.put(`/listing/hostel/${hostelId}/photos/order`, { ids }).then((r) => r.data.data)

export const setCoverPhoto = (photoId: number) =>
  apiClient.put(`/listing/photos/${photoId}/cover`).then((r) => r.data.data)

export const updatePhotoCaption = (photoId: number, caption: string) =>
  apiClient.put(`/listing/photos/${photoId}`, { caption }).then((r) => r.data.data)

export const deleteListingPhoto = (photoId: number) =>
  apiClient.delete(`/listing/photos/${photoId}`).then((r) => r.data.data)

export const getEnquiries = (hostelId: number, status?: string) =>
  apiClient.get(`/listing/hostel/${hostelId}/enquiries`, { params: { status } }).then((r) => r.data.data)

export const getEnquiryCounts = (hostelId: number) =>
  apiClient.get(`/listing/hostel/${hostelId}/enquiries/counts`).then((r) => r.data.data as Record<string, number>)

export const updateEnquiry = (id: number, data: Record<string, unknown>) =>
  apiClient.patch(`/listing/enquiries/${id}`, data).then((r) => r.data.data)

export const getEmailStatus = () =>
  apiClient.get('/notifications/email/status').then((r) => r.data.data as { enabled: boolean })

export const sendTestEmail = () =>
  apiClient.post('/notifications/email/test').then((r) => r.data.data as { to: string; enabled: boolean; sent: boolean; error?: string })

export const getPendingUpiClaims = (hostelId: number) =>
  apiClient.get(`/payment/upi/pending/hostel/${hostelId}`).then((r) => r.data.data)

export const confirmUpiClaim = (recordId: number) =>
  apiClient.post(`/payment/upi/${recordId}/confirm`).then((r) => r.data.data)

export const rejectUpiClaim = (recordId: number, reason?: string) =>
  apiClient.post(`/payment/upi/${recordId}/reject`, { reason }).then((r) => r.data.data)

export const generateDues = (hostelId: number, month: number, year: number) =>
  apiClient.post(`/payment/dues/generate?hostelId=${hostelId}&month=${month}&year=${year}`).then((r) => r.data.data)

// ─── Complaints ───────────────────────────────────────────────────────────────
export const getHostelComplaints = (hostelId: number) =>
  apiClient.get(`/complaints/hostel/${hostelId}`).then((r) => r.data.data)

export const resolveComplaint = (id: number, data: Record<string, unknown>) =>
  apiClient.put(`/complaints/${id}/resolve`, data).then((r) => r.data.data)

// ─── Maintenance ──────────────────────────────────────────────────────────────
export const getMaintenanceLogs = (hostelId: number) =>
  apiClient.get(`/complaints/maintenance/hostel/${hostelId}`).then((r) => r.data.data)

export const createMaintenance = (data: Record<string, unknown>) =>
  apiClient.post('/complaints/maintenance', data).then((r) => r.data.data)

export const resolveMaintenance = (id: number) =>
  apiClient.put(`/complaints/maintenance/${id}/resolve`).then((r) => r.data.data)

export const updateMaintenanceStatus = (id: number, status: string, actualCost?: number) =>
  apiClient.patch(`/complaints/maintenance/${id}/status`, { status, actualCost }).then((r) => r.data.data)

// ─── Expenses ────────────────────────────────────────────────────────────────
export const getExpenses = (hostelId: number, month?: number, year?: number) => {
  const params = new URLSearchParams()
  if (month) params.append('month', String(month))
  if (year) params.append('year', String(year))
  return apiClient.get(`/expense/hostel/${hostelId}?${params}`).then((r) => r.data.data)
}

export const getExpenseSummary = (hostelId: number, month?: number, year?: number) => {
  const params = new URLSearchParams()
  if (month) params.append('month', String(month))
  if (year) params.append('year', String(year))
  return apiClient.get(`/expense/hostel/${hostelId}/summary?${params}`).then((r) => r.data.data)
}

export const addExpense = (data: Record<string, unknown>) =>
  apiClient.post('/expense', data).then((r) => r.data.data)

// ─── Employees ────────────────────────────────────────────────────────────────
export const getEmployees = (hostelId: number) =>
  apiClient.get(`/employee/hostel/${hostelId}`).then((r) => r.data.data)

export const addEmployee = (data: Record<string, unknown>) =>
  apiClient.post('/employee', data).then((r) => r.data.data)

export const updateEmployee = (id: number, data: Record<string, unknown>) =>
  apiClient.put(`/employee/${id}`, data).then((r) => r.data.data)

export const removeEmployee = (id: number) =>
  apiClient.delete(`/employee/${id}`).then((r) => r.data.data)

export const recordSalary = (employeeId: number, data: Record<string, unknown>) =>
  apiClient.post(`/employee/${employeeId}/salary`, data).then((r) => r.data.data)

// Payroll summary: payable/paid/pending per employee for a month
export const getPayrollSummary = (hostelId: number, month: number, year: number) =>
  apiClient.get(`/employee/payroll/hostel/${hostelId}?month=${month}&year=${year}`).then((r) => r.data.data)

// Occupancy from leave requests for a date range
export const getLeaveOccupancy = (hostelId: number, from: string, to: string) =>
  apiClient.get(`/leaves/occupancy?hostelId=${hostelId}&from=${from}&to=${to}`).then((r) => r.data.data)

// ─── Leave ────────────────────────────────────────────────────────────────────
export const getPendingLeaves = () =>
  apiClient.get('/leaves/pending').then((r) => r.data.data)

// All leave requests (pending + reviewed) for residents of one hostel.
// Falls back to the legacy pending-only list on an API build without /leaves/hostel/{id}.
export const getHostelLeaves = (hostelId: number) =>
  apiClient.get(`/leaves/hostel/${hostelId}`).then((r) => r.data.data)
    .catch((e) => {
      if (e?.response?.status === 404 || e?.response?.status === 500) return getPendingLeaves()
      throw e
    })

export const reviewLeave = (id: number, data: { status: string; reviewedBy?: string }) =>
  apiClient.put(`/leaves/${id}/review`, data).then((r) => r.data.data)

// ─── Menu ─────────────────────────────────────────────────────────────────────
export const getMenuForHostel = (hostelId: number, weekStart?: string) => {
  const path = weekStart
    ? `/menu/week?hostelId=${hostelId}&weekStart=${weekStart}`
    : `/menu/current?hostelId=${hostelId}`
  return apiClient.get(path).then((r) => r.data.data)
}

export const getMenuItems = (menuId: number) =>
  apiClient.get(`/menu/${menuId}/items`).then((r) => r.data.data)

export const saveMenu = (data: Record<string, unknown>) =>
  apiClient.post('/menu', data).then((r) => r.data.data)

// ─── Announcements ────────────────────────────────────────────────────────────
export const getAllAnnouncements = (hostelId: number) =>
  apiClient.get(`/announcements/hostel/${hostelId}/all`).then((r) => r.data.data)

export const createAnnouncement = (data: Record<string, unknown>) =>
  apiClient.post('/announcements', data).then((r) => r.data.data)

export const deleteAnnouncement = (id: number) =>
  apiClient.delete(`/announcements/${id}`).then((r) => r.data.data)

// ─── Occupancy ────────────────────────────────────────────────────────────────
export const getOccupancyFloors = (hostelId: number) =>
  apiClient.get(`/hostels/${hostelId}/floors`).then((r) => r.data.data)

// ─── Parking ──────────────────────────────────────────────────────────────────
export const getHostelParking = (hostelId: number) =>
  apiClient.get(`/parking/hostel/${hostelId}`).then((r) => r.data.data)

export const updateParkingSlot = (recordId: number, slotNumber: string) =>
  apiClient.patch(`/parking/${recordId}/slot?slotNumber=${encodeURIComponent(slotNumber)}`).then((r) => r.data.data)

export const removeParking = (recordId: number) =>
  apiClient.delete(`/parking/${recordId}`).then((r) => r.data.data)

// ─── Cleaning ─────────────────────────────────────────────────────────────────
export const getHostelCleaning = (hostelId: number, status?: string) => {
  const qs = status ? `?status=${status}` : ''
  return apiClient.get(`/cleaning/hostel/${hostelId}${qs}`).then((r) => r.data.data)
}

export const updateCleaningStatus = (requestId: number, status: string) =>
  apiClient.patch(`/cleaning/${requestId}/status`, { status }).then((r) => r.data.data)

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const getReviews = (hostelId: number) =>
  apiClient.get(`/reviews/hostel/${hostelId}`).then((r) => r.data.data?.reviews ?? r.data.data ?? [])

// ─── Booking Requests ──────────────────────────────────────────────────────────
export const getBookingRequests = (hostelId: number, status?: string) => {
  const qs = status ? `&status=${status}` : ''
  return apiClient.get(`/booking/requests?hostelId=${hostelId}${qs}`).then((r) => r.data.data)
}

export const approveBookingRequest = (id: number, data: Record<string, unknown>) =>
  apiClient.post(`/booking/request/${id}/approve`, data).then((r) => r.data.data)

export const rejectBookingRequest = (id: number, reason: string) =>
  apiClient.put(`/booking/request/${id}/reject`, { reason }).then((r) => r.data.data)

export const reassignBookingRequest = (bookingRequestId: number, newBedId: number) =>
  apiClient.post('/booking/reassign', { bookingRequestId, newBedId }).then((r) => r.data.data)

export const getHostelAmenities = (hostelId: number) =>
  apiClient.get(`/hostels/${hostelId}/amenities`).then((r) => r.data.data)

export const updateHostelAmenities = (hostelId: number, amenities: { key: string; enabled: boolean }[]) =>
  apiClient.put(`/hostels/${hostelId}/amenities`, { amenities }).then((r) => r.data.data)

export const getHostelPricing = (hostelId: number) =>
  apiClient.get(`/hostels/${hostelId}/pricing`).then((r) => r.data.data)

export const updateHostelPricing = (hostelId: number, tiers: Record<string, unknown>[]) =>
  apiClient.put(`/hostels/${hostelId}/pricing`, tiers).then((r) => r.data.data)

export const getBookingSettings = (hostelId: number) =>
  apiClient.get(`/hostels/${hostelId}/booking-settings`).then((r) => r.data.data)

export const updateBookingSettings = (hostelId: number, data: Record<string, unknown>) =>
  apiClient.put(`/hostels/${hostelId}/booking-settings`, data).then((r) => r.data.data)

export const getFloorsWithAvailability = (hostelId: number) =>
  apiClient.get(`/hostels/${hostelId}/floors-with-availability`).then((r) => r.data.data)

export const getRoomsWithAvailability = (floorId: number) =>
  apiClient.get(`/floors/${floorId}/rooms-with-availability`).then((r) => r.data.data)

export const getBedsByRoom = (roomId: number) =>
  apiClient.get(`/rooms/${roomId}/beds`).then((r) => r.data.data)

// ─── Staff Management ─────────────────────────────────────────────────────────
export const getStaffMembers = (hostelId: number) =>
  apiClient.get(`/staff/hostel/${hostelId}`).then((r) => r.data.data)

export const createStaffMember = (data: Record<string, unknown>) =>
  apiClient.post('/staff', data).then((r) => r.data.data)

export const updateStaffMember = (assignmentId: number, data: Record<string, unknown>) =>
  apiClient.put(`/staff/${assignmentId}`, data).then((r) => r.data.data)

export const changeStaffPassword = (currentPassword: string, newPassword: string) =>
  apiClient.put('/staff/me/password', { currentPassword, newPassword }).then((r) => r.data.data)

export const deactivateStaffMember = (assignmentId: number) =>
  apiClient.delete(`/staff/${assignmentId}`).then((r) => r.data.data)
