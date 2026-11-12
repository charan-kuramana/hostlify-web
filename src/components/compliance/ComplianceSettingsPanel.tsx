import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileSignature, RotateCcw, Save, ShieldCheck } from 'lucide-react'
import { getAadhaarSetup, getAgreementTemplate, resetAgreementTemplate, saveAgreementTemplate } from '../../api/compliance'
import { useToastStore } from '../../store/toastStore'

/** Settings → Compliance: Aadhaar check readiness + the agreement template. */
export default function ComplianceSettingsPanel({ hostelId }: { hostelId: number }) {
  const { data: setup } = useQuery({ queryKey: ['aadhaar-setup'], queryFn: getAadhaarSetup })
  const { data: tpl, isLoading } = useQuery({ queryKey: ['agreement-template', hostelId], queryFn: () => getAgreementTemplate(hostelId) })

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><ShieldCheck size={15} className="text-emerald-600" /></div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 text-sm">Aadhaar verification (free)</h3>
            <p className="text-xs text-gray-400 mt-0.5">Checks UIDAI's digital signature on the Aadhaar QR code to spot fake or edited Aadhaar. Use it from Members → a resident → ID & Documents, or residents can do it themselves under My Documents.</p>
          </div>
          {setup && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${setup.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{setup.ready ? 'Ready' : 'Setup needed'}</span>}
        </div>
        {setup && !setup.ready && (
          <p className="mt-3 text-xs bg-amber-50 text-amber-800 px-3 py-2 rounded-xl">
            UIDAI's public certificate hasn't been added on the server yet. The Hostlify admin needs to download it once from uidai.gov.in into the <code>aadhaar-certs</code> folder (see the README there).
          </p>
        )}
        {setup?.ready && (setup.certificates ?? []).length > 0 && (
          <ul className="mt-3 text-[11px] text-gray-400 space-y-0.5">{setup.certificates.map((c: string) => <li key={c}>✓ {c}</li>)}</ul>
        )}
      </div>

      {isLoading || !tpl ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>
      ) : <TemplateEditor key={hostelId + ':' + tpl.title + tpl.body.length} hostelId={hostelId} tpl={tpl} />}
    </div>
  )
}

function TemplateEditor({ hostelId, tpl }: { hostelId: number; tpl: any }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const ref = useRef<HTMLTextAreaElement>(null)
  const [title, setTitle] = useState<string>(tpl.title)
  const [body, setBody] = useState<string>(tpl.body)
  const [notice, setNotice] = useState<number>(tpl.noticeDays)
  const done = (msg: string) => { qc.invalidateQueries({ queryKey: ['agreement-template', hostelId] }); show('success', msg) }
  const err = (e: any) => show('error', 'Not saved', e?.response?.data?.message ?? 'Please try again.')
  const saveMut = useMutation({ mutationFn: () => saveAgreementTemplate(hostelId, { title, body, noticeDays: notice }), onSuccess: () => done('Template saved'), onError: err })
  const resetMut = useMutation({ mutationFn: () => resetAgreementTemplate(hostelId), onSuccess: () => done('Template reset to default'), onError: err })

  function insert(p: string) {
    const el = ref.current
    const token = `{{${p}}}`
    if (!el) { setBody((b) => b + token); return }
    const s = el.selectionStart, e = el.selectionEnd
    setBody((b) => b.slice(0, s) + token + b.slice(e))
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = s + token.length })
  }

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><FileSignature size={15} className="text-brand-600" /></div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 text-sm">Agreement template</h3>
          <p className="text-xs text-gray-400 mt-0.5">Sent to each resident with their details filled in; they accept it in the app. {tpl.isDefault && 'You are using the standard template.'}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-3">
        <label className="text-xs font-semibold text-gray-500">Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} className={inputCls + ' mt-1'} /></label>
        <label className="text-xs font-semibold text-gray-500">Notice period (days)<input type="number" min={0} max={180} value={notice} onChange={(e) => setNotice(Number(e.target.value))} className={inputCls + ' mt-1'} /></label>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1.5">Insert a detail (filled in per resident)</p>
        <div className="flex flex-wrap gap-1">
          {(tpl.placeholders as string[]).map((p) => (
            <button key={p} type="button" onClick={() => insert(p)} className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-700">{`{{${p}}}`}</button>
          ))}
        </div>
      </div>
      <textarea ref={ref} value={body} onChange={(e) => setBody(e.target.value)} rows={18} maxLength={30000} className={inputCls + ' font-mono text-xs leading-relaxed'} />
      <p className="text-[11px] text-gray-400">This template is a practical starting point, not legal advice. Some states require stamp duty or registration for leave-and-licence agreements (e.g. Maharashtra), so check local rules.</p>
      <div className="flex gap-2">
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold brand-gradient disabled:opacity-60">
          <Save size={14} /> {saveMut.isPending ? 'Saving…' : 'Save template'}
        </button>
        <button onClick={() => { if (confirm('Replace your template with the standard one?')) resetMut.mutate() }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600">
          <RotateCcw size={14} /> Reset to standard
        </button>
      </div>
    </div>
  )
}
