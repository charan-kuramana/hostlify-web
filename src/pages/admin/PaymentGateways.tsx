import { useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Copy, KeyRound, Plug, Plus, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { getHostel } from '../../api/staff'
import { errMsg } from '../../api/ops'
import {
  createGateway, deleteGateway, listGateways, testGateway, updateGateway, webhookUrl,
  type GatewayProvider, type OwnerGateway,
} from '../../api/gateways'

const PROVIDERS: Record<GatewayProvider, {
  name: string; fee: string; keyLabel: string | null; keyHint: string; secretLabel: string; secretHint: string
  where: string; webhookEvents: string; modes: [string, string]
}> = {
  RAZORPAY: {
    name: 'Razorpay', fee: 'Best for India: UPI, cards, netbanking, wallets. About 2% per payment, no monthly fee.',
    keyLabel: 'Key ID', keyHint: 'rzp_test_… or rzp_live_…', secretLabel: 'Key Secret', secretHint: 'Shown once when you generate the key',
    where: 'Razorpay Dashboard → Account & Settings → API Keys → Generate Key.',
    webhookEvents: 'payment.captured, order.paid', modes: ['Test', 'Live'],
  },
  STRIPE: {
    name: 'Stripe', fee: 'Cards (incl. international). Fee depends on your Stripe country.',
    keyLabel: null, keyHint: '', secretLabel: 'Secret key', secretHint: 'sk_test_… or sk_live_… (a restricted key rk_… also works)',
    where: 'Stripe Dashboard → Developers → API keys.',
    webhookEvents: 'checkout.session.completed, checkout.session.async_payment_succeeded', modes: ['Test', 'Live'],
  },
  PAYPAL: {
    name: 'PayPal', fee: 'For residents paying from abroad. Check that your PayPal account can receive INR first.',
    keyLabel: 'Client ID', keyHint: 'From your PayPal REST app', secretLabel: 'Secret', secretHint: 'From the same REST app',
    where: 'developer.paypal.com → Apps & Credentials → your app (Sandbox for test, Live for real money).',
    webhookEvents: '', modes: ['Sandbox', 'Live'],
  },
}

const input = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'

type Draft = { id?: number; provider: GatewayProvider; hostelId: string; mode: 'TEST' | 'LIVE'; publicKey: string; secret: string; webhookSecret: string; enabled: boolean }

function GatewayForm({ draft, hostels, onClose }: { draft: Draft; hostels: { id: number; name: string }[]; onClose: () => void }) {
  const [d, setD] = useState(draft)
  const qc = useQueryClient()
  const { show } = useToastStore()
  const meta = PROVIDERS[d.provider]
  const editing = !!d.id
  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { mode: d.mode, enabled: d.enabled }
      if (meta.keyLabel) body.publicKey = d.publicKey.trim()
      if (d.secret.trim()) body.secret = d.secret.trim()
      if (d.webhookSecret.trim()) body.webhookSecret = d.webhookSecret.trim()
      const saved = editing ? await updateGateway(d.id!, body)
        : await createGateway({ ...body, provider: d.provider, hostelId: d.hostelId || null })
      return testGateway(saved.id) // check the keys right away
    },
    onSuccess: (g) => {
      qc.invalidateQueries({ queryKey: ['owner-gateways'] })
      if (g.lastTestOk) show('success', `${meta.name} connected`, g.lastTestMessage ?? '')
      else show('error', `${meta.name} saved, but the keys did not work`, g.lastTestMessage ?? 'Check the keys and mode.')
      onClose()
    },
    onError: (e) => show('error', 'Could not save', errMsg(e)),
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{editing ? 'Edit' : 'Connect'} {meta.name}</h2>
          <p className="text-xs text-gray-500 mt-1">{meta.where}</p>
        </div>
        {!editing && (
          <label className="block">
            <span className="text-xs font-semibold text-gray-500">Use for</span>
            <select className={input} value={d.hostelId} onChange={(e) => setD({ ...d, hostelId: e.target.value })}>
              <option value="">All my hostels</option>
              {hostels.map((h) => <option key={h.id} value={h.id}>Only {h.name}</option>)}
            </select>
            <span className="text-[11px] text-gray-400">Use "Only …" when a hostel has its own bank account. It overrides "All my hostels" for that hostel.</span>
          </label>
        )}
        <div className="flex gap-2">
          {(['TEST', 'LIVE'] as const).map((m, i) => (
            <button type="button" key={m} onClick={() => setD({ ...d, mode: m })}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${d.mode === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500'}`}>
              {meta.modes[i]}{m === 'LIVE' ? ' (real money)' : ''}
            </button>
          ))}
        </div>
        {meta.keyLabel && (
          <label className="block">
            <span className="text-xs font-semibold text-gray-500">{meta.keyLabel}</span>
            <input className={input} value={d.publicKey} onChange={(e) => setD({ ...d, publicKey: e.target.value })} placeholder={meta.keyHint} autoComplete="off" required />
          </label>
        )}
        <label className="block">
          <span className="text-xs font-semibold text-gray-500">{meta.secretLabel}</span>
          <input className={input} type="password" value={d.secret} onChange={(e) => setD({ ...d, secret: e.target.value })}
            placeholder={editing ? 'Leave blank to keep the saved one' : meta.secretHint} autoComplete="new-password" required={!editing} />
        </label>
        {meta.webhookEvents && (
          <label className="block">
            <span className="text-xs font-semibold text-gray-500">Webhook secret (optional)</span>
            <input className={input} type="password" value={d.webhookSecret} onChange={(e) => setD({ ...d, webhookSecret: e.target.value })}
              placeholder={editing ? 'Leave blank to keep the saved one' : 'Add after creating the webhook'} autoComplete="new-password" />
            <span className="text-[11px] text-gray-400">Optional. Payments are confirmed when the resident returns, and checked again every 10 minutes. A webhook confirms them instantly.</span>
          </label>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={d.enabled} onChange={(e) => setD({ ...d, enabled: e.target.checked })} /> Residents can pay with {meta.name}
        </label>
        <p className="text-[11px] text-gray-500 bg-gray-50 rounded-xl p-3 flex gap-2"><ShieldCheck size={14} className="shrink-0 text-emerald-600" />
          Keys are stored encrypted and never shown again. Money goes straight from residents to your {meta.name} account; Hostlify never holds it.</p>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">Cancel</button>
          <button disabled={save.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient disabled:opacity-60">
            {save.isPending ? 'Saving & testing…' : 'Save & test'}
          </button>
        </div>
      </form>
    </div>
  )
}

function GatewayCard({ g, onEdit }: { g: OwnerGateway; onEdit: () => void }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const meta = PROVIDERS[g.provider]
  const test = useMutation({
    mutationFn: () => testGateway(g.id),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['owner-gateways'] }); show(r.lastTestOk ? 'success' : 'error', r.lastTestOk ? 'Connection OK' : 'Connection failed', r.lastTestMessage ?? '') },
    onError: (e) => show('error', 'Test failed', errMsg(e)),
  })
  const toggle = useMutation({
    mutationFn: () => updateGateway(g.id, { enabled: !g.enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-gateways'] }),
    onError: (e) => show('error', 'Could not update', errMsg(e)),
  })
  const remove = useMutation({
    mutationFn: () => deleteGateway(g.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-gateways'] }); show('success', `${meta.name} disconnected`, '') },
    onError: (e) => show('error', 'Could not remove', errMsg(e)),
  })
  const hook = webhookUrl(g.webhookPath)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><KeyRound size={18} className="text-brand-600" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{meta.name}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${g.mode === 'LIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {g.mode === 'LIVE' ? 'LIVE' : g.provider === 'PAYPAL' ? 'SANDBOX' : 'TEST'}
            </span>
            {!g.enabled && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">OFF</span>}
          </div>
          <p className="text-xs text-gray-500">{g.hostelName ? `Only ${g.hostelName}` : 'All my hostels'}{g.publicKey ? ` · ${g.publicKey}` : ''} · secret {g.secretMask}</p>
          {g.lastTestOk != null && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${g.lastTestOk ? 'text-emerald-600' : 'text-red-600'}`}>
              {g.lastTestOk ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {g.lastTestMessage}
            </p>
          )}
        </div>
      </div>
      {meta.webhookEvents && (
        <div className="text-[11px] text-gray-500 bg-gray-50 rounded-xl p-3 space-y-1">
          <p>Optional webhook URL (events: {meta.webhookEvents}){g.hasWebhookSecret ? ' · secret saved' : ''}:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-gray-700">{hook}</code>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(hook); show('success', 'Copied', '') }} className="text-brand-600"><Copy size={13} /></button>
          </div>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => test.mutate()} disabled={test.isPending} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 disabled:opacity-60">
          {test.isPending ? 'Testing…' : 'Test connection'}
        </button>
        <button onClick={onEdit} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700">Edit keys</button>
        <button onClick={() => toggle.mutate()} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700">{g.enabled ? 'Turn off' : 'Turn on'}</button>
        <button onClick={() => { if (confirm(`Disconnect ${meta.name}? Residents will no longer be able to pay with it.`)) remove.mutate() }}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1"><Trash2 size={12} /> Remove</button>
      </div>
    </div>
  )
}

export default function PaymentGateways() {
  const { subRole, hostelIds } = useAuthStore()
  const isOwner = subRole === 'OWNER'
  const [draft, setDraft] = useState<Draft | null>(null)
  const { data: gateways = [], isLoading, error } = useQuery({ queryKey: ['owner-gateways'], queryFn: listGateways, enabled: isOwner, retry: false })
  const hostelQs = useQueries({ queries: (hostelIds ?? []).map((id) => ({ queryKey: ['hostel-info', id], queryFn: () => getHostel(id) })) })
  const hostels = hostelQs.map((q, i) => ({ id: (hostelIds ?? [])[i], name: q.data?.name ?? `Hostel ${(hostelIds ?? [])[i]}` }))

  if (!isOwner) {
    return <div className="space-y-6"><PageHeader title="Payment Gateways" subtitle="Online payments to your account" />
      <p className="text-sm text-gray-500">Only the hostel owner can connect payment accounts.</p></div>
  }

  const blank = (provider: GatewayProvider): Draft => ({ provider, hostelId: '', mode: 'TEST', publicKey: '', secret: '', webhookSecret: '', enabled: true })

  return (
    <div className="space-y-6">
      <PageHeader title="Payment Gateways" subtitle="Residents pay rent online straight into your own account" />
      {draft && <GatewayForm key={draft.id ?? draft.provider} draft={draft} hostels={hostels} onClose={() => setDraft(null)} />}

      <div className="bg-brand-50/60 border border-brand-100 rounded-2xl p-4 text-sm text-gray-700 flex gap-3">
        <Plug size={18} className="text-brand-600 shrink-0 mt-0.5" />
        <div>
          Connect one or more gateways; residents pick one on <b>My Payments</b>. Start in <b>Test</b> mode, make a test payment, then switch to <b>Live</b>.
          The gateway charges its own fee and pays out to your bank. UPI to your UPI ID (Settings → Payments) stays free and works alongside these.
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{errMsg(error)}</p>}
      {isLoading ? <p className="text-sm text-gray-400">Loading…</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {gateways.map((g) => (
            <GatewayCard key={g.id} g={g} onEdit={() => setDraft({ id: g.id, provider: g.provider, hostelId: g.hostelId ? String(g.hostelId) : '', mode: g.mode, publicKey: g.publicKey ?? '', secret: '', webhookSecret: '', enabled: g.enabled })} />
          ))}
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Connect a gateway</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {(Object.keys(PROVIDERS) as GatewayProvider[]).map((p) => (
            <button key={p} onClick={() => setDraft(blank(p))} className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-brand-300">
              <p className="font-semibold text-gray-900 flex items-center gap-1.5"><Plus size={14} className="text-brand-600" /> {PROVIDERS[p].name}</p>
              <p className="text-xs text-gray-500 mt-1">{PROVIDERS[p].fee}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
