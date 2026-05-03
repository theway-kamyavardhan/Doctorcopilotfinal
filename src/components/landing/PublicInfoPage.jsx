import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, LifeBuoy, LockKeyhole, ShieldCheck } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const pageContent = {
  privacy: {
    eyebrow: "Privacy",
    title: "Privacy & Medical Data Handling",
    intro:
      "DoctorCopilot is designed to treat health information as sensitive by default. Demo accounts use seeded review data; production use would require formal privacy, security, and vendor agreements before handling real patient data.",
    icon: LockKeyhole,
    sections: [
      {
        title: "What We Protect",
        items: [
          "Uploaded medical reports, extracted parameters, AI summaries, patient profile data, doctor notes, chats, and appointment context.",
          "Access to patient and doctor workspaces is role-based, with demo accounts separated from real operational accounts.",
          "Demo reports are intentionally locked so reviewers can explore the journey without damaging the prepared data.",
        ],
      },
      {
        title: "Production Direction",
        items: [
          "Encrypt protected data in transit and at rest, including report files and generated clinical summaries.",
          "Add audit logs for report views, downloads, updates, deletion attempts, and doctor access decisions.",
          "Define retention, export, deletion, consent, and breach-response workflows before live clinical use.",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Terms",
    title: "Demo Terms & Responsible Use",
    intro:
      "This project is a clinical intelligence demo. It organizes reports and highlights trends, but it does not replace a licensed clinician, diagnostic process, or emergency medical care.",
    icon: ShieldCheck,
    sections: [
      {
        title: "Demo Boundaries",
        items: [
          "AI output is for review and workflow demonstration only, not a medical diagnosis.",
          "Any clinical decision should be made by qualified professionals using original reports, examination, and local medical standards.",
          "The demo uses prepared accounts and sample reports so the product story remains stable and repeatable.",
        ],
      },
      {
        title: "Future Product Use",
        items: [
          "Live deployments should require verified users, consent, permissions, and organization-level policies.",
          "Medical integrations should be validated with clinicians and checked against local regulatory requirements.",
          "High-risk actions should remain human-reviewed and traceable to source evidence.",
        ],
      },
    ],
  },
  support: {
    eyebrow: "Support",
    title: "Support & Demo Help",
    intro:
      "Use this demo path when presenting DoctorCopilot: patient dashboard, reports, trends, doctor queue, patient context, and report viewer.",
    icon: LifeBuoy,
    sections: [
      {
        title: "Recommended Demo Flow",
        items: [
          "Start with the patient demo account and show dashboard context, reports, and trend intelligence.",
          "Switch to the doctor demo account and show consultation triage, patient context, and report review.",
          "Explain that real-time AI upload exists as a workflow, while the public demo uses locked seeded data for safety.",
        ],
      },
      {
        title: "If Something Looks Stale",
        items: [
          "Close and reopen the phone browser or installed PWA after a new deployment so the service worker picks up the latest build.",
          "Use the browser refresh once if the old cached shell appears.",
          "Keep demo data locked during reviews to preserve the prepared walkthrough.",
        ],
      },
    ],
  },
  hipaa: {
    eyebrow: "HIPAA Readiness",
    title: "How DoctorCopilot Approaches HIPAA-Ready Design",
    intro:
      "DoctorCopilot should be presented as HIPAA-aware or HIPAA-ready in architecture direction, not as HIPAA compliant until legal review, policies, audits, and vendor agreements are complete.",
    icon: ShieldCheck,
    sections: [
      {
        title: "Controls Needed For Real PHI",
        items: [
          "Business Associate Agreements with hosting, storage, AI, email, monitoring, and analytics vendors that touch protected health information.",
          "Role-based access, least-privilege permissions, audit trails, session controls, encryption, backups, and incident response procedures.",
          "Patient consent, privacy notices, retention policies, data export, deletion workflows, and staff training.",
        ],
      },
      {
        title: "Future Implications",
        items: [
          "The product can evolve into a patient-owned health timeline that supports second opinions and longitudinal care.",
          "Doctors can use structured report history to review context faster, but AI should remain assistive and source-linked.",
          "For India and global markets, future compliance work should map HIPAA-style safeguards to local health-data and privacy rules.",
        ],
      },
    ],
  },
};

export default function PublicInfoPage({ type }) {
  const { isDark } = useTheme();
  const content = pageContent[type] || pageContent.privacy;
  const Icon = content.icon;

  return (
    <main className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden px-4 py-5 sm:px-6 md:py-8 ${isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-950"}`}>
      <div className="mx-auto w-[calc(100vw-2rem)] max-w-5xl overflow-hidden sm:w-full">
        <Link
          to="/"
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${isDark ? "bg-white/[0.06] text-cyan-300" : "bg-white text-blue-700 shadow-sm"}`}
        >
          <ArrowLeft size={16} />
          Back to DoctorCopilot
        </Link>

        <section
          className={`mt-5 w-full max-w-full overflow-hidden rounded-[1.5rem] border p-5 shadow-sm md:rounded-[2rem] md:p-8 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-white/70 bg-white"}`}
          style={{ maxWidth: "calc(100vw - 2rem)" }}
        >
          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? "bg-cyan-500/10 text-cyan-300" : "bg-blue-100 text-blue-700"}`}>
            <Icon size={22} />
          </div>
          <div className={`mt-5 text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-cyan-300" : "text-blue-700"}`}>
            {content.eyebrow}
          </div>
          <h1 className="mt-3 max-w-full break-words text-3xl font-black leading-tight tracking-normal md:text-5xl">
            {content.title}
          </h1>
          <p className={`mt-4 max-w-full break-words text-base font-semibold leading-7 md:text-lg ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {content.intro}
          </p>
        </section>

        <div className="mt-5 grid gap-4 md:grid-cols-2" style={{ maxWidth: "calc(100vw - 2rem)" }}>
          {content.sections.map((section) => (
            <section
              key={section.title}
              className={`w-full max-w-full overflow-hidden rounded-[1.35rem] border p-5 md:p-6 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-white/70 bg-white shadow-sm"}`}
              style={{ maxWidth: "calc(100vw - 2rem)" }}
            >
              <h2 className="text-xl font-black tracking-normal">{section.title}</h2>
              <div className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 size={17} className={`mt-0.5 shrink-0 ${isDark ? "text-cyan-300" : "text-blue-600"}`} />
                    <p className={`min-w-0 break-words text-sm font-semibold leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className={`mt-5 rounded-[1.35rem] border p-5 text-sm font-semibold leading-7 ${isDark ? "border-amber-400/20 bg-amber-500/10 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          This page is product documentation for a demo and does not replace legal, compliance, or clinical review.
        </section>
      </div>
    </main>
  );
}
