import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, Download, FileSignature, Plus, Trash2, Wallet, X } from 'lucide-react'
import AadhaarVerifyCard from './AadhaarVerifyCard'
import ChecklistEditor from './ChecklistEditor'
import Badge from '../ui/Badge'
import {
  agreementPdfPath, checklistPdfPath, finalizeSettlement, getResidentDocuments, markSettlementRefunded, prepareSettlement,
  previewAgreement, saveSettlement, sendAgreement, settlementPdfPath, startChecklist, voidAgreement,
} from '../../api/compliance'
import { blobErrorMessage, downloadPdf, inr } from '../../lib/payments'
import { useToastStore } from '../../store/toastStore'
import { useAuthStore } from '../../store/authStore'

const fmt = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '')
const card = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'
const btn = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold'

/** Staff → Member → "ID & Documents": Aadhaar check, agreement, move-in/out checklists, deposit settlement. */
export default function ResidentDocumentsPanel({ hostellerId, residentName }: { hostellerId: number; residentName?: string }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const { subRole } = useAuthStore()
  const isManager = !subRole || ['OWNER', 'ADMIN', 'MANAGER'].includes(subRole)
  const isSupervisor = subRole === 'SUPERVISOR'
  const key = ['resident-docs', hostellerId]
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => getResidentDocuments(hostellerId) })
  const refresh = () => qc.invalidateQueries({ queryKey: key })
  const err = (e: any, f: string) => show('error', 'Failed', e?.response?.data?.message ?? f)
  const [preview, setPreview] = useState<{ title: string; body: string } | null>(null)
  const [editing, setEditing] = useState<any | null>(null)

  const sendMut = useMutation({ mutationFn: () => sendAgreement(hostellerId), onSuccess: () => { refresh(); setPreview(null); show('success', 'Agreement sent', 'The resident has been asked to accept it.') }, onError: (e) => err(e, 'Could not send.') })
  const voidMut = useMutation({ mutationFn: (id: number) => voidAgreement(id, 'Voided by staff'), onSuccess: () => { refresh(); show('success', 'Agreement voided') }, onError: (e) => err(e, 'Could not void.') })
  const startMut = useMutation({ mutationFn: (kind: 'MOVE_IN' | 'MOVE_OUT') => startChecklist(hostellerId, kind), onSuccess: (c) => { refresh(); setEditing(c) }, onError: (e) => err(e, 'Could not open the checklist.') })

  async function pdf(path: string, name: string) {
    try { await downloadPdf(path, name) } catch (e: any) { show('error', 'Download failed', await blobErrorMessage(e, 'Could not download.')) }
  }

  if (isLoading || !data) return <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>

  const agreements: any[] = data.agreements ?? []
  const current = agreements.find((a) => a.status !== 'VOID')
  const checklists: any[] = data.checklists ?? []
  const moveIn = checklists.find((c) => c.kind === 'MOVE_IN')
  const moveOut = checklists.find((c) => c.kind === 'MOVE_OUT')

  return (
    <div className="space-y-4">
      <AadhaarVerifyCard status={data.aadhaar} hostellerId={hostellerId} isStaff onChanged={refresh} />

      {/* Agreement */}
      <div className={card}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><FileSignature size={18} className="text-brand-600" /></div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm">Accommodation agreement</p>
            {current ? (
              <p className="text-xs text-gray-500 mt-0.5">
                {current.status === 'ACCEPTED'
                  ? <>Accepted by <b>{current.acceptedName}</b> on {fmt(current.acceptedAt)}{current.acceptedWithOtp ? ' (email code verified)' : ''}</>
                  : <>Sent {fmt(current.sentAt)}: waiting for {residentName ?? 'the resident'} to accept</>}
              </p>
            ) : <p className="text-xs text-gray-400 mt-0.5">Generated from your template (Settings → Compliance) with this resident's room, rent and deposit.</p>}
          </div>
          {current && <Badge status={current.status === 'ACCEPTED' ? 'APPROVED' : 'PENDING'} />}
        </div>
        <div className="flex gap-2 flex-wrap mt-3">
          {!current && isManager && (
            <button onClick={async () => { try { setPreview(await previewAgreement(hostellerId)) } catch (e) { err(e, 'Could not build the agreement.') } }}
              className={`${btn} text-white brand-gradient`}>Preview & send</button>
          )}
          {current && <button onClick={() => pdf(agreementPdfPath(current.id), `Agreement-${current.id}.pdf`)} className={`${btn} border border-gray-200 text-gray-600`}><Download size={13} /> PDF</button>}
          {current && isManager && (
            <button onClick={() => { if (confirm('Void this agreement? You can then send a new one.')) voidMut.mutate(current.id) }}
              className={`${btn} border border-gray-200 text-gray-400 hover:text-red-600`}><Trash2 size={13} /> Void</button>
          )}
        </div>
      </div>

      {/* Checklists */}
      <div className={card}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0"><ClipboardCheck size={18} className="text-purple-600" /></div>
          <div className="flex-1">
            <p className="font-bold text-gray-800 text-sm">Room checklists</p>
            <p className="text-xs text-gray-400 mt-0.5">Record the room's condition with photos at move-in and move-out. The resident confirms each one, which protects you in deposit disputes.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {(['MOVE_IN', 'MOVE_OUT'] as const).map((kind) => {
            const c = kind === 'MOVE_IN' ? moveIn : moveOut
            return (
              <div key={kind} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-700 flex-1">{kind === 'MOVE_IN' ? 'Move-in' : 'Move-out'}</p>
                  {c && <Badge status={c.status === 'ACKNOWLEDGED' ? 'APPROVED' : c.status === 'DISPUTED' ? 'REJECTED' : c.status === 'SUBMITTED' ? 'PENDING' : 'DRAFT'} />}
                </div>
                {c?.residentComment && <p className="text-[11px] text-amber-700 mt-1">"{c.residentComment}"</p>}
                {c && <p className="text-[11px] text-gray-400 mt-1">{(c.items ?? []).filter((i: any) => i.condition === 'DAMAGED' || i.condition === 'MISSING').length} issue(s) · {(c.photos ?? []).length} photo(s)</p>}
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => (c ? setEditing(c) : startMut.mutate(kind))} disabled={startMut.isPending}
                    className={`${btn} ${c ? 'border border-gray-200 text-gray-600' : 'text-white brand-gradient'}`}>{c ? (c.status === 'DRAFT' || c.status === 'DISPUTED' ? 'Continue' : 'View') : 'Start'}</button>
                  {c && c.status !== 'DRAFT' && <button onClick={() => pdf(checklistPdfPath(c.id), `${kind}-checklist.pdf`)} className={`${btn} border border-gray-200 text-gray-600`}><Download size={13} /> PDF</button>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Deposit settlement */}
      {!isSupervisor && data.booking && (
        <SettlementCard booking={data.booking} settlement={data.settlement} isManager={isManager} onChanged={refresh} onPdf={pdf} />
      )}

      {editing && <ChecklistEditor checklist={editing} moveIn={editing.kind === 'MOVE_OUT' ? moveIn : undefined} onClose={() => setEditing(null)} onSaved={refresh} />}

      {preview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <h3 className="font-bold text-gray-900 flex-1">{preview.title}</h3>
              <button onClick={() => setPreview(null)} aria-label="Close" className="text-gray-400"><X size={16} /></button>
            </div>
            <div className="px-6 py-4 overflow-y-auto text-sm text-gray-700 whitespace-pre-line leading-relaxed">{preview.body}</div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 items-center">
              <p className="text-[11px] text-gray-400 flex-1">Blanks (____) mean a detail is missing on the profile. Fill it in first if needed.</p>
              <button onClick={() => setPreview(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Cancel</button>
              <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending} className="px-4 py-2 rounded-xl text-sm font-semibold text-white brand-gradient disabled:opacity-60">
                {sendMut.isPending ? 'Sending…' : 'Send to resident'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SettlementCard({ booking, settlement, isManager, onChanged, onPdf }: {
  booking: any; settlement: any; isManager: boolean; onChanged: () => void; onPdf: (p: string, n: string) => void
}) {
  const { show } = useToastStore()
  const [s, setS] = useState<any | null>(settlement && settlement.status === 'DRAFT' ? null : settlement)
  const [deductions, setDeductions] = useState<{ label: string; amount: string }[]>([])
  const [notes, setNotes] = useState('')
  const [refund, setRefund] = useState({ method: 'UPI', reference: '' })
  const err = (e: any, f: string) => show('error', 'Failed', e?.response?.data?.message ?? f)
  const load = (x: any) => { setS(x); setDeductions((x.deductions ?? []).map((d: any) => ({ label: d.label, amount: String(d.amount) }))); setNotes(x.notes ?? '') }

  const openMut = useMutation({ mutationFn: () => prepareSettlement(booking.id), onSuccess: load, onError: (e) => err(e, 'Could not open the settlement.') })
  const saveMut = useMutation({
    mutationFn: () => saveSettlement(s.id, { deductions: deductions.filter((d) => d.label.trim() || d.amount).map((d) => ({ label: d.label.trim(), amount: Number(d.amount) })), notes }),
    onSuccess: (x) => { load(x); show('success', 'Saved') }, onError: (e) => err(e, 'Could not save.'),
  })
  const finalizeMut = useMutation({
    mutationFn: async () => { await saveSettlement(s.id, { deductions: deductions.filter((d) => d.label.trim()).map((d) => ({ label: d.label.trim(), amount: Number(d.amount) })), notes }); return finalizeSettlement(s.id) },
    onSuccess: (x) => { load(x); onChanged(); show('success', 'Settlement finalized', 'Dues were adjusted and the resident has been notified.') }, onError: (e) => err(e, 'Could not finalize.'),
  })
  const refundMut = useMutation({ mutationFn: () => markSettlementRefunded(s.id, refund.method, refund.reference), onSuccess: (x) => { load(x); onChanged(); show('success', 'Refund recorded') }, onError: (e) => err(e, 'Could not record refund.') })

  const draft = s?.status === 'DRAFT'
  const dedTotal = deductions.reduce((t, d) => t + (Number(d.amount) || 0), 0)
  const net = s ? Number(s.depositHeld) - Number(s.unpaidDues) - dedTotal : 0
  const inputCls = 'px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white'

  return (
    <div className={card}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><Wallet size={18} className="text-emerald-600" /></div>
        <div className="flex-1">
          <p className="font-bold text-gray-800 text-sm">Deposit settlement</p>
          <p className="text-xs text-gray-400 mt-0.5">At checkout: deposit − unpaid dues − deductions = refund. {booking.status === 'ACTIVE' ? 'Resident is still checked in.' : 'Resident has checked out.'}</p>
        </div>
        {s && <Badge status={s.status === 'DRAFT' ? 'DRAFT' : s.status === 'REFUNDED' ? 'PAID' : 'APPROVED'} />}
      </div>

      {!s && (
        <button onClick={() => openMut.mutate()} disabled={openMut.isPending} className={`${btn} text-white brand-gradient mt-3`}>
          {openMut.isPending ? 'Calculating…' : settlement ? 'Continue settlement' : 'Start settlement'}
        </button>
      )}

      {s && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-gray-50 divide-y divide-gray-100 text-sm">
            <Row l="Deposit held" v={inr(s.depositHeld)} />
            <Row l="Unpaid dues" v={'− ' + inr(s.unpaidDues)} sub={(s.openDues ?? []).map((d: any) => `${d.label}: ${inr(d.outstanding)}`).join(' · ')} />
            {!draft && (s.deductions ?? []).map((d: any, i: number) => <Row key={i} l={d.label} v={'− ' + inr(d.amount)} />)}
          </div>

          {draft && (
            <>
              {(s.damageSuggestions ?? []).length > 0 && (
                <div className="text-xs bg-amber-50 text-amber-800 rounded-xl px-3 py-2">
                  From the move-out checklist: {s.damageSuggestions.join(', ')}.
                  <button onClick={() => setDeductions((d) => [...d, ...s.damageSuggestions.map((x: string) => ({ label: 'Damage: ' + x.split(' (')[0], amount: '' }))])}
                    className="ml-1 font-semibold underline">Add as deductions</button>
                </div>
              )}
              {deductions.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <input value={d.label} onChange={(e) => setDeductions((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} placeholder="Reason, e.g. Mirror replacement" className={inputCls + ' flex-1'} maxLength={120} />
                  <input value={d.amount} onChange={(e) => setDeductions((x) => x.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)))} placeholder="₹" type="number" min={1} className={inputCls + ' w-28'} />
                  <button onClick={() => setDeductions((x) => x.filter((_, j) => j !== i))} aria-label="Remove" className="text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>
                </div>
              ))}
              <button onClick={() => setDeductions((x) => [...x, { label: '', amount: '' }])} className="flex items-center gap-1 text-xs font-semibold text-brand-600"><Plus size={13} /> Add deduction</button>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes for the resident (optional)" className={inputCls + ' w-full resize-none'} maxLength={1000} />
            </>
          )}

          <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${(draft ? net : Number(s.refundAmount) - Number(s.balanceDue)) >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
            <span className="text-sm font-semibold">{(draft ? net >= 0 : Number(s.balanceDue) === 0) ? 'Refund to resident' : 'Balance payable by resident'}</span>
            <span className="text-lg font-bold">{inr(draft ? Math.abs(net) : Number(s.balanceDue) > 0 ? s.balanceDue : s.refundAmount)}</span>
          </div>

          {draft && (
            <div className="flex gap-2">
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 disabled:opacity-60">Save draft</button>
              {isManager && (
                <button onClick={() => { if (confirm('Finalize? Unpaid dues will be settled from the deposit and the resident will be notified. This cannot be undone.')) finalizeMut.mutate() }}
                  disabled={finalizeMut.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient disabled:opacity-60">
                  {finalizeMut.isPending ? 'Finalizing…' : 'Finalize settlement'}
                </button>
              )}
            </div>
          )}
          {s.status === 'FINALIZED' && Number(s.refundAmount) > 0 && isManager && (
            <div className="flex gap-2 flex-wrap items-center">
              <select value={refund.method} onChange={(e) => setRefund((r) => ({ ...r, method: e.target.value }))} className={inputCls}>
                {['UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
              <input value={refund.reference} onChange={(e) => setRefund((r) => ({ ...r, reference: e.target.value }))} placeholder="Reference / UTR" className={inputCls + ' flex-1 min-w-[8rem]'} />
              <button onClick={() => refundMut.mutate()} disabled={refundMut.isPending} className={`${btn} text-white bg-emerald-600 hover:bg-emerald-700 py-2`}>Mark refunded</button>
            </div>
          )}
          {!draft && <button onClick={() => onPdf(settlementPdfPath(s.id), `Deposit-settlement-${s.id}.pdf`)} className={`${btn} border border-gray-200 text-gray-600`}><Download size={13} /> PDF</button>}
        </div>
      )}
    </div>
  )
}

function Row({ l, v, sub }: { l: string; v: string; sub?: string }) {
  return (
    <div className="px-4 py-2.5">
      <div className="flex justify-between"><span className="text-gray-500">{l}</span><span className="font-semibold text-gray-800">{v}</span></div>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
