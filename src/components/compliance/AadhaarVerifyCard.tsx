import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, FileUp, ShieldAlert, ShieldCheck, UserCheck, X } from 'lucide-react'
import { confirmAadhaarPhoto, getAadhaarSetup, verifyAadhaar } from '../../api/compliance'
import { useToastStore } from '../../store/toastStore'

interface Props {
  /** Current verification status ({verified:false} or the verified record). */
  status: any
  /** Staff verifying a resident; omit when the resident verifies themself. */
  hostellerId?: number
  isStaff?: boolean
  onChanged: () => void
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

/** Free Aadhaar check: verifies UIDAI's digital signature on the Secure QR. Nothing uploaded is stored. */
export default function AadhaarVerifyCard({ status, hostellerId, isStaff, onChanged }: Props) {
  const { show } = useToastStore()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const { data: setup } = useQuery({ queryKey: ['aadhaar-setup'], queryFn: getAadhaarSetup, staleTime: 60_000 })
  const isPdf = !!file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))

  const verifyMut = useMutation({
    mutationFn: () => verifyAadhaar({ file: file!, password: isPdf ? password : undefined, hostellerId, consent }),
    onSuccess: (r) => { setResult(r); setErr(null); if (r.verified) onChanged() },
    onError: (e: any) => setErr(e?.response?.data?.message ?? 'Could not check this file.'),
  })
  const photoMut = useMutation({
    mutationFn: (id: number) => confirmAadhaarPhoto(id),
    onSuccess: (r) => { setResult((x: any) => ({ ...x, ...r })); onChanged(); qc.invalidateQueries({ queryKey: ['resident-docs'] }); show('success', 'Photo match confirmed') },
    onError: (e: any) => show('error', 'Failed', e?.response?.data?.message ?? 'Could not confirm.'),
  })

  function reset() { setOpen(false); setFile(null); setPassword(''); setConsent(false); setResult(null); setErr(null) }

  const verified = status?.verified
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${verified ? 'bg-emerald-50' : 'bg-gray-100'}`}>
          {verified ? <ShieldCheck size={18} className="text-emerald-600" /> : <ShieldAlert size={18} className="text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">Aadhaar verification</p>
          {verified ? (
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="font-semibold text-emerald-700">Genuine</span>, checked {fmt(status.verifiedAt)} · {status.maskedAadhaar}
              {status.name ? ` · ${status.name}` : ''}{status.dob ? ` · DOB ${status.dob}` : ''}
              {status.nameMatches === false && <span className="text-amber-600"> · name differs from profile</span>}
              {status.photoConfirmed ? <span className="text-emerald-700"> · photo matched by staff</span> : isStaff ? <span className="text-amber-600"> · photo not yet matched in person</span> : null}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">Checks the digital signature UIDAI puts in the QR code on every Aadhaar. Free, and nothing is stored except the result and the last 4 digits.</p>
          )}
        </div>
        {!open && setup?.ready && (
          <button onClick={() => setOpen(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white brand-gradient hover:opacity-90 shrink-0">
            {verified ? 'Check again' : 'Verify Aadhaar'}
          </button>
        )}
      </div>
      {setup && !setup.ready && (
        <p className="mt-3 text-xs bg-amber-50 text-amber-800 px-3 py-2 rounded-xl">Aadhaar checks aren't switched on yet: the UIDAI certificate hasn't been added on the server.</p>
      )}

      {open && !result && (
        <div className="mt-4 space-y-3 border-t border-gray-50 pt-4">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErr(null) }} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600 flex flex-col items-center gap-1">
            <FileUp size={20} />
            {file ? <span className="font-semibold text-gray-700">{file.name}</span> : 'e-Aadhaar PDF, or a clear photo / screenshot of the Aadhaar QR code'}
          </button>
          <p className="text-[11px] text-gray-400">Tip: the e-Aadhaar PDF works best. Download it free from myaadhaar.uidai.gov.in. Very old Aadhaar letters (before 2019) have a QR that can't be verified.</p>
          {isPdf && (
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="PDF password, e.g. RAVI1998"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-400" />
          )}
          {isPdf && <p className="text-[11px] text-gray-400 -mt-2">Password = first 4 letters of the name in CAPITALS + year of birth.</p>}
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span>{isStaff ? 'The resident has agreed to this Aadhaar check for identity verification at this hostel.'
              : 'I agree to let my hostel check my Aadhaar to verify my identity. Only the result, my name, date of birth, gender and the last 4 digits are kept.'}</span>
          </label>
          {err && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={() => verifyMut.mutate()} disabled={!file || !consent || verifyMut.isPending || (isPdf && !password)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-50">
              {verifyMut.isPending ? 'Checking…' : 'Check Aadhaar'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className={`mt-4 rounded-xl border p-4 ${result.verified ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/60'}`}>
          <div className="flex items-start gap-2">
            {result.verified ? <BadgeCheck size={18} className="text-emerald-600 shrink-0" /> : <ShieldAlert size={18} className="text-red-600 shrink-0" />}
            <p className={`text-sm font-semibold ${result.verified ? 'text-emerald-800' : 'text-red-700'}`}>{result.message}</p>
            <button onClick={reset} aria-label="Close" className="ml-auto text-gray-400 hover:text-gray-600"><X size={15} /></button>
          </div>
          {result.verified && (
            <div className="mt-3 flex gap-4 flex-wrap">
              {result.photo
                ? <img src={result.photo} alt="Photo from Aadhaar QR" className="w-24 h-28 object-cover rounded-lg border border-white shadow" />
                : <div className="w-24 h-28 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 text-center px-1">Photo couldn't be shown</div>}
              <dl className="text-xs space-y-1 flex-1 min-w-[12rem]">
                {[['Name', result.name, result.nameMatches === false ? 'differs from profile' : null], ['Date of birth', result.dob, result.dobMatches === false ? 'differs from profile' : null],
                  ['Gender', result.gender], ['Aadhaar', result.maskedAadhaar], ['Care of', result.careOf], ['Address', result.address]]
                  .filter(([, v]) => v).map(([k, v, warn]) => (
                    <div key={k as string} className="flex gap-2"><dt className="w-20 shrink-0 text-gray-400">{k}</dt>
                      <dd className="text-gray-800">{v}{warn && <span className="ml-1 text-amber-600 font-semibold">({warn})</span>}</dd></div>
                  ))}
              </dl>
            </div>
          )}
          {result.verified && isStaff && !result.photoConfirmed && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <p className="text-xs text-gray-600 flex-1">Does the photo match the person in front of you?</p>
              <button onClick={() => photoMut.mutate(result.id)} disabled={photoMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60">
                <UserCheck size={13} /> Yes, it's them
              </button>
            </div>
          )}
          {result.verified && <p className="mt-2 text-[11px] text-gray-400">The photo and address are shown only now and are not saved.</p>}
        </div>
      )}
    </div>
  )
}
