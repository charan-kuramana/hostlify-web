import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const DISMISS_KEY = 'hostlify-install-dismissed'

/** "Install Hostlify" card, shown when the browser says the app can be installed (Android / desktop Chrome, Edge). */
export default function InstallApp() {
  const [prompt, setPrompt] = useState<any>(null)
  useEffect(() => {
    let dismissed = false
    try { dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now() } catch { /* storage blocked */ }
    if (dismissed) return
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e) }
    const onInstalled = () => setPrompt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])
  if (!prompt) return null
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 14 * 864e5)) } catch { /* ignore */ }
    setPrompt(null)
  }
  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:w-80 z-40 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-start gap-3">
      <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-xl" />
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-900">Install Hostlify</p>
        <p className="text-xs text-gray-500">Open it from your home screen like an app, with notifications.</p>
        <button onClick={async () => { prompt.prompt(); await prompt.userChoice.catch(() => null); setPrompt(null) }}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white brand-gradient"><Download size={12} /> Install</button>
      </div>
      <button onClick={dismiss} aria-label="Not now" className="text-gray-300 hover:text-gray-500"><X size={16} /></button>
    </div>
  )
}
