import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { disablePush, enablePush, getPushState, type PushState } from '../../lib/push'
import { useToastStore } from '../../store/toastStore'

/** "Get notifications on this device" card. Renders nothing where push can't work. */
export default function PushToggle({ title, description }: { title: string; description: string }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const { show } = useToastStore()

  useEffect(() => {
    getPushState().then(setState).catch(() => setState('disabled'))
  }, [])

  if (state === null || state === 'unsupported' || state === 'disabled') return null

  async function toggle() {
    setBusy(true)
    try {
      const next = state === 'on' ? await disablePush() : await enablePush()
      setState(next)
      if (next === 'on') show('success', 'Notifications on', 'This device will get reminders and receipts.')
      else if (next === 'denied') show('error', 'Notifications blocked', 'Allow notifications for this site in your browser settings.')
    } catch {
      show('error', 'Could not change notifications', 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const on = state === 'on'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${on ? 'bg-emerald-50' : 'bg-brand-50'}`}>
        {on ? <BellRing size={17} className="text-emerald-600" /> : <Bell size={17} className="text-brand-600" />}
      </div>
      <div className="flex-1 min-w-[12rem]">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-400">
          {state === 'denied' ? 'Notifications are blocked for this site. Allow them in your browser settings.' : on ? 'On for this device.' : description}
        </p>
      </div>
      {state !== 'denied' && (
        <button onClick={toggle} disabled={busy}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 ${on ? 'border border-gray-200 text-gray-600 hover:bg-gray-50' : 'text-white brand-gradient hover:opacity-90'}`}>
          {on ? <><BellOff size={13} /> Turn off</> : <><Bell size={13} /> {busy ? 'Turning on…' : 'Turn on'}</>}
        </button>
      )}
    </div>
  )
}
