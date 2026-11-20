import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { getPaymentSettings } from '../../api/staff'

/** Staff-side reminder when the owner has chosen "electricity, water & Wi-Fi included in rent". */
export default function UtilitiesIncludedNote({ hostelId }: { hostelId: number | null }) {
  const { data } = useQuery({ queryKey: ['payment-settings', hostelId], queryFn: () => getPaymentSettings(hostelId!), enabled: !!hostelId })
  if (!data || data.utilitiesIncluded === false) return null
  return (
    <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-sm text-emerald-800">
      <Zap size={16} className="shrink-0 mt-0.5" />
      <p>Electricity, water &amp; Wi-Fi are <b>included in rent</b> for this hostel, so residents can't be billed for them.
        You can still record readings to track usage. To bill them, change it in <Link to="/admin/settings" className="font-semibold underline">Settings → Payments</Link>.</p>
    </div>
  )
}
