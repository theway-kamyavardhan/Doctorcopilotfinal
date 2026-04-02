import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, Eraser, LogOut, MoonStar, Save, ShieldCheck, SunMedium } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { authService } from "../../services/auth.service";

const NOTIFICATION_STORAGE_KEY = "doctor-copilot-notifications-enabled";

function buildProfileForm(profile) {
  return {
    full_name: profile?.user?.full_name || "",
    age: profile?.age ?? "",
    gender: profile?.gender || "",
    blood_group: profile?.blood_group || "",
    phone_number: profile?.phone_number || "",
    medical_history: profile?.medical_history || "",
  };
}

function SettingsCard({ title, subtitle, isDark, children }) {
  return (
    <section
      className={`rounded-[2rem] border p-6 ${
        isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/50"
      }`}
    >
      <div className="mb-5">
        <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{title}</h2>
        {subtitle ? (
          <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, isDark, children }) {
  return (
    <label className="space-y-2">
      <div className={`text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        {label}
      </div>
      {children}
    </label>
  );
}

export default function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(buildProfileForm(null));
  const [passwordForm, setPasswordForm] = useState({ old_password: "", new_password: "" });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const storedNotifications = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (storedNotifications !== null) {
      setNotificationsEnabled(storedNotifications === "true");
    }

    const loadProfile = async () => {
      try {
        const profileData = await authService.getPatientProfile();
        setProfile(profileData);
        setProfileForm(buildProfileForm(profileData));
      } catch (loadError) {
        setError(loadError.message || "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const themeLabel = useMemo(() => (isDark ? "Dark" : "Light"), [isDark]);

  const updateProfileField = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setError("");
    setMessage("");
    try {
      const updatedProfile = await authService.updatePatientProfile({
        full_name: profileForm.full_name.trim(),
        age: profileForm.age === "" ? null : Number(profileForm.age),
        gender: profileForm.gender || null,
        blood_group: profileForm.blood_group || null,
        phone_number: profileForm.phone_number.trim() || null,
        medical_history: profileForm.medical_history.trim() || null,
      });
      setProfile(updatedProfile);
      setProfileForm(buildProfileForm(updatedProfile));
      setMessage("Profile updated successfully.");
    } catch (saveError) {
      setError(saveError.message || "Failed to save profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    setPasswordSaving(true);
    setError("");
    setMessage("");
    try {
      await authService.changePatientPassword(passwordForm);
      setPasswordForm({ old_password: "", new_password: "" });
      setMessage("Password changed successfully.");
    } catch (saveError) {
      setError(saveError.message || "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleNotificationToggle = () => {
    const nextValue = !notificationsEnabled;
    setNotificationsEnabled(nextValue);
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, String(nextValue));
    setMessage("Preferences updated.");
  };

  const handleThemeChange = (nextTheme) => {
    if ((nextTheme === "dark" && !isDark) || (nextTheme === "light" && isDark)) {
      toggleTheme();
      setMessage("Theme updated.");
    }
  };

  const handleClearAllData = async () => {
    if (clearConfirmation.trim().toLowerCase() !== "clear") return;
    setClearingData(true);
    setError("");
    setMessage("");
    try {
      await authService.clearPatientData();
      setClearConfirmation("");
      setMessage("All patient reports, cases, appointments, and derived data were cleared. Your account profile is still active.");
    } catch (clearError) {
      setError(clearError.message || "Failed to clear patient data.");
    } finally {
      setClearingData(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-0">
        <div className={`rounded-[2rem] border p-8 ${isDark ? "bg-slate-900 border-white/10 text-slate-400" : "bg-white border-slate-100 text-slate-500"}`}>
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 md:px-0">
      <section>
        <h1 className={`text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Patient Settings</h1>
        <p className={`mt-2 text-lg ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Manage your profile, security, and workspace preferences.
        </p>
      </section>

      {message ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </div>
      ) : null}
      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <SettingsCard title="Profile" subtitle="Keep your patient identity and contact information current." isDark={isDark}>
          <form onSubmit={handleProfileSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Name" isDark={isDark}>
                <input value={profileForm.full_name} onChange={(event) => updateProfileField("full_name", event.target.value)} className={`w-full rounded-2xl border px-4 py-3 outline-none ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
              </Field>
              <Field label="Age" isDark={isDark}>
                <input type="number" min="0" max="120" value={profileForm.age} onChange={(event) => updateProfileField("age", event.target.value)} className={`w-full rounded-2xl border px-4 py-3 outline-none ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
              </Field>
              <Field label="Gender" isDark={isDark}>
                <select value={profileForm.gender} onChange={(event) => updateProfileField("gender", event.target.value)} className={`w-full rounded-2xl border px-4 py-3 outline-none ${isDark ? "bg-white/5 border-white/10 text-white [&>option]:bg-slate-900" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Blood Group" isDark={isDark}>
                <select value={profileForm.blood_group} onChange={(event) => updateProfileField("blood_group", event.target.value)} className={`w-full rounded-2xl border px-4 py-3 outline-none ${isDark ? "bg-white/5 border-white/10 text-white [&>option]:bg-slate-900" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
                  <option value="">Select blood group</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </Field>
              <Field label="Phone" isDark={isDark}>
                <input value={profileForm.phone_number} onChange={(event) => updateProfileField("phone_number", event.target.value)} className={`w-full rounded-2xl border px-4 py-3 outline-none ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
              </Field>
              <Field label="Patient ID" isDark={isDark}>
                <div className={`rounded-2xl border px-4 py-3 font-semibold ${isDark ? "bg-white/5 border-white/10 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                  {profile?.patient_id || "Not assigned"}
                </div>
              </Field>
            </div>

            <Field label="Medical History" isDark={isDark}>
              <textarea rows={4} value={profileForm.medical_history} onChange={(event) => updateProfileField("medical_history", event.target.value)} className={`w-full rounded-2xl border px-4 py-3 outline-none ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
            </Field>

            <button type="submit" disabled={profileSaving} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500 transition-colors disabled:opacity-50">
              <Save size={16} />
              {profileSaving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </SettingsCard>

        <div className="space-y-6">
          <SettingsCard title="Security" subtitle="Update your password with current-password verification." isDark={isDark}>
            <form onSubmit={handlePasswordSave} className="space-y-4">
              <Field label="Current Password" isDark={isDark}>
                <input type="password" value={passwordForm.old_password} onChange={(event) => setPasswordForm((current) => ({ ...current, old_password: event.target.value }))} className={`w-full rounded-2xl border px-4 py-3 outline-none ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
              </Field>
              <Field label="New Password" isDark={isDark}>
                <input type="password" value={passwordForm.new_password} onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))} className={`w-full rounded-2xl border px-4 py-3 outline-none ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
              </Field>

              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={passwordSaving} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50">
                  <ShieldCheck size={16} />
                  {passwordSaving ? "Updating..." : "Change Password"}
                </button>
                <button type="button" onClick={() => { authService.logout(); navigate("/login", { replace: true }); }} className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-bold ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                  <LogOut size={16} />
                  Logout Current Device
                </button>
              </div>
            </form>
          </SettingsCard>

          <SettingsCard title="Preferences" subtitle="Control local workspace behavior for this device." isDark={isDark}>
            <div className="space-y-5">
              <div className={`flex items-center justify-between rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <div className="flex items-center gap-3">
                  <Bell size={18} className={isDark ? "text-amber-300" : "text-amber-600"} />
                  <div>
                    <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Notifications</div>
                    <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Receive updates when reports and consultations change.</div>
                  </div>
                </div>
                <button type="button" onClick={handleNotificationToggle} className={`h-8 w-14 rounded-full transition-colors ${notificationsEnabled ? "bg-emerald-500" : isDark ? "bg-white/10" : "bg-slate-300"}`}>
                  <span className={`block h-6 w-6 rounded-full bg-white transition-transform ${notificationsEnabled ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>

              <div className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Theme</div>
                <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Current theme: {themeLabel}</div>
                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => handleThemeChange("light")} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-bold ${!isDark ? "bg-blue-600 text-white" : isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700"}`}>
                    <SunMedium size={16} />
                    Light
                  </button>
                  <button type="button" onClick={() => handleThemeChange("dark")} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-bold ${isDark ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                    <MoonStar size={16} />
                    Dark
                  </button>
                </div>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Data Control" subtitle="Remove your stored medical data while keeping your patient account active." isDark={isDark}>
            <div className={`rounded-2xl px-4 py-4 ${isDark ? "bg-rose-500/10 text-rose-100" : "bg-rose-50 text-rose-700"}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <div className="text-sm leading-6">
                  This clears all your uploaded reports, generated insights, trends, consultations, chats, and appointments. Your login and profile stay active.
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Confirmation" isDark={isDark}>
                <input
                  value={clearConfirmation}
                  onChange={(event) => setClearConfirmation(event.target.value)}
                  placeholder='Type "clear" to remove all data'
                  className={`w-full rounded-2xl border px-4 py-3 outline-none ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                />
              </Field>

              <button
                type="button"
                onClick={handleClearAllData}
                disabled={clearingData || clearConfirmation.trim().toLowerCase() !== "clear"}
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 font-bold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
              >
                <Eraser size={16} />
                {clearingData ? "Clearing..." : "Clear All Patient Data"}
              </button>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
