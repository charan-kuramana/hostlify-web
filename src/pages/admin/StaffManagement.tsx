import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, UserCog, Mail, Phone, Shield, Trash2, Edit2, Briefcase, CheckCircle2 } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import { getStaffMembers, createStaffMember, updateStaffMember, deactivateStaffMember, getEmployees, addEmployee, recordSalary, getPayrollSummary, removeEmployee } from '../../api/staff'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'

// ADMIN must be listed: editing an ADMIN account otherwise silently downgraded it to MANAGER
const SUB_ROLES = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'RECEPTIONIST', 'SECURITY', 'CLEANER', 'OTHER']

type StaffForm = { email: string; mobile: string; subRole: string; password: string }
const EMPTY_FORM: StaffForm = { email: '', mobile: '', subRole: 'MANAGER', password: '' }

const AVATAR_COLORS = ['bg-brand-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500']

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

type TabType = 'staff' | 'employees'

export default function StaffManagement() {
  const { activeHostelId, subRole: mySubRole, email: myEmail } = useAuthStore()
  // Only OWNER/ADMIN manage staff accounts; only an OWNER may grant or change ADMIN access
  const canManageStaff = mySubRole === 'OWNER' || mySubRole === 'ADMIN'
  const roleOptions = mySubRole === 'OWNER' ? SUB_ROLES : SUB_ROLES.filter((r) => r !== 'ADMIN')
  const canEditRow = (s: any) => canManageStaff && s.subRole !== 'OWNER' && s.email !== myEmail
    && (mySubRole === 'OWNER' || s.subRole !== 'ADMIN')
  const queryClient = useQueryClient()
  const { show } = useToastStore()
  const [activeTab, setActiveTab] = useState<TabType>('staff')

  // ── Staff Accounts ────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM)
  const [confirmDeactivate, setConfirmDeactivate] = useState<number | null>(null)

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff', activeHostelId],
    queryFn: () => getStaffMembers(activeHostelId!),
    enabled: !!activeHostelId && activeTab === 'staff',
  })

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => createStaffMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', activeHostelId] })
      setShowForm(false)
      setForm(EMPTY_FORM)
      show('success', 'Staff member added', 'New staff account has been created.')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Please check the details and try again.'
      show('error', 'Failed to add staff', msg)
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => updateStaffMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', activeHostelId] })
      setEditId(null)
      setForm(EMPTY_FORM)
      show('success', 'Staff updated', 'Staff details have been updated.')
    },
    onError: (err: any) => show('error', 'Update failed', err?.response?.data?.message ?? 'Could not update staff details.'),
  })

  const deactivateMut = useMutation({
    mutationFn: (id: number) => deactivateStaffMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', activeHostelId] })
      setConfirmDeactivate(null)
      show('success', 'Staff deactivated', 'Staff member has been deactivated.')
    },
    onError: (err: any) => show('error', 'Deactivation failed', err?.response?.data?.message ?? 'Could not deactivate staff member.'),
  })

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(s: any) {
    setEditId(s.id)
    setForm({ email: s.email ?? '', mobile: s.mobile ?? '', subRole: s.subRole ?? 'MANAGER', password: '' })
    setShowForm(true)
  }

  function handleStaffSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.mobile && !/^[6-9]\d{9}$/.test(form.mobile.trim())) {
      show('error', 'Invalid mobile', 'Enter a 10-digit Indian mobile number.'); return
    }
    if (editId === null && form.password && form.password.length < 8) {
      show('error', 'Weak password', 'Password must be at least 8 characters.'); return
    }
    if (editId !== null) {
      updateMut.mutate({ id: editId, data: { mobile: form.mobile, subRole: form.subRole } })
    } else {
      createMut.mutate({
        email: form.email,
        mobile: form.mobile,
        subRole: form.subRole,
        password: form.password || undefined,
        hostelId: activeHostelId,
      })
    }
  }

  const activeCount = (staff as any[]).filter((s) => s.status === 'ACTIVE').length

  // ── Employees & Payroll ───────────────────────────────────────────────────────
  const [showEmpForm, setShowEmpForm] = useState(false)
  const [confirmSalaryId, setConfirmSalaryId] = useState<number | null>(null)
  const [empForm, setEmpForm] = useState({ employeeName: '', designation: '', mobile: '', salary: '', joinDate: '' })

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ['employees', activeHostelId],
    queryFn: () => getEmployees(activeHostelId!),
    enabled: !!activeHostelId && activeTab === 'employees',
  })

  const nowD = new Date()
  const { data: payroll } = useQuery({
    queryKey: ['payroll', activeHostelId, nowD.getMonth() + 1, nowD.getFullYear()],
    queryFn: () => getPayrollSummary(activeHostelId!, nowD.getMonth() + 1, nowD.getFullYear()),
    enabled: !!activeHostelId && activeTab === 'employees',
  })
  const payrollByEmp: Record<number, any> = Object.fromEntries(((payroll?.employees ?? []) as any[]).map((p) => [p.employeeId, p]))
  const inr = (n: any) => '₹' + Number(n ?? 0).toLocaleString('en-IN')

  const addEmpMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => addEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', activeHostelId] })
      setShowEmpForm(false)
      setEmpForm({ employeeName: '', designation: '', mobile: '', salary: '', joinDate: '' })
      show('success', 'Employee added', 'New employee has been added successfully.')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Please check the details and try again.'
      show('error', 'Failed to add employee', msg)
    },
  })

  const salaryMut = useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: number; data: Record<string, unknown> }) =>
      recordSalary(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', activeHostelId] })
      queryClient.invalidateQueries({ queryKey: ['payroll', activeHostelId] })
      setConfirmSalaryId(null)
      show('success', 'Salary recorded', 'Salary has been marked as paid.')
    },
    onError: (err: any) => {
      show('error', 'Failed to record salary', err?.response?.data?.message ?? 'Please try again.')
    },
  })

  const removeEmpMut = useMutation({
    mutationFn: (id: number) => removeEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', activeHostelId] })
      queryClient.invalidateQueries({ queryKey: ['payroll', activeHostelId] })
      show('success', 'Employee removed')
    },
    onError: (err: any) => show('error', 'Could not remove employee', err?.response?.data?.message ?? 'Please try again.'),
  })

  const now = new Date()
  const confirmEmployee = (employees as any[]).find((e: any) => e.id === confirmSalaryId)

  function handleEmpSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeHostelId) { show('error', 'No hostel selected', 'Please select a hostel first.'); return }
    if (!(Number(empForm.salary) > 0)) { show('error', 'Invalid salary', 'Monthly salary must be greater than 0.'); return }
    if (empForm.mobile && !/^[6-9]\d{9}$/.test(empForm.mobile.trim())) { show('error', 'Invalid mobile', 'Enter a 10-digit Indian mobile number.'); return }
    addEmpMut.mutate({
      hostelId: activeHostelId,
      employeeName: empForm.employeeName,
      designation: empForm.designation,
      mobile: empForm.mobile,
      salary: Number(empForm.salary),
      joinDate: empForm.joinDate,
    })
  }

  function handleRecordSalary(id: number) {
    const amount = payrollByEmp[id]?.payable ?? confirmEmployee?.baseSalary ?? confirmEmployee?.salary ?? 0
    salaryMut.mutate({
      employeeId: id,
      data: { month: now.getMonth() + 1, year: now.getFullYear(), amount },
    })
  }

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & Employees"
        subtitle="Manage staff accounts and employee payroll"
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'staff' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserCog size={13} /> Staff Accounts
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'employees' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Briefcase size={13} /> Employees & Payroll
        </button>
      </div>

      {/* ── Staff Accounts Tab ── */}
      {activeTab === 'staff' && (
        <>
          {canManageStaff && <div className="flex justify-end">
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
            >
              <Plus size={16} /> Add Staff
            </button>
          </div>}

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              label="Total Staff"
              value={(staff as any[]).length}
              sub="All staff accounts"
              icon={<UserCog size={20} className="text-brand-600" />}
              iconBg="bg-brand-50"
            />
            <StatCard
              label="Active"
              value={activeCount}
              sub="Currently active"
              icon={<Shield size={20} className="text-emerald-600" />}
              iconBg="bg-emerald-50"
            />
          </div>

          {/* Add / Edit Form */}
          {showForm && (
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
                    <UserCog size={14} className="text-brand-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm">{editId ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>
                </div>
                <button
                  onClick={() => { setShowForm(false); setEditId(null) }}
                  className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
              <form onSubmit={handleStaffSubmit} className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {!editId && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="staff@email.com"
                        className={inputCls}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mobile</label>
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                      placeholder="Mobile number"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Role</label>
                    <select
                      value={form.subRole}
                      onChange={(e) => setForm((f) => ({ ...f, subRole: e.target.value }))}
                      className={inputCls + ' bg-white'}
                    >
                      {(roleOptions.includes(form.subRole) ? roleOptions : [form.subRole, ...roleOptions]).map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  {!editId && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Password <span className="font-normal text-gray-400 normal-case">(leave blank for default)</span>
                      </label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        placeholder="Hostlify@123 (default)"
                        className={inputCls}
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditId(null) }}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMut.isPending || updateMut.isPending}
                    className="px-5 py-2 text-sm rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
                  >
                    {(createMut.isPending || updateMut.isPending) ? 'Saving…' : (editId ? 'Update' : 'Add Staff')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Staff Table */}
          {staffLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Staff Member</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Mobile</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(staff as any[]).map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                              {(s.email ?? '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 text-xs">{s.email}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Mail size={10} /> {s.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-semibold bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full">
                            {s.subRole ?? '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-1 text-gray-600 text-xs">
                            <Phone size={11} className="text-gray-400" /> {s.mobile ?? '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge status={s.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          {canEditRow(s) ? <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(s)}
                              className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 hover:bg-brand-100 transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => setConfirmDeactivate(s.id)}
                              className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                              title="Deactivate"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div> : <p className="text-right text-xs text-gray-300">—</p>}
                        </td>
                      </tr>
                    ))}
                    {(staff as any[]).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                          No staff members added yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Employees & Payroll Tab ── */}
      {activeTab === 'employees' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowEmpForm(!showEmpForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
            >
              <Plus size={16} /> Add Employee
            </button>
          </div>

          {/* Payroll stat cards (this month) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Monthly Payable"
              value={inr(payroll?.totalPayable)}
              sub={`${(employees as any[]).length} employees`}
              icon={<Briefcase size={20} className="text-brand-600" />}
              iconBg="bg-brand-50"
            />
            <StatCard
              label="Paid"
              value={inr(payroll?.totalPaid)}
              sub="This month"
              icon={<CheckCircle2 size={20} className="text-emerald-600" />}
              iconBg="bg-emerald-50"
            />
            <StatCard
              label="Pending"
              value={inr(payroll?.totalPending)}
              sub="Awaiting payment"
              icon={<Briefcase size={20} className="text-amber-600" />}
              iconBg="bg-amber-50"
            />
          </div>

          {/* Add Employee Form */}
          {showEmpForm && (
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Briefcase size={14} className="text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm">Add New Employee</h3>
                </div>
                <button
                  onClick={() => setShowEmpForm(false)}
                  className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
              <form onSubmit={handleEmpSubmit} className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Employee Name</label>
                    <input
                      required
                      value={empForm.employeeName}
                      onChange={(e) => setEmpForm((f) => ({ ...f, employeeName: e.target.value }))}
                      placeholder="Full name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Designation</label>
                    <input
                      required
                      value={empForm.designation}
                      onChange={(e) => setEmpForm((f) => ({ ...f, designation: e.target.value }))}
                      placeholder="Cook, Cleaner, etc."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mobile</label>
                    <input
                      required
                      type="tel"
                      value={empForm.mobile}
                      onChange={(e) => setEmpForm((f) => ({ ...f, mobile: e.target.value }))}
                      placeholder="Mobile number"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Monthly Salary (₹)</label>
                    <input
                      type="number"
                      value={empForm.salary}
                      onChange={(e) => setEmpForm((f) => ({ ...f, salary: e.target.value }))}
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Join Date</label>
                    <input
                      type="date"
                      value={empForm.joinDate}
                      onChange={(e) => setEmpForm((f) => ({ ...f, joinDate: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEmpForm(false)}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addEmpMut.isPending}
                    className="px-5 py-2 text-sm rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
                  >
                    {addEmpMut.isPending ? 'Adding…' : 'Add Employee'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Employee Cards */}
          {empLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(employees as any[]).map((emp: any, i: number) => (
                <div key={emp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                        {getInitials(emp.employeeName ?? emp.name ?? '??')}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-tight">{emp.employeeName ?? emp.name}</p>
                        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                          {emp.designation ?? emp.role}
                        </span>
                      </div>
                    </div>
                    {(() => {
                      const pr = payrollByEmp[emp.id]
                      const st = pr?.status === 'PAID' ? 'PAID' : 'PENDING'
                      return <Badge status={st} />
                    })()}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <div>
                      <p className="text-xs text-gray-400">Monthly Payable</p>
                      <p className="text-base font-bold text-gray-900">{inr(payrollByEmp[emp.id]?.payable ?? emp.baseSalary ?? emp.salary ?? 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">This Month</p>
                      <p className={`text-xs font-semibold ${payrollByEmp[emp.id]?.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {payrollByEmp[emp.id]?.status === 'PAID' ? 'Paid' : 'Pending'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {payrollByEmp[emp.id]?.status !== 'PAID' && (
                      <button
                        onClick={() => setConfirmSalaryId(emp.id)}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 brand-gradient"
                      >
                        Pay Salary
                      </button>
                    )}
                    <button
                      onClick={() => { if (window.confirm(`Remove ${emp.name ?? 'this employee'} from the payroll?`)) removeEmpMut.mutate(emp.id) }}
                      disabled={removeEmpMut.isPending}
                      title="Remove employee"
                      className="px-3 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {(employees as any[]).length === 0 && (
                <div className="col-span-full bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-sm text-gray-400">
                  No employees added yet
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Confirm Deactivate Modal */}
      {confirmDeactivate !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Deactivate Staff Member?</h3>
            <p className="text-sm text-gray-500 mb-6">This will deactivate the staff account. They will no longer be able to log in.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeactivate(null)}
                className="flex-1 px-4 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deactivateMut.mutate(confirmDeactivate)}
                disabled={deactivateMut.isPending}
                className="flex-1 px-4 py-2.5 text-sm text-white rounded-xl font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 bg-red-500"
              >
                {deactivateMut.isPending ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Salary Modal */}
      {confirmSalaryId !== null && confirmEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle2 size={22} className="text-emerald-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Record Salary Payment</h3>
            <p className="text-sm text-gray-500 mb-2">
              Record {inr(payrollByEmp[confirmEmployee.id]?.payable ?? confirmEmployee.baseSalary ?? 0)} salary payment for{' '}
              <span className="font-semibold text-gray-700">{confirmEmployee.employeeName ?? confirmEmployee.name}</span>?
            </p>
            <p className="text-xs text-gray-400 mb-6">This will mark their salary as PAID for this month.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmSalaryId(null)}
                className="flex-1 px-4 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRecordSalary(confirmSalaryId)}
                disabled={salaryMut.isPending}
                className="flex-1 px-4 py-2.5 text-sm text-white rounded-xl font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
              >
                {salaryMut.isPending ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
