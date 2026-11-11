import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, UserPlus, Building2 } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { useToastStore } from '../../store/toastStore'
import { createOwner, apiErrorMessage, PLANS, FEATURE_FLAGS } from '../../api/superadmin'

const PLAN_FEATURES: Record<string, string[]> = {
  FREE: ['1 hostel', 'Up to 30 beds', 'Weekly menu only'],
  STARTER: ['1 hostel', 'Up to 75 beds', 'Basic reports', 'Email support'],
  PROFESSIONAL: ['Up to 3 hostels', 'Up to 200 beds', 'Advanced reports', 'Priority support'],
  ENTERPRISE: ['Up to 10 hostels', 'Up to 1000 beds', 'Full analytics', 'Dedicated support'],
}

type Features = Record<string, boolean>

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-gray-50 focus:bg-white transition-colors'

export default function CreateOwnerPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToastStore((s) => s.show)
  const [form, setForm] = useState({
    firstName: '', lastName: '', businessName: '', email: '', mobile: '', password: '',
  })
  const [hostel, setHostel] = useState({
    hostelName: '', hostelType: 'BOYS', city: 'Vijayawada', pincode: '', address: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedPlan, setSelectedPlan] = useState('PROFESSIONAL')
  const [features, setFeatures] = useState<Features>({
    online_payment: true, referral_program: false, parking_management: false,
    cleaning_requests: false, weekly_menu: true, hostel_reviews: false,
  })

  const mutation = useMutation({
    mutationFn: createOwner,
    onSuccess: (owner: { id?: number }) => {
      queryClient.invalidateQueries({ queryKey: ['sa-owners'] })
      toast('success', 'Owner created', `${form.email} can now sign in on the staff portal.`)
      navigate(owner?.id ? `/super-admin/owners/${owner.id}` : '/super-admin/owners')
    },
  })

  function validate() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'First name is required'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) e.email = 'Enter a valid email address'
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Enter a valid 10-digit mobile number (starting 6–9)'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (!hostel.hostelName.trim()) e.hostelName = 'Hostel name is required'
    if (!hostel.city.trim()) e.city = 'City is required'
    if (!/^\d{6}$/.test(hostel.pincode)) e.pincode = 'Enter a valid 6-digit pincode'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const ownerName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim()
    mutation.mutate({
      ownerName,
      businessName: form.businessName.trim() || hostel.hostelName.trim(),
      email: form.email.trim().toLowerCase(),
      mobile: form.mobile,
      password: form.password,
      planName: selectedPlan,
      features,
      hostelName: hostel.hostelName.trim(),
      hostelType: hostel.hostelType,
      city: hostel.city.trim(),
      pincode: hostel.pincode,
      address: hostel.address.trim(),
    })
  }

  const ownerFields: { key: keyof typeof form; label: string; placeholder: string; type?: string; required?: boolean; inputMode?: 'numeric' }[] = [
    { key: 'firstName', label: 'First Name', placeholder: 'Vikram', required: true },
    { key: 'lastName', label: 'Last Name', placeholder: 'Mehta' },
    { key: 'email', label: 'Email', placeholder: 'owner@hostel.com', type: 'email', required: true },
    { key: 'mobile', label: 'Mobile', placeholder: '9876500000', inputMode: 'numeric', required: true },
    { key: 'businessName', label: 'Business Name', placeholder: 'Defaults to the hostel name' },
    { key: 'password', label: 'Password', placeholder: 'Min 8 characters', type: 'password', required: true },
  ]

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/super-admin/owners')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <PageHeader
        title="Create Owner Account"
        subtitle="Set up a new hostel owner and their first hostel"
      />

      {mutation.isError && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">
          {apiErrorMessage(mutation.error, 'Failed to create owner. Please try again.')}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Section 1: Owner Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <UserPlus size={14} className="text-violet-600" />
            </div>
            <h2 className="font-semibold text-gray-800 text-sm">Owner Details</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ownerFields.map((field) => (
              <div key={field.key}>
                <label htmlFor={`owner-${field.key}`} className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {field.label}{field.required ? ' *' : ''}
                </label>
                <input
                  id={`owner-${field.key}`}
                  name={field.key}
                  type={field.type ?? 'text'}
                  inputMode={field.inputMode}
                  maxLength={field.key === 'mobile' ? 10 : undefined}
                  autoComplete={field.key === 'password' ? 'new-password' : 'off'}
                  value={form[field.key]}
                  onChange={(e) => {
                    const value = field.key === 'mobile' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value
                    setForm((f) => ({ ...f, [field.key]: value }))
                    setErrors((er) => ({ ...er, [field.key]: '' }))
                  }}
                  placeholder={field.placeholder}
                  className={inputCls}
                />
                {errors[field.key] && <p className="text-xs text-red-500 mt-1">{errors[field.key]}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: First Hostel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
            <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
              <Building2 size={14} className="text-brand-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">First Hostel</h2>
              <p className="text-xs text-gray-400 mt-0.5">The owner is assigned to it; floors, rooms and beds are added later from Hostel Setup</p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="hostel-name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Hostel Name *</label>
              <input id="hostel-name" name="hostelName" value={hostel.hostelName} placeholder="Sri Sai Boys Hostel"
                onChange={(e) => { setHostel((h) => ({ ...h, hostelName: e.target.value })); setErrors((er) => ({ ...er, hostelName: '' })) }}
                className={inputCls} />
              {errors.hostelName && <p className="text-xs text-red-500 mt-1">{errors.hostelName}</p>}
            </div>
            <div>
              <label htmlFor="hostel-type" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Hostel Type</label>
              <select id="hostel-type" name="hostelType" value={hostel.hostelType}
                onChange={(e) => setHostel((h) => ({ ...h, hostelType: e.target.value }))}
                className={inputCls}>
                <option value="BOYS">Boys</option>
                <option value="GIRLS">Girls</option>
                <option value="COED">Co-ed</option>
              </select>
            </div>
            <div>
              <label htmlFor="hostel-city" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">City *</label>
              <input id="hostel-city" name="city" value={hostel.city}
                onChange={(e) => { setHostel((h) => ({ ...h, city: e.target.value })); setErrors((er) => ({ ...er, city: '' })) }}
                className={inputCls} />
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
            </div>
            <div>
              <label htmlFor="hostel-pincode" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Pincode *</label>
              <input id="hostel-pincode" name="pincode" inputMode="numeric" maxLength={6} value={hostel.pincode} placeholder="520010"
                onChange={(e) => { setHostel((h) => ({ ...h, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })); setErrors((er) => ({ ...er, pincode: '' })) }}
                className={inputCls} />
              {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="hostel-address" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
              <input id="hostel-address" name="address" value={hostel.address} placeholder="Street, area"
                onChange={(e) => setHostel((h) => ({ ...h, address: e.target.value }))}
                className={inputCls} />
            </div>
          </div>
        </div>

        {/* Section 3: Subscription Plan */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800 text-sm">Subscription Plan</h2>
            <p className="text-xs text-gray-400 mt-0.5">Choose the plan for this owner</p>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => {
              const selected = selectedPlan === plan.id
              return (
                <button
                  key={plan.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    selected
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 bg-white hover:border-violet-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900 text-sm">{plan.name}</span>
                    <div className={`w-4 h-4 rounded-full border-2 transition-all ${selected ? 'border-violet-500 bg-violet-500' : 'border-gray-300'}`} />
                  </div>
                  <p className={`text-lg font-bold mb-3 ${selected ? 'text-violet-700' : 'text-gray-800'}`}>{plan.price}</p>
                  <ul className="space-y-1">
                    {PLAN_FEATURES[plan.id].map((f) => (
                      <li key={f} className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected ? 'bg-violet-500' : 'bg-gray-300'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 4: Feature Flags */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800 text-sm">Feature Flags</h2>
            <p className="text-xs text-gray-400 mt-0.5">Enable or disable features for this owner</p>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
            {FEATURE_FLAGS.map((flag) => (
              <label key={flag.id} className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{flag.label}</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={features[flag.id] ?? false}
                    onChange={(e) => setFeatures((f) => ({ ...f, [flag.id]: e.target.checked }))}
                  />
                  <div
                    className={`w-10 h-5 rounded-full transition-colors ${
                      features[flag.id] ? 'bg-violet-500' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        features[flag.id] ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate('/super-admin/owners')}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
          >
            <UserPlus size={16} /> {mutation.isPending ? 'Creating...' : 'Create Owner Account'}
          </button>
        </div>
      </form>
    </div>
  )
}
