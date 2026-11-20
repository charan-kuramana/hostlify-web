// Lightweight loader + opener for the Razorpay Checkout widget.
// The script is injected on first use so we don't bloat index.html.

const SRC = 'https://checkout.razorpay.com/v1/checkout.js'

declare global {
  interface Window {
    Razorpay?: any
  }
}

export function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const existing = document.querySelector(`script[src="${SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))
      return
    }
    const s = document.createElement('script')
    s.src = SRC
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export interface CheckoutInfo {
  keyId: string
  orderId: string
  amountPaise: number
  currency: string
  hostellerName?: string
  description?: string
  /** Shown as the merchant name in the checkout (the hostel's name for rent). */
  businessName?: string
  email?: string
}

export interface RazorpayResult {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

/** Opens the Razorpay modal. Resolves with the payment result, or null if dismissed. */
export async function openRazorpayCheckout(info: CheckoutInfo, opts?: { prefillEmail?: string }): Promise<RazorpayResult | null> {
  const ok = await loadRazorpay()
  if (!ok || !window.Razorpay) throw new Error('Could not load the Razorpay checkout. Check your connection.')

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: info.keyId,
      amount: info.amountPaise,
      currency: info.currency || 'INR',
      name: info.businessName || 'Hostlify',
      description: info.description || 'Hostel rent payment',
      order_id: info.orderId,
      prefill: { name: info.hostellerName, email: opts?.prefillEmail ?? info.email },
      theme: { color: '#1d6ea8' },
      handler: (res: RazorpayResult) => resolve(res),
      modal: { ondismiss: () => resolve(null) },
    })
    rzp.on('payment.failed', (resp: any) => reject(new Error(resp?.error?.description || 'Payment failed')))
    rzp.open()
  })
}
