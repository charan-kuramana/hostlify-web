import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, X, User, Home, Phone, Mail, MapPin, CreditCard, Camera, FileText, ShieldAlert, CheckCircle2 } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import {
  getHostellerProfile, updateHostellerProfile, getMyStay, retryUnless404,
  getEmergencyContact, saveEmergencyContact, uploadProfilePhoto, uploadIdProof,
} from '../../api/hosteller'

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors'

const selectCls = inputCls + ' bg-gray-50'

interface ProfileForm {
  firstName: string
  lastName: string
  email: string
  mobile: string
  altMobile: string
  dateOfBirth: string
  gender: string
  userType: string
  companyCollege: string
  permanentAddress: string
  city: string
  pincode: string
  idProofType: string
  idProofNumber: string
}

function SectionHeader({ icon: Icon, label, color }: { icon: typeof User; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-2.5 px-5 py-4 border-b border-gray-50`}>
      <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center`}>
        <Icon size={14} className="text-white" />
      </div>
      <h3 className="font-semibold text-gray-800 text-sm">{label}</h3>
    </div>
  )
}

export default function MyProfile() {
  const { hostellerProfileId } = useAuthStore()
  const queryClient = useQueryClient()
  const { show } = useToastStore()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ProfileForm>({
    firstName: '', lastName: '', email: '', mobile: '', altMobile: '',
    dateOfBirth: '', gender: '', userType: '', companyCollege: '',
    permanentAddress: '', city: '', pincode: '', idProofType: '', idProofNumber: '',
  })

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', hostellerProfileId],
    queryFn: () => getHostellerProfile(hostellerProfileId!),
    enabled: !!hostellerProfileId,
  })

  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ['my-booking'],
    queryFn: getMyStay,
    retry: retryUnless404, // 404 = no approved booking yet (pending hosteller)
  })

  // Emergency contact (separate record)
  const [emForm, setEmForm] = useState({ name: '', relationship: '', mobile: '', altMobile: '' })
  const { data: emergency } = useQuery({
    queryKey: ['emergency', hostellerProfileId],
    queryFn: () => getEmergencyContact(hostellerProfileId!),
    enabled: !!hostellerProfileId,
  })
  useEffect(() => {
    if (emergency) setEmForm({
      name: emergency.name ?? '', relationship: emergency.relationship ?? '',
      mobile: emergency.mobile ?? '', altMobile: emergency.altMobile ?? '',
    })
  }, [emergency])

  const emMutation = useMutation({
    mutationFn: () => saveEmergencyContact(hostellerProfileId!, emForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency', hostellerProfileId] })
      queryClient.invalidateQueries({ queryKey: ['profile-completion'] })
      show('success', 'Saved', 'Emergency contact updated.')
    },
    onError: (e: any) => { if (e?.response?.status !== 400) show('error', 'Save failed', 'Could not save emergency contact.') },
  })

  // Reset input above so picking the same file again re-triggers; validate before uploading.
  function checkFile(f: File, types: string[]) {
    if (!types.some((t) => f.type.startsWith(t))) { show('error', 'Unsupported file', 'Please choose an image' + (types.length > 1 ? ' or PDF.' : '.')); return false }
    if (f.size > 5 * 1024 * 1024) { show('error', 'File too large', 'Please choose a file under 5 MB.'); return false }
    return true
  }

  const photoMutation = useMutation({
    mutationFn: (file: File) => uploadProfilePhoto(hostellerProfileId!, file),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile', hostellerProfileId] }); show('success', 'Photo updated', 'Your profile photo was uploaded.') },
    onError: () => show('error', 'Upload failed', 'Could not upload your photo right now. Please try again later.'),
  })
  const idMutation = useMutation({
    mutationFn: (file: File) => uploadIdProof(hostellerProfileId!, file),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile', hostellerProfileId] }); show('success', 'ID uploaded', 'Your ID document was uploaded.') },
    onError: () => show('error', 'Upload failed', 'Could not upload your document right now. Please try again later.'),
  })

  function resetForm() {
    if (profile) {
      // support both { name, phone } and { firstName, lastName, mobile } shapes
      const nameParts = (profile.name ?? '').split(' ')
      setForm({
        firstName:        profile.firstName ?? nameParts[0] ?? '',
        lastName:         profile.lastName ?? nameParts.slice(1).join(' ') ?? '',
        email:            profile.email ?? '',
        mobile:           profile.mobile ?? profile.phone ?? '',
        altMobile:        profile.altMobile ?? '',
        dateOfBirth:      profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
        gender:           profile.gender ?? '',
        userType:         profile.userType ?? '',
        companyCollege:   profile.companyCollege ?? '',
        permanentAddress: profile.permanentAddress ?? '',
        city:             profile.city ?? '',
        pincode:          profile.pincode ?? '',
        idProofType:      profile.idProofType ?? '',
        idProofNumber:    profile.idProofNumber ?? '',
      })
    }
  }
  useEffect(resetForm, [profile])

  function cancelEdit() {
    resetForm()   // discard unsaved edits
    setFormErr(null)
    setEditing(false)
  }

  const updateMutation = useMutation({
    mutationFn: (data: ProfileForm) => updateHostellerProfile(hostellerProfileId!, data as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', hostellerProfileId] })
      setEditing(false)
      show('success', 'Profile updated', 'Your information has been saved.')
    },
    onError: (e: any) => {
      // 400s already raise a toast with the server's reason (api/client.ts)
      if (e?.response?.status !== 400) show('error', 'Update failed', 'Could not save your changes. Please try again.')
    },
  })

  const [formErr, setFormErr] = useState<string | null>(null)

  function handleSave(e: FormEvent) {
    e.preventDefault()
    const err =
      !form.firstName.trim() ? 'First name is required.'
      : !/^[6-9]\d{9}$/.test(form.mobile) ? 'Mobile must be a valid 10-digit number.'
      : form.altMobile && !/^[6-9]\d{9}$/.test(form.altMobile) ? 'Alt. mobile must be a valid 10-digit number.'
      : form.pincode && !/^\d{6}$/.test(form.pincode) ? 'Pincode must be 6 digits.'
      : form.dateOfBirth && form.dateOfBirth > new Date().toLocaleDateString('en-CA') ? 'Date of birth cannot be in the future.'
      : null
    setFormErr(err)
    if (err) return
    // email is the login identity and is not editable here
    const payload: Partial<ProfileForm> = { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim() }
    delete payload.email
    updateMutation.mutate(payload as ProfileForm)
  }

  function field(key: keyof ProfileForm) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  const isLoading = profileLoading || bookingLoading

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  const displayName = [form.firstName, form.lastName].filter(Boolean).join(' ') || '—'
  const hostelName  = booking?.hostelName ?? '—'
  const roomNumber  = booking?.roomName ?? profile?.roomNumber ?? '—'
  const bedLabel    = booking?.bedName ?? '—'
  const floorLabel  = booking?.floorName ?? '—'
  const checkIn     = booking?.checkinDate ? fmtDate(booking.checkinDate) : '—'
  const monthlyRent = booking?.rentAmount != null ? `₹${Number(booking.rentAmount).toLocaleString('en-IN')}` : '—'
  const bkStatus    = booking?.status ?? 'No active stay'

  const initials = displayName !== '—'
    ? displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="My Profile"
        subtitle="View and update your personal information"
        action={
          editing ? (
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors"
            >
              Edit Profile
            </button>
          )
        }
      />

      {/* Hero card */}
      <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <div
          className="h-24 relative"
          style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
        >
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #3aaee8, transparent)', transform: 'translate(30%, -30%)' }}
          />
        </div>
        <div className="bg-white px-6 pb-5">
          <div className="relative w-20 h-20 -mt-10 mb-3">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Profile" className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md" />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #1d6ea8, #3aaee8)' }}
              >
                {initials}
              </div>
            )}
            <label
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 border-2 border-white flex items-center justify-center text-white cursor-pointer hover:bg-brand-700 transition-colors"
              title="Upload photo"
            >
              <Camera size={13} />
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f && checkFile(f, ['image/'])) photoMutation.mutate(f) }} />
            </label>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <Mail size={13} className="text-gray-400" /> {form.email || '—'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader icon={User} label="Personal Details" color="bg-brand-500" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">First Name</label>
              {editing ? (
                <input className={inputCls} maxLength={80} value={form.firstName} onChange={field('firstName')} placeholder="First name" />
              ) : (
                <p className="text-sm text-gray-800 font-medium py-2.5">{form.firstName || '—'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Last Name</label>
              {editing ? (
                <input className={inputCls} maxLength={80} value={form.lastName} onChange={field('lastName')} placeholder="Last name" />
              ) : (
                <p className="text-sm text-gray-800 font-medium py-2.5">{form.lastName || '—'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date of Birth</label>
              {editing ? (
                <input type="date" className={inputCls} value={form.dateOfBirth} max={new Date().toLocaleDateString('en-CA')} onChange={field('dateOfBirth')} />
              ) : (
                <p className="text-sm text-gray-800 font-medium py-2.5">{form.dateOfBirth ? fmtDate(form.dateOfBirth) : '—'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Gender</label>
              {editing ? (
                <select className={selectCls} value={form.gender} onChange={field('gender')}>
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              ) : (
                <p className="text-sm text-gray-800 font-medium py-2.5">{form.gender || '—'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">User Type</label>
              {editing ? (
                <select className={selectCls} value={form.userType} onChange={field('userType')}>
                  <option value="">Select type</option>
                  <option value="GENERAL">General</option>
                  <option value="STUDENT">Student</option>
                  <option value="PROFESSIONAL">Professional</option>
                </select>
              ) : (
                <p className="text-sm text-gray-800 font-medium py-2.5">{form.userType || '—'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Company / College</label>
              {editing ? (
                <input className={inputCls} maxLength={200} value={form.companyCollege} onChange={field('companyCollege')} placeholder="Your company or college" />
              ) : (
                <p className="text-sm text-gray-800 font-medium py-2.5">{form.companyCollege || '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader icon={Phone} label="Contact Information" color="bg-emerald-500" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
              <p className="text-sm text-gray-800 font-medium py-2.5">{form.email || '—'}</p>
              {editing && <p className="text-[11px] text-gray-400 -mt-1">Login email can't be changed here.</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mobile</label>
              {editing ? (
                <input type="tel" inputMode="numeric" maxLength={10} className={inputCls} value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="Mobile number" />
              ) : (
                <p className="text-sm text-gray-800 font-medium py-2.5">{form.mobile || '—'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Alt. Mobile</label>
              {editing ? (
                <input type="tel" inputMode="numeric" maxLength={10} className={inputCls} value={form.altMobile} onChange={(e) => setForm((f) => ({ ...f, altMobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="Alternate mobile" />
              ) : (
                <p className="text-sm text-gray-800 font-medium py-2.5">{form.altMobile || '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Address Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader icon={MapPin} label="Address Details" color="bg-amber-500" />
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Permanent Address</label>
              {editing ? (
                <textarea
                  rows={3}
                  className={inputCls + ' resize-none'}
                  value={form.permanentAddress}
                  onChange={field('permanentAddress')}
                  placeholder="Full address"
                />
              ) : (
                <p className="text-sm text-gray-800 font-medium py-2.5">{form.permanentAddress || '—'}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">City</label>
                {editing ? (
                  <input className={inputCls} maxLength={100} value={form.city} onChange={field('city')} placeholder="City" />
                ) : (
                  <p className="text-sm text-gray-800 font-medium py-2.5">{form.city || '—'}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Pincode</label>
                {editing ? (
                  <input className={inputCls} inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="Pincode" />
                ) : (
                  <p className="text-sm text-gray-800 font-medium py-2.5">{form.pincode || '—'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ID Verification */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader icon={CreditCard} label="ID Verification" color="bg-purple-500" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ID Proof Type</label>
              {editing ? (
                <select className={selectCls} value={form.idProofType} onChange={field('idProofType')}>
                  <option value="">Select ID type</option>
                  <option value="AADHAAR">Aadhaar</option>
                  <option value="PAN">PAN</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="VOTER_ID">Voter ID</option>
                </select>
              ) : (
                <p className="text-sm text-gray-800 font-medium py-2.5">{form.idProofType || '—'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ID Proof Number</label>
              {editing ? (
                <>
                  <input className={inputCls} maxLength={30} value={form.idProofNumber} onChange={field('idProofNumber')} placeholder="ID number" />
                  {form.idProofType === 'AADHAAR' && <p className="text-[11px] text-gray-400 mt-1">For your privacy only the last 4 digits are kept. To verify your Aadhaar, use My Documents.</p>}
                </>
              ) : (
                <p className="text-sm text-gray-800 font-medium py-2.5">{form.idProofNumber || '—'}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ID Document</label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-200 text-brand-600 text-sm font-semibold cursor-pointer hover:bg-brand-50 transition-colors">
                  <FileText size={14} /> {profile?.idProofUrl ? 'Replace Document' : 'Upload Document'}
                  <input type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f && checkFile(f, ['image/', 'application/pdf'])) idMutation.mutate(f) }} />
                </label>
                {profile?.idProofUrl
                  ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 size={13} /> Uploaded</span>
                  : <span className="text-xs text-gray-400">Aadhaar / PAN / Passport (image or PDF)</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader icon={ShieldAlert} label="Emergency Contact" color="bg-rose-500" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Contact Name</label>
              <input className={inputCls} maxLength={150} value={emForm.name} onChange={(e) => setEmForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Suresh Kumar" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Relationship</label>
              <input className={inputCls} maxLength={50} value={emForm.relationship} onChange={(e) => setEmForm((f) => ({ ...f, relationship: e.target.value }))} placeholder="e.g. Father" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mobile</label>
              <input className={inputCls} value={emForm.mobile} inputMode="numeric" maxLength={10}
                onChange={(e) => setEmForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10-digit number" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Alt. Mobile (optional)</label>
              <input className={inputCls} value={emForm.altMobile} inputMode="numeric" maxLength={10}
                onChange={(e) => setEmForm((f) => ({ ...f, altMobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="Alternate number" />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button type="button" onClick={() => emMutation.mutate()} disabled={emMutation.isPending || !emForm.name.trim() || !emForm.relationship.trim() || emForm.mobile.length !== 10 || (emForm.altMobile.length > 0 && emForm.altMobile.length !== 10)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl brand-gradient hover:opacity-90 transition-opacity disabled:opacity-50">
                <Save size={14} /> {emMutation.isPending ? 'Saving…' : 'Save Emergency Contact'}
              </button>
            </div>
          </div>
        </div>

        {editing && formErr && <p className="text-sm text-red-600 font-medium bg-red-50 px-4 py-3 rounded-xl">{formErr}</p>}
        {editing && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
            >
              <Save size={14} />
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>

      {/* Stay Info (read-only) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <SectionHeader icon={Home} label="Stay Info" color="bg-sky-500" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Hostel', value: hostelName },
            { label: 'Room Number', value: roomNumber },
            { label: 'Bed', value: bedLabel },
            { label: 'Floor', value: floorLabel },
            { label: 'Check-in Date', value: checkIn },
            { label: 'Monthly Rent', value: monthlyRent },
            { label: 'Booking Status', value: bkStatus },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm font-semibold text-gray-800">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
