import { useState, type FormEvent, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { registerHosteller, type RegisterPayload } from '../../api/auth'
import { applyReferralCode } from '../../api/hosteller'
import { STRINGS } from '../../constants/strings'
import { Button, Input } from '../../components/common/index'

export default function HostellerSignup() {
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        mobile: '',
        referralCode: '',
    })
    const [registered, setRegistered] = useState(false)
    const [referralNote, setReferralNote] = useState<string | null>(null)
    const [mobileErr, setMobileErr] = useState<string | null>(null)
    const [passwordErr, setPasswordErr] = useState<string | null>(null)

    const { mutate, isPending, error } = useMutation({
        mutationFn: registerHosteller,
        onSuccess: async (res) => {
            // The register endpoint ignores referralCode — record it with the new account's token.
            const code = form.referralCode.trim()
            const d = res?.data
            if (code && d?.hostellerProfileId && d?.accessToken) {
                try {
                    await applyReferralCode(code.toUpperCase(), d.hostellerProfileId, d.accessToken)
                    setReferralNote(`Referral code ${code.toUpperCase()} applied.`)
                } catch (e) {
                    const msg = axios.isAxiosError(e) ? e.response?.data?.message : null
                    setReferralNote(`Your account was created, but the referral code couldn't be applied${msg ? ` (${msg})` : ''}.`)
                }
            }
            setRegistered(true)
        },
    })

    function handleSubmit(e: FormEvent) {
        e.preventDefault()
        // Indian mobile: exactly 10 digits, starting 6-9
        const badMobile = !/^[6-9]\d{9}$/.test(form.mobile)
        const badPassword = form.password.length < 8
        setMobileErr(badMobile ? 'Enter a valid 10-digit mobile number (starting 6–9).' : null)
        setPasswordErr(badPassword ? 'Password must be at least 8 characters.' : null)
        if (badMobile || badPassword) return
        mutate({
            ...form,
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim().toLowerCase(),
            referralCode: form.referralCode.trim() || undefined,
        } as RegisterPayload)
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target
        if (id === 'mobile') {
            // keep digits only, max 10
            const digits = value.replace(/\D/g, '').slice(0, 10)
            setForm(prev => ({ ...prev, mobile: digits }))
            if (mobileErr) setMobileErr(null)
            return
        }
        if (id === 'password' && passwordErr) setPasswordErr(null)
        setForm(prev => ({ ...prev, [id]: value }))
    }

    // Backend validation errors come as { message: 'Validation failed', data: { field: message } }
    const fieldErrors = axios.isAxiosError(error) && error.response?.data?.data && typeof error.response.data.data === 'object'
        ? Object.values(error.response.data.data as Record<string, string>).join(' ')
        : ''
    const errorMsg = error
        ? axios.isAxiosError(error)
            ? (fieldErrors || (error.response?.data?.message ?? 'Registration failed. Please try again.'))
            : (error as Error).message
        : null

    if (registered) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 text-2xl">✓</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
                    <p className="text-[14px] text-gray-500 mb-6">
                        Log in to discover hostels and request a bed. Your account is activated once the hostel approves your booking.
                    </p>
                    {referralNote && <p className="text-[13px] text-gray-600 bg-gray-50 rounded-xl px-4 py-2.5 mb-6">{referralNote}</p>}
                    <Link to="/auth/login" className="inline-block py-2.5 px-6 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors">
                        Back to Login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Registration Hero from wireframe HP-01 */}
            <div className="bg-slate-900 pt-8 px-10 pb-4 text-white">
                <div className="flex items-center gap-3 mb-6">
                    <div className="text-xl font-bold tracking-tight">{STRINGS.common.appName}</div>
                    <div className="w-[1px] h-5 bg-white/20"></div>
                    <div className="text-[13px] text-white/60">New Resident Registration</div>
                </div>

                {/* Stepper mockup from wireframe */}
                <div className="flex items-center mb-6 overflow-x-auto no-scrollbar">
                    <div className="flex items-center shrink-0">
                        <div className="w-7.5 h-7.5 rounded-full bg-brand-600 flex items-center justify-center text-[13px] font-semibold text-white">1</div>
                        <span className="text-[12px] font-medium ml-2 text-white">{STRINGS.auth.registrationStep1.split(' — ')[1]}</span>
                    </div>
                    <div className="flex-1 min-w-[30px] h-[2px] bg-white/10 mx-2"></div>
                    <div className="flex items-center opacity-40 shrink-0">
                        <div className="w-7.5 h-7.5 rounded-full bg-white/20 flex items-center justify-center text-[13px] font-semibold text-white">2</div>
                        <span className="text-[12px] font-medium ml-2 text-white">{STRINGS.auth.registrationStep2.split(' — ')[1]}</span>
                    </div>
                    <div className="hidden sm:block flex-1 min-w-[30px] h-[2px] bg-white/10 mx-2"></div>
                </div>
            </div>

            <div className="flex-1 flex justify-center p-4">
                <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden self-start">
                    <form onSubmit={handleSubmit} className="p-8">
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-gray-900">{STRINGS.auth.registrationStep1}</h2>
                            <p className="text-[13px] text-gray-400 mt-1">{STRINGS.common.allFieldsRequired}</p>
                        </div>

                        {errorMsg && (
                            <div className="alert alert-danger mb-6">
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                            <Input
                                id="firstName"
                                label={STRINGS.auth.firstName}
                                required
                                value={form.firstName}
                                onChange={handleChange}
                                placeholder="e.g. Ravi"
                            />
                            <Input
                                id="lastName"
                                label={STRINGS.auth.lastName}
                                required
                                value={form.lastName}
                                onChange={handleChange}
                                placeholder="e.g. Kumar"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                            <Input
                                id="email"
                                label={STRINGS.auth.email}
                                type="email"
                                required
                                value={form.email}
                                onChange={handleChange}
                                placeholder={STRINGS.auth.emailPlaceholder}
                                hint="Used for login and notifications"
                            />
                            <Input
                                id="mobile"
                                label={STRINGS.auth.mobile}
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                required
                                prefix="+91"
                                value={form.mobile}
                                onChange={handleChange}
                                placeholder="9876543210"
                                error={mobileErr ?? undefined}
                                hint={mobileErr ? undefined : '10-digit number, no spaces'}
                            />
                        </div>

                        <Input
                            id="password"
                            label={STRINGS.auth.password}
                            type="password"
                            required
                            value={form.password}
                            onChange={handleChange}
                            placeholder={STRINGS.auth.passwordPlaceholder}
                            error={passwordErr ?? undefined}
                            hint={passwordErr ? undefined : 'At least 8 characters'}
                        />

                        <Input
                            id="referralCode"
                            label="Referral Code (optional)"
                            value={form.referralCode}
                            onChange={handleChange}
                            placeholder="Have a code? Enter it here"
                            hint="Get rewards if a friend referred you"
                        />

                        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                            <Link to="/auth/login" className="text-[13px] text-gray-500 hover:text-gray-900 font-medium">
                                {STRINGS.common.back} to Login
                            </Link>
                            <Button
                                type="submit"
                                size="lg"
                                isLoading={isPending}
                                className="px-8"
                            >
                                Sign Up
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
