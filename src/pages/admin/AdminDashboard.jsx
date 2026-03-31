import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  FileWarning,
  HeartPulse,
  LoaderCircle,
  RefreshCcw,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserRound,
  UserRoundPlus,
  Workflow,
} from "lucide-react";
import AdminShell from "../../components/admin/AdminShell";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminSectionCard from "../../components/admin/AdminSectionCard";
import AdminStatTile from "../../components/admin/AdminStatTile";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import AdminTable from "../../components/admin/AdminTable";
import AdminConfirmModal from "../../components/admin/AdminConfirmModal";
import { adminTheme } from "../../components/admin/adminTheme";
import { authService } from "../../services/auth.service";
import adminService from "../../services/admin.service";

const MODULES = [
  { key: "dashboard", label: "Dashboard", description: "Operational overview, health metrics, and live system posture.", icon: Activity },
  { key: "doctors", label: "Doctors", description: "Register clinicians, change availability, and reset access.", icon: Stethoscope },
  { key: "patients", label: "Patients", description: "Search patient records, inspect counts, and remove accounts.", icon: UserRound },
  { key: "cases", label: "Cases", description: "Review all consultation cases, assign doctors, and update state.", icon: Workflow },
  { key: "reports", label: "Reports", description: "Monitor report ingestion, extracted confidence, and failures.", icon: FileWarning },
  { key: "system", label: "System Status", description: "Backend, database, health ping, and AI engine heartbeat.", icon: HeartPulse },
  { key: "pipeline", label: "AI Pipeline", description: "Processing queue, recent logs, and evaluation outcomes.", icon: Bot },
];

const INITIAL_DOCTOR_FORM = {
  full_name: "",
  email: "",
  password: "",
  specialization: "",
  license_number: "",
  hospital: "",
  location: "",
  phone_number: "",
  bio: "",
};

function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="space-y-2">
      <div className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">{label}</div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={adminTheme.input}
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder }) {
  return (
    <label className="space-y-2">
      <div className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">{label}</div>
      <textarea
        rows={3}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={adminTheme.textArea}
      />
    </label>
  );
}

function InlineSelect({ value, onChange, options }) {
  return (
    <select
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || null)}
      className="w-full rounded-xl border border-white/10 bg-[#0D1424]/90 px-3 py-2 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/40"
    >
      <option value="">Unassigned</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function InlineStatusSelect({ value, onChange, options }) {
  return (
    <select
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || null)}
      className="w-full rounded-xl border border-white/10 bg-[#0D1424]/90 px-3 py-2 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/40"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function MessageBanner({ tone = "info", children }) {
  const styles =
    tone === "error"
      ? "border-rose-500/30 bg-rose-500/12 text-rose-50 shadow-[0_14px_34px_rgba(244,63,94,0.12)]"
      : tone === "success"
        ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-50 shadow-[0_14px_34px_rgba(16,185,129,0.12)]"
        : "border-cyan-500/30 bg-cyan-500/12 text-cyan-50 shadow-[0_14px_34px_rgba(34,211,238,0.12)]";

  return <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${styles}`}>{children}</div>;
}

function formatDateTime(value) {
  if (!value) return "Pending";
  return new Date(value).toLocaleString();
}

function formatDate(value) {
  if (!value) return "Pending";
  return new Date(value).toLocaleDateString();
}

function buildMetricTiles(summary) {
  return [
    { label: "Total Patients", value: summary?.total_patients ?? 0, helper: "Registered patient records", icon: UserRound, tone: "default" },
    { label: "Total Doctors", value: summary?.total_doctors ?? 0, helper: "Clinicians in the platform", icon: Stethoscope, tone: "default" },
    { label: "Active Cases", value: summary?.active_cases ?? 0, helper: "Pending, open, and in-review cases", icon: Workflow, tone: "warning" },
    { label: "Reports Processed", value: summary?.reports_processed ?? 0, helper: "Structured reports completed by AI", icon: FileWarning, tone: "healthy" },
    {
      label: "System Health",
      value: String(summary?.system_health || "unknown").toUpperCase(),
      helper: "Overall admin posture",
      icon: ShieldCheck,
      tone: summary?.system_health === "healthy" ? "healthy" : summary?.system_health === "critical" ? "critical" : "warning",
    },
  ];
}

export default function AdminDashboard() {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [summary, setSummary] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [cases, setCases] = useState([]);
  const [reports, setReports] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [healthPing, setHealthPing] = useState(null);
  const [doctorForm, setDoctorForm] = useState(INITIAL_DOCTOR_FORM);
  const [patientSearch, setPatientSearch] = useState("");
  const [confirmState, setConfirmState] = useState(null);
  const [caseDrafts, setCaseDrafts] = useState({});
  const [copiedEndpoint, setCopiedEndpoint] = useState("");

  const loadAdminData = async () => {
    setError("");
    const currentUser = await authService.getMe();
    setAuthUser(currentUser);
    if (String(currentUser?.role).toLowerCase() !== "admin") return;

    const [dashboardData, doctorData, patientData, caseData, reportData, systemData, pipelineData, pingData] =
      await Promise.all([
        adminService.getAdminDashboard(),
        adminService.getDoctors(),
        adminService.getPatients(),
        adminService.getCases(),
        adminService.getReports(),
        adminService.getSystemStatus(),
        adminService.getPipeline(),
        adminService.pingHealth(),
      ]);

    setSummary(dashboardData);
    setDoctors(doctorData);
    setPatients(patientData);
    setCases(caseData);
    setReports(reportData);
    setSystemStatus(systemData);
    setPipeline(pipelineData);
    setHealthPing(pingData);
    setCaseDrafts(
      Object.fromEntries(
        caseData.map((item) => [
          item.id,
          {
            doctor_id: item.doctor_id || null,
            status: item.status,
          },
        ])
      )
    );
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await loadAdminData();
      } catch (loadError) {
        setError(loadError.message || "Failed to load admin workspace.");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const metricTiles = useMemo(() => buildMetricTiles(summary), [summary]);
  const filteredPatients = useMemo(() => {
    const query = patientSearch.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((patient) =>
      [patient.full_name, patient.email, patient.patient_id, patient.phone_number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [patients, patientSearch]);

  const doctorOptions = useMemo(
    () =>
      doctors
        .filter((doctor) => doctor.is_active)
        .map((doctor) => ({
          value: doctor.id,
          label: `${doctor.full_name} · ${doctor.specialization}`,
        })),
    [doctors]
  );

  const criticalLogs = useMemo(() => (pipeline?.recent_logs || []).filter((item) => item.status === "failed"), [pipeline]);

  const handleRefresh = async () => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await loadAdminData();
      setSuccess("Admin data refreshed.");
    } catch (refreshError) {
      setError(refreshError.message || "Failed to refresh admin data.");
    } finally {
      setBusy(false);
    }
  };

  const handleDoctorCreate = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await adminService.createDoctor(doctorForm);
      setDoctorForm(INITIAL_DOCTOR_FORM);
      await loadAdminData();
      setSuccess("Doctor registered successfully.");
      setActiveModule("doctors");
    } catch (createError) {
      setError(createError.message || "Failed to register doctor.");
    } finally {
      setBusy(false);
    }
  };

  const handleDoctorToggle = async () => {
    if (!confirmState?.payload?.doctorId) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const { doctorId, nextState } = confirmState.payload;
      await adminService.updateDoctorStatus(doctorId, nextState);
      await loadAdminData();
      setSuccess(`Doctor ${nextState ? "enabled" : "disabled"} successfully.`);
      setConfirmState(null);
    } catch (toggleError) {
      setError(toggleError.message || "Failed to update doctor.");
    } finally {
      setBusy(false);
    }
  };

  const handleDoctorReset = async (doctorId) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await adminService.resetDoctorPassword(doctorId);
      setSuccess(`Temporary password generated: ${response.temporary_password}`);
    } catch (resetError) {
      setError(resetError.message || "Failed to reset doctor password.");
    } finally {
      setBusy(false);
    }
  };

  const handlePatientDelete = async () => {
    if (!confirmState?.payload?.patientId) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await adminService.deletePatient(confirmState.payload.patientId);
      await loadAdminData();
      setSuccess("Patient removed successfully.");
      setConfirmState(null);
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete patient.");
    } finally {
      setBusy(false);
    }
  };

  const handleCaseDraftChange = (caseId, field, value) => {
    setCaseDrafts((current) => ({
      ...current,
      [caseId]: {
        ...(current[caseId] || {}),
        [field]: value,
      },
    }));
  };

  const handleCaseSave = async (caseId) => {
    const draft = caseDrafts[caseId];
    if (!draft) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await adminService.updateCase(caseId, draft);
      await loadAdminData();
      setSuccess("Case updated successfully.");
    } catch (updateError) {
      setError(updateError.message || "Failed to update case.");
    } finally {
      setBusy(false);
    }
  };

  const handleCopyDebugEndpoint = async (endpoint) => {
    try {
      const value = `${endpoint} (upload a report file to inspect pipeline output)`;
      await navigator.clipboard.writeText(value);
      setCopiedEndpoint(endpoint);
      setTimeout(() => setCopiedEndpoint(""), 1800);
    } catch {
      setError("Unable to copy the debug endpoint.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <LoaderCircle size={30} className="animate-spin text-cyan-300" />
      </div>
    );
  }

  if (String(authUser?.role || "").toLowerCase() !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="max-w-xl rounded-2xl border border-rose-500/20 bg-rose-500/12 p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-rose-300">Access Restricted</div>
          <h1 className="mt-4 text-3xl font-black text-white">Admin role required</h1>
          <p className="mt-3 text-sm leading-7 text-rose-100/90">
            This control surface is only available to administrator accounts. Your current role does not have permission to open the admin panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminShell sidebar={<AdminSidebar items={MODULES} activeKey={activeModule} onChange={setActiveModule} />}>
        <section className={`${adminTheme.headerSurface} px-6 py-6`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className={adminTheme.eyebrow}>Administration</div>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white">DoctorCopilot Control Surface</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-400">
                Oversee platform operations, clinical teams, patient records, and the AI extraction pipeline from one premium admin workspace.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={busy}
              className={`${adminTheme.accentButton} disabled:opacity-50`}
            >
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refresh Workspace
            </button>
          </div>
        </section>

        {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
        {success ? <MessageBanner tone="success">{success}</MessageBanner> : null}

        {activeModule === "dashboard" ? (
          <div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-5">
              {metricTiles.map((tile) => (
                <AdminStatTile key={tile.label} {...tile} />
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <AdminSectionCard
                title="System Status"
                subtitle="Live operational state across backend, database connectivity, frontend reachability, and AI processing readiness."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className={`${adminTheme.insetSurface} p-5`}>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Backend</div>
                    <div className="mt-3 flex items-center gap-3">
                      <AdminStatusBadge value={systemStatus?.backend_status || "unknown"} />
                      <span className="text-sm text-gray-400">/health latency {healthPing?.latencyMs ?? "--"} ms</span>
                    </div>
                  </div>
                  <div className={`${adminTheme.insetSurface} p-5`}>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Database</div>
                    <div className="mt-3 flex items-center gap-3">
                      <AdminStatusBadge value={systemStatus?.database_status || "unknown"} />
                    </div>
                  </div>
                  <div className={`${adminTheme.insetSurface} p-5`}>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Frontend</div>
                    <div className="mt-3 flex items-center gap-3">
                      <AdminStatusBadge value={summary?.frontend_status || "connected"} />
                    </div>
                  </div>
                  <div className={`${adminTheme.insetSurface} p-5`}>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">AI Engine</div>
                    <div className="mt-3 flex items-center gap-3">
                      <AdminStatusBadge value={systemStatus?.ai_engine_state || summary?.ai_processing_state || "unknown"} />
                    </div>
                  </div>
                </div>
              </AdminSectionCard>

              <AdminSectionCard
                title="AI Pipeline Snapshot"
                subtitle="Operational throughput, failures, and recent model output quality."
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <AdminStatTile label="Processing" value={pipeline?.reports_in_processing ?? 0} tone="warning" />
                  <AdminStatTile label="Success Logs" value={pipeline?.success_logs ?? 0} tone="healthy" />
                  <AdminStatTile label="Failure Logs" value={pipeline?.failure_logs ?? 0} tone={pipeline?.failure_logs ? "critical" : "default"} />
                </div>
                <div className={`mt-5 ${adminTheme.insetSurface} bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(139,92,246,0.06),rgba(10,15,28,0.92))] p-5`}>
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Latest evaluation results</div>
                  <div className="mt-4 space-y-3">
                    {(pipeline?.evaluation_results || []).slice(0, 4).map((item) => (
                      <div key={item.report_id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-300 hover:scale-[1.01] hover:bg-white/8">
                        <div>
                          <div className="font-semibold text-white">{item.file_name}</div>
                          <div className="text-xs text-gray-400">{formatDateTime(item.processed_at)}</div>
                        </div>
                        <div className="text-sm font-bold text-cyan-100">{item.confidence ?? "--"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </AdminSectionCard>
            </div>
          </div>
        ) : null}

        {activeModule === "doctors" ? (
          <div className="space-y-6">
            <AdminSectionCard
              title="Register Doctor"
              subtitle="Create a new doctor account and wire it directly into the clinical network."
              actions={
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-gray-300">
                  <UserRoundPlus size={14} />
                  Doctor onboarding
                </div>
              }
            >
              <form onSubmit={handleDoctorCreate} className="grid gap-4 xl:grid-cols-3">
                <InputField label="Full Name" value={doctorForm.full_name} onChange={(event) => setDoctorForm((current) => ({ ...current, full_name: event.target.value }))} placeholder="Dr. Aarav Sharma" />
                <InputField label="Email" type="email" value={doctorForm.email} onChange={(event) => setDoctorForm((current) => ({ ...current, email: event.target.value }))} placeholder="doctor@hospital.com" />
                <InputField label="Password" type="password" value={doctorForm.password} onChange={(event) => setDoctorForm((current) => ({ ...current, password: event.target.value }))} placeholder="Minimum 8 characters" />
                <InputField label="Specialization" value={doctorForm.specialization} onChange={(event) => setDoctorForm((current) => ({ ...current, specialization: event.target.value }))} placeholder="Cardiology" />
                <InputField label="License Number" value={doctorForm.license_number} onChange={(event) => setDoctorForm((current) => ({ ...current, license_number: event.target.value }))} placeholder="MCI-AX-4432" />
                <InputField label="Hospital" value={doctorForm.hospital} onChange={(event) => setDoctorForm((current) => ({ ...current, hospital: event.target.value }))} placeholder="AIIMS Delhi" />
                <InputField label="Location" value={doctorForm.location} onChange={(event) => setDoctorForm((current) => ({ ...current, location: event.target.value }))} placeholder="Delhi" />
                <InputField label="Phone" value={doctorForm.phone_number} onChange={(event) => setDoctorForm((current) => ({ ...current, phone_number: event.target.value }))} placeholder="98XXXXXXXX" />
                <TextAreaField label="Bio" value={doctorForm.bio} onChange={(event) => setDoctorForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Short clinical profile" />
                <div className="xl:col-span-3">
                  <button type="submit" disabled={busy} className={`${adminTheme.accentButton} disabled:opacity-50`}>
                    {busy ? <LoaderCircle size={16} className="animate-spin" /> : <UserRoundPlus size={16} />}
                    Create Doctor
                  </button>
                </div>
              </form>
            </AdminSectionCard>

            <AdminSectionCard title="Doctor Management" subtitle="Enable or disable clinicians, inspect assignments, and reset credentials securely.">
              <AdminTable
                columns={["Doctor", "Specialization", "Location", "Status", "Actions"]}
                rows={doctors.map((doctor) => ({
                  key: doctor.id,
                  cells: [
                    <div>
                      <div className="font-semibold text-white">{doctor.full_name}</div>
                      <div className="text-xs text-gray-400">{doctor.email}</div>
                    </div>,
                    <div>
                      <div>{doctor.specialization}</div>
                      <div className="text-xs text-gray-400">{doctor.license_number}</div>
                    </div>,
                    <div>
                      <div>{doctor.hospital || "Hospital pending"}</div>
                      <div className="text-xs text-gray-400">{doctor.location || "Location pending"}</div>
                    </div>,
                    <AdminStatusBadge value={doctor.is_active ? "active" : "disabled"} />,
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            kind: "doctor-toggle",
                            title: `${doctor.is_active ? "Disable" : "Enable"} doctor`,
                            description: `This will ${doctor.is_active ? "disable" : "enable"} ${doctor.full_name}'s login access.`,
                            payload: { doctorId: doctor.id, nextState: !doctor.is_active },
                          })
                        }
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-white/10"
                      >
                        {doctor.is_active ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDoctorReset(doctor.id)}
                        className="rounded-xl border border-cyan-400/20 bg-cyan-500/15 px-3 py-2 text-xs font-bold text-cyan-50 transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-500/22"
                      >
                        Reset Password
                      </button>
                    </div>,
                  ],
                }))}
                emptyMessage="No doctors have been registered yet."
              />
            </AdminSectionCard>
          </div>
        ) : null}

        {activeModule === "patients" ? (
          <AdminSectionCard
            title="Patient Management"
            subtitle="Search patient identities, inspect counts, and remove records when required by admin policy."
            actions={
              <div className="w-full max-w-sm">
                <input
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder="Search name, email, patient ID, phone..."
                  className={adminTheme.input}
                />
              </div>
            }
          >
            <AdminTable
              columns={["Patient", "Clinical Profile", "Volume", "Actions"]}
              rows={filteredPatients.map((patient) => ({
                key: patient.id,
                cells: [
                  <div>
                    <div className="font-semibold text-white">{patient.full_name}</div>
                    <div className="text-xs text-gray-400">{patient.email}</div>
                    <div className="mt-1 text-xs text-gray-500">{patient.patient_id}</div>
                  </div>,
                  <div>
                    <div>{patient.gender || "Gender pending"} · {patient.age ?? "Age pending"}</div>
                    <div className="text-xs text-gray-400">{patient.blood_group || "Blood group pending"}</div>
                    <div className="text-xs text-gray-500">{patient.phone_number || "Phone pending"}</div>
                  </div>,
                  <div>
                    <div>{patient.report_count} reports</div>
                    <div className="text-xs text-gray-400">{patient.active_case_count} active cases</div>
                  </div>,
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmState({
                          kind: "patient-delete",
                          title: "Delete patient",
                          description: `This will permanently remove ${patient.full_name} and all linked reports, cases, and appointments.`,
                          payload: { patientId: patient.id },
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-500/12 px-3 py-2 text-xs font-bold text-rose-100 hover:bg-rose-500/18"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>,
                ],
              }))}
              emptyMessage="No patients match the current search."
            />
          </AdminSectionCard>
        ) : null}

        {activeModule === "cases" ? (
          <AdminSectionCard title="Case Management" subtitle="Assign doctors, update case state, and keep consultation flow moving.">
            <AdminTable
              columns={["Case", "Patient", "Doctor", "Status", "Save"]}
              rows={cases.map((item) => ({
                key: item.id,
                cells: [
                  <div>
                    <div className="font-semibold text-white">{item.title}</div>
                    <div className="text-xs text-gray-400">{item.description || "No description"}</div>
                  </div>,
                  <div>
                    <div>{item.patient_name}</div>
                    <div className="text-xs text-gray-400">{formatDateTime(item.created_at)}</div>
                  </div>,
                  <InlineSelect value={caseDrafts[item.id]?.doctor_id} onChange={(value) => handleCaseDraftChange(item.id, "doctor_id", value)} options={doctorOptions} />,
                  <InlineStatusSelect
                    value={caseDrafts[item.id]?.status}
                    onChange={(value) => handleCaseDraftChange(item.id, "status", value)}
                    options={[
                      { value: "pending", label: "Pending" },
                      { value: "open", label: "Open" },
                      { value: "in_review", label: "In Review" },
                      { value: "closed", label: "Closed" },
                      { value: "transferred", label: "Transferred" },
                    ]}
                  />,
                  <button type="button" onClick={() => handleCaseSave(item.id)} className="rounded-xl border border-cyan-400/20 bg-cyan-500/15 px-3 py-2 text-xs font-bold text-cyan-50 transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-500/22">
                    Save
                  </button>,
                ],
              }))}
              emptyMessage="No cases are currently available."
            />
          </AdminSectionCard>
        ) : null}

        {activeModule === "reports" ? (
          <AdminSectionCard title="Reports Monitor" subtitle="Monitor uploaded reports, processing state, extracted confidence, and debug handoff.">
            <AdminTable
              columns={["Report", "Patient", "Status", "Confidence", "Debug"]}
              rows={reports.map((report) => ({
                key: report.id,
                cells: [
                  <div>
                    <div className="font-semibold text-white">{report.file_name}</div>
                    <div className="text-xs text-gray-400">{report.report_type || report.report_category || "Unclassified"}</div>
                    <div className="text-xs text-gray-500">{formatDate(report.report_date || report.created_at)}</div>
                  </div>,
                  <div>
                    <div>{report.patient_name || "Patient pending"}</div>
                    <div className="text-xs text-gray-400">{report.lab_name || "Lab pending"}</div>
                    <div className="text-xs text-gray-500">{report.summary || "No summary stored"}</div>
                  </div>,
                  <div>
                    <AdminStatusBadge value={report.status} />
                    {report.latest_error ? <div className="mt-2 text-xs text-rose-300">{report.latest_error}</div> : null}
                  </div>,
                  <div>{typeof report.confidence === "number" ? report.confidence.toFixed(2) : "--"}</div>,
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyDebugEndpoint(report.debug_endpoint)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-white/10"
                    >
                      {copiedEndpoint === report.debug_endpoint ? "Copied" : "Copy Debug API"}
                    </button>
                  </div>,
                ],
              }))}
              emptyMessage="No reports have been processed yet."
            />
          </AdminSectionCard>
        ) : null}

        {activeModule === "system" ? (
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <AdminSectionCard title="System Health" subtitle="Direct system state from backend, database, AI engine, and health ping.">
              <div className="grid gap-4 md:grid-cols-2">
                <div className={`${adminTheme.insetSurface} p-5`}>
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Backend Status</div>
                  <div className="mt-3"><AdminStatusBadge value={systemStatus?.backend_status || "unknown"} /></div>
                </div>
                <div className={`${adminTheme.insetSurface} p-5`}>
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Database Connection</div>
                  <div className="mt-3"><AdminStatusBadge value={systemStatus?.database_status || "unknown"} /></div>
                </div>
                <div className={`${adminTheme.insetSurface} p-5`}>
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">AI Engine</div>
                  <div className="mt-3"><AdminStatusBadge value={systemStatus?.ai_engine_state || "unknown"} /></div>
                </div>
                <div className={`${adminTheme.insetSurface} p-5`}>
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">API Latency</div>
                  <div className="mt-3 text-3xl font-black text-white">{healthPing?.latencyMs ?? "--"} ms</div>
                </div>
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Recent Errors" subtitle="Latest surfaced pipeline and processing errors.">
              <div className="space-y-3">
                {(systemStatus?.last_errors || []).length ? (
                  systemStatus.last_errors.map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-2xl border border-rose-500/20 bg-rose-500/12 px-4 py-3 text-sm leading-6 text-rose-50">
                      {item}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/12 px-4 py-4 text-sm text-emerald-50">
                    No recent backend errors recorded.
                  </div>
                )}
              </div>
            </AdminSectionCard>
          </div>
        ) : null}

        {activeModule === "pipeline" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <AdminStatTile label="Reports in Processing" value={pipeline?.reports_in_processing ?? 0} tone="warning" icon={Workflow} />
              <AdminStatTile label="Success Logs" value={pipeline?.success_logs ?? 0} tone="healthy" icon={ShieldCheck} />
              <AdminStatTile label="Failure Logs" value={pipeline?.failure_logs ?? 0} tone={(pipeline?.failure_logs ?? 0) > 0 ? "critical" : "default"} icon={FileWarning} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <AdminSectionCard title="Recent Processing Logs" subtitle="Latest AI pipeline events across upload, OCR, normalization, and storage.">
                <AdminTable
                  columns={["Report", "Step", "Status", "Detail"]}
                  rows={(pipeline?.recent_logs || []).map((item) => ({
                    key: item.id,
                    cells: [
                      <div>
                        <div className="font-semibold text-white">{item.report_file_name || "Report"}</div>
                        <div className="text-xs text-gray-400">{formatDateTime(item.created_at)}</div>
                      </div>,
                      <div>{String(item.step).replaceAll("_", " ")}</div>,
                      <AdminStatusBadge value={item.status} />,
                      <div>{item.error_message || item.detail || "No additional details"}</div>,
                    ],
                  }))}
                  emptyMessage="No pipeline events available."
                />
              </AdminSectionCard>

              <AdminSectionCard title="Evaluation Results" subtitle="Recent extracted confidence snapshots and critical failures.">
                <div className="space-y-4">
                  {(pipeline?.evaluation_results || []).map((item) => (
                    <div key={item.report_id} className={`${adminTheme.insetSurface} px-4 py-4`}>
                      <div className="font-semibold text-white">{item.file_name}</div>
                      <div className="mt-1 text-xs text-gray-400">{formatDateTime(item.processed_at)}</div>
                      <div className="mt-3 text-sm text-cyan-100">Confidence: {typeof item.confidence === "number" ? item.confidence.toFixed(2) : "--"}</div>
                    </div>
                  ))}

                  {criticalLogs.length ? (
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/12 px-4 py-4">
                      <div className="text-[11px] font-black uppercase tracking-[0.24em] text-rose-200">Critical failures</div>
                      <div className="mt-3 space-y-2 text-sm text-rose-100">
                        {criticalLogs.slice(0, 4).map((item) => (
                          <div key={item.id}>{item.report_file_name || "Report"} · {item.error_message || item.detail}</div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </AdminSectionCard>
            </div>
          </div>
        ) : null}
      </AdminShell>

      <AdminConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.title}
        description={confirmState?.description}
        busy={busy}
        onCancel={() => setConfirmState(null)}
        onConfirm={confirmState?.kind === "doctor-toggle" ? handleDoctorToggle : handlePatientDelete}
        confirmLabel={confirmState?.kind === "patient-delete" ? "Delete Patient" : "Confirm"}
      />
    </>
  );
}
