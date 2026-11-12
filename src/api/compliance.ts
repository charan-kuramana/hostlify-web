import { apiClient } from './client'

const d = (r: { data: { data: any } }) => r.data.data

// ─── Aadhaar Secure QR ─────────────────────────────────────────────────────
export const getAadhaarSetup = () => apiClient.get('/compliance/aadhaar/setup').then(d)
export const getMyAadhaarStatus = () => apiClient.get('/compliance/aadhaar/status/my').then(d)

/** file = photo/screenshot of the QR, or the e-Aadhaar PDF (+ password). Staff pass hostellerId. */
export const verifyAadhaar = (opts: { file: File; password?: string; hostellerId?: number; consent: boolean }) => {
  const fd = new FormData()
  fd.append('file', opts.file)
  if (opts.password) fd.append('password', opts.password)
  if (opts.hostellerId) fd.append('hostellerId', String(opts.hostellerId))
  fd.append('consent', String(opts.consent))
  return apiClient.post('/compliance/aadhaar/verify', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(d)
}
export const confirmAadhaarPhoto = (verificationId: number) => apiClient.post(`/compliance/aadhaar/${verificationId}/confirm-photo`).then(d)

// ─── Staff: resident documents ─────────────────────────────────────────────
export const getResidentDocuments = (hostellerId: number) => apiClient.get(`/compliance/resident/${hostellerId}`).then(d)

export const getAgreementTemplate = (hostelId: number) => apiClient.get(`/compliance/agreement-template/hostel/${hostelId}`).then(d)
export const saveAgreementTemplate = (hostelId: number, data: { title: string; body: string; noticeDays: number }) =>
  apiClient.put(`/compliance/agreement-template/hostel/${hostelId}`, data).then(d)
export const resetAgreementTemplate = (hostelId: number) => apiClient.post(`/compliance/agreement-template/hostel/${hostelId}/reset`).then(d)

export const previewAgreement = (hostellerId: number) => apiClient.get(`/compliance/agreements/preview/${hostellerId}`).then(d)
export const sendAgreement = (hostellerId: number) => apiClient.post('/compliance/agreements', { hostellerId }).then(d)
export const voidAgreement = (id: number, reason?: string) => apiClient.post(`/compliance/agreements/${id}/void`, { reason }).then(d)

export const startChecklist = (hostellerId: number, kind: 'MOVE_IN' | 'MOVE_OUT') => apiClient.post('/compliance/checklists', { hostellerId, kind }).then(d)
export const saveChecklist = (id: number, data: Record<string, unknown>) => apiClient.put(`/compliance/checklists/${id}`, data).then(d)
export const addChecklistPhoto = (id: number, file: File, caption?: string) => {
  const fd = new FormData()
  fd.append('file', file)
  if (caption) fd.append('caption', caption)
  return apiClient.post(`/compliance/checklists/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(d)
}
export const deleteChecklistPhoto = (photoId: number) => apiClient.delete(`/compliance/checklists/photos/${photoId}`).then(d)
export const submitChecklist = (id: number) => apiClient.post(`/compliance/checklists/${id}/submit`).then(d)

export const prepareSettlement = (bookingId: number) => apiClient.post('/compliance/settlements', { bookingId }).then(d)
export const saveSettlement = (id: number, data: { deductions?: { label: string; amount: number }[]; notes?: string }) =>
  apiClient.put(`/compliance/settlements/${id}`, data).then(d)
export const finalizeSettlement = (id: number) => apiClient.post(`/compliance/settlements/${id}/finalize`).then(d)
export const markSettlementRefunded = (id: number, method: string, reference?: string) =>
  apiClient.post(`/compliance/settlements/${id}/refunded`, { method, reference }).then(d)

// ─── Resident ──────────────────────────────────────────────────────────────
export const getMyDocuments = () => apiClient.get('/compliance/my').then(d)
export const requestAgreementOtp = (id: number) => apiClient.post(`/compliance/agreements/${id}/otp`).then(d)
export const acceptAgreement = (id: number, data: { name: string; otp?: string; agree: boolean }) =>
  apiClient.post(`/compliance/agreements/${id}/accept`, data).then(d)
export const respondChecklist = (id: number, response: 'ACKNOWLEDGED' | 'DISPUTED', comment?: string) =>
  apiClient.post(`/compliance/checklists/${id}/respond`, { response, comment }).then(d)

// PDF paths (use downloadPdf from lib/payments)
export const agreementPdfPath = (id: number) => `/compliance/agreements/${id}/pdf`
export const checklistPdfPath = (id: number) => `/compliance/checklists/${id}/pdf`
export const settlementPdfPath = (id: number) => `/compliance/settlements/${id}/pdf`
