import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Check, Users, Gift, Star } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import { getMyReferralCode, getMyReferrals } from '../../api/hosteller'

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const HOW_IT_WORKS = [
  { step: '1', title: 'Share your code', desc: 'Send your unique referral code to a friend.' },
  { step: '2', title: 'Friend joins',     desc: 'Your friend applies using your code and gets ₹200 off.' },
  { step: '3', title: 'Earn reward',      desc: "You get ₹500 off your next month's fee automatically." },
]

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = ['bg-brand-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500']

export default function Referral() {
  const [copied, setCopied] = useState(false)

  const { data: referralData, isLoading: referralLoading } = useQuery({
    queryKey: ['my-referral-code'],
    queryFn: getMyReferralCode,
  })

  const { data: referrals, isLoading: referralsLoading } = useQuery({
    queryKey: ['my-referrals'],
    queryFn: getMyReferrals,
  })

  function copyCode() {
    const code = referralData?.code
    if (!code) return
    // clipboard API is unavailable on non-secure origins / some browsers — don't claim success then
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(code))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      .catch(() => window.prompt('Copy your referral code:', code))
  }

  const referralsList = referrals ?? []
  const isLoading = referralLoading || referralsLoading

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Referral" subtitle="Invite friends and earn rewards" />

      {/* Hero card */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3aaee8, transparent)', transform: 'translate(30%, -30%)' }}
        />
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
            <Gift size={16} className="text-white" />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>Your Referral Code</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p
              className="text-3xl font-black tracking-[0.2em] font-mono"
              style={{ letterSpacing: '0.15em' }}
            >
              {referralData?.code ?? '...'}
            </p>
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Share this code · Friends get ₹200 off · You get ₹500 off
            </p>
          </div>
          <button
            onClick={copyCode}
            disabled={!referralData?.code}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 disabled:opacity-50 ${
              copied
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-brand-700 hover:bg-brand-50'
            }`}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Referred"
          value={referralData?.totalReferrals ?? referralData?.referredCount ?? referralsList.length}
          sub="Friends who joined via your code"
          icon={<Users size={20} className="text-brand-600" />}
          iconBg="bg-brand-50"
        />
        <StatCard
          label="Your Reward"
          value={'₹' + Number(referralData?.totalDiscountEarned ?? referralData?.reward ?? 0).toLocaleString('en-IN')}
          sub="Earned from completed referrals"
          icon={<Gift size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* How it works */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Star size={13} className="text-amber-500" />
            </div>
            <h2 className="font-semibold text-gray-800 text-sm">How It Works</h2>
          </div>
          <div className="space-y-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #1d6ea8, #3aaee8)' }}
                >
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referred friends */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
              <Users size={13} className="text-brand-600" />
            </div>
            <h2 className="font-semibold text-gray-800 text-sm">Referred Friends</h2>
            <span className="ml-auto text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {referralsList.length}
            </span>
          </div>
          {referralsList.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                <Users size={18} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400 font-medium">No referrals yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Share your code to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {referralsList.map((r: any, i: number) => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/70 transition-colors">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                  >
                    {getInitials(r.referredName ?? r.name ?? 'Friend')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{r.referredName ?? r.name ?? `Friend #${r.referredId}`}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Signed up {fmtDate(r.joinDate ?? r.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        ['Joined', 'JOINED', 'COMPLETED'].includes(r.status)
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {r.status === 'COMPLETED' ? 'Joined' : r.status === 'PENDING' ? 'Pending' : r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
