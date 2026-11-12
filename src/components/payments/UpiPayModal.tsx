import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Smartphone, X, QrCode } from 'lucide-react'
import { dueTitle, inr, upiLink } from '../../lib/payments'

interface Props {
  due: any
  amount: number
  upiId: string
  payeeName?: string
  submitting: boolean
  error: string | null
  onSubmit: (amount: number, utr: string) => void
  onClose: () => void
}

/**
 * Pay the hostel's own UPI ID directly (no gateway fee): scan the QR or tap "Open UPI app",
 * then enter the UPI transaction ID (UTR) so staff can confirm the money arrived.
 */
export default function UpiPayModal({ due, amount: initialAmount, upiId, payeeName, submitting, error, onSubmit, onClose }: Props) {
  const [amount, setAmount] = useState(String(initialAmount))
  const [utr, setUtr] = useState('')
  const [qr, setQr] = useState<string | null>(null)
  const [localErr, setLocalErr] = useState<string | null>(null)
  const amt = Number(amount)
  const link = upiLink({ upiId, payeeName, amount: amt > 0 ? amt : initialAmount, note: dueTitle(due) })

  useEffect(() => {
    QRCode.toDataURL(link, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(null))
  }, [link])

  function submit() {
    if (!(amt > 0)) return setLocalErr('Enter the amount you paid.')
    if (amt > initialAmount) return setLocalErr(`You can pay at most ${inr(initialAmount)} for this due.`)
    const clean = utr.replace(/\s/g, '')
    if (!/^[A-Za-z0-9]{6,30}$/.test(clean)) return setLocalErr('Enter the UPI transaction ID / UTR from your UPI app (usually 12 digits).')
    setLocalErr(null)
    onSubmit(amt, clean)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center"><QrCode size={15} className="text-brand-600" /></div>
            <div>
              <h3 className="font-bold text-gray-900 leading-tight">Pay by UPI</h3>
              <p className="text-xs text-gray-400">{dueTitle(due)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"><X size={15} /></button>
        </div>

        <div className="px-6 space-y-4 pb-6">
          <div className="flex flex-col items-center bg-gray-50 rounded-xl p-4">
            {qr ? <img src={qr} alt="UPI QR code" className="w-44 h-44 rounded-lg bg-white p-1" /> : <div className="w-44 h-44" />}
            <p className="text-2xl font-bold text-gray-900 mt-3 tracking-tight">{inr(amt > 0 ? amt : 0)}</p>
            <button type="button" onClick={() => navigator.clipboard?.writeText(upiId)}
              className="mt-1 inline-flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-brand-600">
              {upiId} <Copy size={11} />
            </button>
            {payeeName && <p className="text-[11px] text-gray-400 mt-0.5">{payeeName}</p>}
          </div>

          <a href={link} className="sm:hidden flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient">
            <Smartphone size={15} /> Open UPI app
          </a>
          <p className="text-xs text-gray-500 text-center -mt-1">Scan with GPay, PhonePe, Paytm or any UPI app. After paying, enter the details below.</p>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount paid (₹)</label>
            <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">UPI transaction ID / UTR</label>
            <input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 431234567890" inputMode="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400" />
            <p className="text-[11px] text-gray-400 mt-1">Find it in your UPI app's payment details ("UPI Ref No." / "UTR").</p>
          </div>
          {(localErr || error) && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{localErr || error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={submitting}
              className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-60">
              {submitting ? 'Submitting…' : "I've paid"}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 text-center">The hostel will confirm your payment and you'll get a receipt.</p>
        </div>
      </div>
    </div>
  )
}
