import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ClipboardCheck, Download, FileSignature, Wallet, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Badge from '../../components/ui/Badge'
import AadhaarVerifyCard from '../../components/compliance/AadhaarVerifyCard'
import { acceptAgreement, agreementPdfPath, checklistPdfPath, getMyDocuments, requestAgreementOtp, respondChecklist, settlementPdfPath } from '../../api/compliance'
import { blobErrorMessage, downloadPdf, inr } from '../../lib/payments'
import { useToastStore } from '../../store/toastStore'

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const card = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'
const COND: Record<string, string> = { GOOD: 'text-emerald-700', FAIR: 'text-amber-700', DAMAGED: 'text-red-600', MISSING: 'text-red-600', NA: 'text-gray-400' }

/** Resident: Aadhaar check, agreement to accept, room checklists to confirm, deposit settlement. */
export default function MyDocuments() {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const { data, isLoading } = useQuery({ queryKey: ['my-documents'], queryFn: getMyDocuments })
  const refresh = () => qc.invalidateQueries({ queryKey: ['my-documents'] })
  const [reading, setReading] = useState<any | null>(null)
  const [viewing, setViewing] = useState<any | null>(null)

  async function pdf(path: string, name: string) {
    try { await downloadPdf(path, name) } catch (e: any) { show('error', 'Download failed', await blobErrorMessage(e, 'Could not download.')) }
  }

  if (isLoading || !data) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>

  const agreements: any[] = data.agreements ?? []
  const checklists: any[] = data.checklists ?? []
  const settlements: any[] = data.settlements ?? []
  const todo = agreements.filter((a) => a.status === 'SENT').length + checklists.filter((c) => c.status === 'SUBMITTED').length

  return (
    <div className="space-y-5">
      <PageHeader title="My Documents" subtitle={todo ? `${todo} item${todo > 1 ? 's' : ''} need your attention` : 'Your ID check, agreement, room checklists and deposit'} />

      <AadhaarVerifyCard status={data.aadhaar} onChanged={refresh} />

      <div className={card}>
        <div className="flex items-center gap-2 mb-3"><FileSignature size={17} className="text-brand-600" /><p className="font-bold text-gray-800 text-sm">Accommodation agreement</p></div>
        {agreements.length === 0 ? <p className="text-sm text-gray-400">Your hostel hasn't shared an agreement yet.</p> : agreements.map((a) => (
          <div key={a.id} className="flex items-center gap-3 flex-wrap border border-gray-100 rounded-xl p-3">
            <div className="flex-1 min-w-[12rem]">
              <p className="text-sm font-semibold text-gray-800">{a.title}</p>
              <p className="text-xs text-gray-400">{a.status === 'ACCEPTED' ? `Accepted on ${fmt(a.acceptedAt)}` : `Shared on ${fmt(a.sentAt)}`}</p>
            </div>
            <Badge status={a.status === 'ACCEPTED' ? 'APPROVED' : 'PENDING'} />
            {a.status === 'SENT'
              ? <button onClick={() => setReading(a)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white brand-gradient">Read & accept</button>
              : <button onClick={() => pdf(agreementPdfPath(a.id), `Agreement-${a.id}.pdf`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600"><Download size={13} /> PDF</button>}
          </div>
        ))}
      </div>

      <div className={card}>
        <div className="flex items-center gap-2 mb-3"><ClipboardCheck size={17} className="text-purple-600" /><p className="font-bold text-gray-800 text-sm">Room checklists</p></div>
        {checklists.length === 0 ? <p className="text-sm text-gray-400">No checklists yet.</p> : (
          <div className="space-y-2">
            {checklists.map((c) => (
              <div key={c.id} className="flex items-center gap-3 flex-wrap border border-gray-100 rounded-xl p-3">
                <div className="flex-1 min-w-[12rem]">
                  <p className="text-sm font-semibold text-gray-800">{c.kind === 'MOVE_IN' ? 'Move-in' : 'Move-out'} checklist</p>
                  <p className="text-xs text-gray-400">{c.status === 'SUBMITTED' ? 'Please check and confirm' : c.status === 'DISPUTED' ? 'You raised a concern' : `Confirmed on ${fmt(c.respondedAt)}`}</p>
                </div>
                <Badge status={c.status === 'ACKNOWLEDGED' ? 'APPROVED' : c.status === 'DISPUTED' ? 'REJECTED' : 'PENDING'} />
                <button onClick={() => setViewing(c)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${c.status === 'SUBMITTED' ? 'text-white brand-gradient' : 'border border-gray-200 text-gray-600'}`}>
                  {c.status === 'SUBMITTED' ? 'Review' : 'View'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {settlements.length > 0 && (
        <div className={card}>
          <div className="flex items-center gap-2 mb-3"><Wallet size={17} className="text-emerald-600" /><p className="font-bold text-gray-800 text-sm">Deposit settlement</p></div>
          {settlements.map((s) => (
            <div key={s.id} className="border border-gray-100 rounded-xl p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Deposit held</span><span>{inr(s.depositHeld)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Unpaid dues adjusted</span><span>− {inr(s.unpaidDues)}</span></div>
              {(s.deductions ?? []).map((d: any, i: number) => <div key={i} className="flex justify-between"><span className="text-gray-500">{d.label}</span><span>− {inr(d.amount)}</span></div>)}
              <div className="flex justify-between font-bold pt-1 border-t border-gray-100">
                <span>{Number(s.balanceDue) > 0 ? 'You still owe' : s.status === 'REFUNDED' ? 'Refunded to you' : 'Refund due to you'}</span>
                <span>{inr(Number(s.balanceDue) > 0 ? s.balanceDue : s.refundAmount)}</span>
              </div>
              {s.notes && <p className="text-xs text-gray-500">{s.notes}</p>}
              <button onClick={() => pdf(settlementPdfPath(s.id), `Deposit-settlement-${s.id}.pdf`)} className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600"><Download size={13} /> PDF</button>
            </div>
          ))}
        </div>
      )}

      {reading && <AcceptAgreementModal agreement={reading} onClose={() => setReading(null)} onDone={() => { setReading(null); refresh() }} />}
      {viewing && <ChecklistReview checklist={viewing} onClose={() => setViewing(null)} onDone={() => { setViewing(null); refresh() }} onPdf={() => pdf(checklistPdfPath(viewing.id), 'checklist.pdf')} />}
    </div>
  )
}

function AcceptAgreementModal({ agreement, onClose, onDone }: { agreement: any; onClose: () => void; onDone: () => void }) {
  const { show } = useToastStore()
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpInfo, setOtpInfo] = useState<{ otpRequired: boolean; sentTo?: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const otpMut = useMutation({ mutationFn: () => requestAgreementOtp(agreement.id), onSuccess: setOtpInfo, onError: (e: any) => setErr(e?.response?.data?.message ?? 'Could not send the code.') })
  const acceptMut = useMutation({
    mutationFn: () => acceptAgreement(agreement.id, { name, otp: otp || undefined, agree }),
    onSuccess: () => { show('success', 'Agreement accepted', 'You can download a copy any time.'); onDone() },
    onError: (e: any) => setErr(e?.response?.data?.message ?? 'Could not accept.'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <h3 className="font-bold text-gray-900 flex-1">{agreement.title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-400"><X size={16} /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto text-sm text-gray-700 whitespace-pre-line leading-relaxed flex-1">{agreement.body}</div>
        <div className="px-6 py-4 border-t border-gray-100 space-y-3">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
            I have read this agreement and I accept its terms.
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your full name to sign"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          {otpInfo?.otpRequired && (
            <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} maxLength={6} inputMode="numeric" placeholder={`6-digit code sent to ${otpInfo.sentTo}`}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-400" />
          )}
          {err && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
          {otpInfo === null ? (
            <button onClick={() => { setErr(null); otpMut.mutate() }} disabled={!agree || name.trim().length < 2 || otpMut.isPending}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient disabled:opacity-50">{otpMut.isPending ? 'Please wait…' : 'Continue'}</button>
          ) : (
            <button onClick={() => { setErr(null); acceptMut.mutate() }} disabled={acceptMut.isPending || (otpInfo.otpRequired && otp.length !== 6)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient disabled:opacity-50">{acceptMut.isPending ? 'Signing…' : 'Accept & sign'}</button>
          )}
          <p className="text-[11px] text-gray-400 text-center">Your name, the date and time, and your IP address are recorded as your electronic signature.</p>
        </div>
      </div>
    </div>
  )
}

function ChecklistReview({ checklist, onClose, onDone, onPdf }: { checklist: any; onClose: () => void; onDone: () => void; onPdf: () => void }) {
  const { show } = useToastStore()
  const [comment, setComment] = useState('')
  const [disputing, setDisputing] = useState(false)
  const mut = useMutation({
    mutationFn: (r: 'ACKNOWLEDGED' | 'DISPUTED') => respondChecklist(checklist.id, r, comment || undefined),
    onSuccess: (_, r) => { show('success', r === 'ACKNOWLEDGED' ? 'Confirmed' : 'Concern sent', r === 'ACKNOWLEDGED' ? 'Thanks for confirming.' : 'The hostel will review it.'); onDone() },
    onError: (e: any) => show('error', 'Failed', e?.response?.data?.message ?? 'Please try again.'),
  })
  const pending = checklist.status === 'SUBMITTED'
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <h3 className="font-bold text-gray-900 flex-1">{checklist.kind === 'MOVE_IN' ? 'Move-in' : 'Move-out'} checklist</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-400"><X size={16} /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto space-y-3 flex-1">
          <ul className="divide-y divide-gray-50 text-sm">
            {(checklist.items ?? []).map((i: any) => (
              <li key={i.key} className="py-2 flex gap-3">
                <span className="flex-1 text-gray-700">{i.label}{i.note && <span className="block text-xs text-gray-400">{i.note}</span>}</span>
                <span className={`text-xs font-semibold ${COND[i.condition]}`}>{i.condition === 'NA' ? 'N/A' : i.condition.charAt(0) + i.condition.slice(1).toLowerCase()}</span>
              </li>
            ))}
          </ul>
          {(checklist.keysHanded != null || checklist.meterReading) && (
            <p className="text-xs text-gray-500">{checklist.keysHanded != null && `Keys: ${checklist.keysHanded}`}{checklist.meterReading && ` · Meter: ${checklist.meterReading}`}</p>
          )}
          {checklist.staffNotes && <p className="text-xs text-gray-500">Note: {checklist.staffNotes}</p>}
          {(checklist.photos ?? []).length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {checklist.photos.map((p: any) => p.url && <a key={p.id} href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt="Room photo" className="aspect-square object-cover rounded-lg" /></a>)}
            </div>
          )}
          {disputing && (
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000} placeholder="What's not right? e.g. The fan was already making noise when I moved in."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          {pending ? (
            disputing ? (
              <>
                <button onClick={() => setDisputing(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Back</button>
                <button onClick={() => mut.mutate('DISPUTED')} disabled={!comment.trim() || mut.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 disabled:opacity-50">Send concern</button>
              </>
            ) : (
              <>
                <button onClick={() => setDisputing(true)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Something's wrong</button>
                <button onClick={() => mut.mutate('ACKNOWLEDGED')} disabled={mut.isPending} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient disabled:opacity-60">
                  <CheckCircle2 size={14} /> Looks correct
                </button>
              </>
            )
          ) : (
            <button onClick={onPdf} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600"><Download size={14} /> Download PDF</button>
          )}
        </div>
      </div>
    </div>
  )
}
