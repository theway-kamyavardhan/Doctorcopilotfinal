import React, { useEffect, useState } from "react";
import { LoaderCircle, Save, Settings2, ShieldCheck } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { authService } from "../../services/auth.service";
import { getDoctorProfile, updateDoctorProfile } from "../../services/doctor.service";

function Field({ label, value, onChange, isDark, textarea = false, disabled = false, placeholder = "", type = "text" }) {
  const shared = `mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
    isDark
      ? "border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
  } ${disabled ? "opacity-70" : ""}`;

  return (
    <div>
      <label className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={onChange}
          rows={5}
          disabled={disabled}
          placeholder={placeholder}
          className={shared}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={shared}
        />
      )}
    </div>
  );
}

export default function DoctorSettings() {
  const { isDark } = useTheme();
  const [form, setForm] = useState({
    full_name: "",
    specialization: "",
    hospital: "",
    location: "",
    phone_number: "",
    bio: "",
    license_number: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getDoctorProfile();
        setForm({
          full_name: profile?.user?.full_name || "",
          specialization: profile?.specialization || "",
          hospital: profile?.hospital || "",
          location: profile?.location || "",
          phone_number: profile?.phone_number || "",
          bio: profile?.bio || "",
          license_number: profile?.license_number || "",
          email: profile?.user?.email || "",
        });
      } catch (loadError) {
        setError(loadError.message || "Failed to load doctor settings.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updatePasswordField = (field) => (event) => {
    setPasswordForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateDoctorProfile({
        full_name: form.full_name,
        specialization: form.specialization,
        hospital: form.hospital,
        location: form.location,
        phone_number: form.phone_number,
        bio: form.bio,
      });
      setSuccess("Doctor profile updated successfully.");
    } catch (saveError) {
      setError(saveError.message || "Failed to save doctor settings.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    setPasswordSaving(true);
    setError("");
    setSuccess("");
    try {
      await authService.changeDoctorPassword(passwordForm);
      setPasswordForm({ old_password: "", new_password: "" });
      setSuccess("Password changed successfully.");
    } catch (saveError) {
      setError(saveError.message || "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${isDark ? "text-cyan-200/75" : "text-blue-700/75"}`}>
          Settings
        </div>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">Doctor Settings</h2>
        <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Update your visible profile, clinic context, and account security from one place.
        </p>
      </div>

      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}

      {success ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleProfileSave} className={`rounded-[1.8rem] border p-6 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
          <div className="flex items-center gap-3">
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? "bg-cyan-400/10 text-cyan-300" : "bg-blue-100 text-blue-700"}`}>
              <Settings2 size={20} />
            </div>
            <div>
              <div className="text-lg font-black">Profile Settings</div>
              <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                These details appear across consultations, referrals, and appointments.
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Full Name" value={form.full_name} onChange={updateField("full_name")} isDark={isDark} />
            <Field label="Specialization" value={form.specialization} onChange={updateField("specialization")} isDark={isDark} />
            <Field label="Hospital" value={form.hospital} onChange={updateField("hospital")} isDark={isDark} />
            <Field label="Location" value={form.location} onChange={updateField("location")} isDark={isDark} />
            <Field label="Phone Number" value={form.phone_number} onChange={updateField("phone_number")} isDark={isDark} />
            <Field label="Email" value={form.email} onChange={() => {}} isDark={isDark} disabled />
          </div>

          <div className="mt-4">
            <Field
              label="Professional Bio"
              value={form.bio}
              onChange={updateField("bio")}
              isDark={isDark}
              textarea
              placeholder="Share a short consultation-facing bio or note about your expertise."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <section className={`rounded-[1.8rem] border p-6 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
          <div className="flex items-center gap-3">
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-lg font-black">Account Identity</div>
              <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Read-only identifiers tied to your licensed doctor account.
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <Field label="Doctor ID / License" value={form.license_number} onChange={() => {}} isDark={isDark} disabled />
            <Field label="Primary Email" value={form.email} onChange={() => {}} isDark={isDark} disabled />
            <div className={`rounded-2xl px-4 py-4 text-sm leading-7 ${isDark ? "bg-white/5 text-slate-300" : "bg-white text-slate-600"}`}>
              Identity values are controlled by the secure doctor account system. Use the security panel below to change your password.
            </div>
          </div>
        </section>

        <form onSubmit={handlePasswordSave} className={`rounded-[1.8rem] border p-6 xl:col-span-2 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
          <div className="flex items-center gap-3">
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-lg font-black">Security</div>
              <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Change your doctor account password using current-password verification.
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field
              label="Current Password"
              type="password"
              value={passwordForm.old_password}
              onChange={updatePasswordField("old_password")}
              isDark={isDark}
            />
            <Field
              label="New Password"
              type="password"
              value={passwordForm.new_password}
              onChange={updatePasswordField("new_password")}
              isDark={isDark}
            />
          </div>

          <button
            type="submit"
            disabled={passwordSaving}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
          >
            {passwordSaving ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {passwordSaving ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
