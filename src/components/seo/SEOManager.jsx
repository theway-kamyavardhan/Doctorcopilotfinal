import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://doctorcopilot.app";
const SITE_NAME = "DoctorCopilot";
const DEFAULT_DESCRIPTION =
  "DoctorCopilot turns medical reports into patient-friendly health timelines, trend intelligence, and doctor review workflows.";

const routeMeta = {
  "/": {
    title: "DoctorCopilot | Medical Report AI, Health Trends & Doctor Review",
    description: DEFAULT_DESCRIPTION,
    keywords:
      "DoctorCopilot, doctor copilot, medical report AI, health report analysis, patient health timeline, doctor review software, AI medical reports",
  },
  "/login": {
    title: "Login | DoctorCopilot",
    description: "Sign in to the DoctorCopilot patient or doctor demo workspace.",
    robots: "noindex, nofollow",
  },
  "/privacy": {
    title: "Privacy & Medical Data Handling | DoctorCopilot",
    description:
      "How DoctorCopilot approaches sensitive medical data, demo data handling, privacy controls, and production readiness.",
  },
  "/terms": {
    title: "Responsible Use Terms | DoctorCopilot",
    description:
      "DoctorCopilot demo terms, responsible AI boundaries, and medical decision support limitations.",
  },
  "/support": {
    title: "Support & Demo Help | DoctorCopilot",
    description:
      "Support guidance for reviewing the DoctorCopilot patient and doctor demo workflow.",
  },
  "/hipaa-readiness": {
    title: "HIPAA-Ready Architecture Roadmap | DoctorCopilot",
    description:
      "DoctorCopilot's HIPAA-aware roadmap covering encryption, audit logs, consent, BAAs, retention, and future compliance work.",
  },
};

function setMeta(selector, attributes) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    document.head.appendChild(tag);
  }
  Object.entries(attributes).forEach(([key, value]) => tag.setAttribute(key, value));
}

function setLink(rel, href) {
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

function setJsonLd(id, data) {
  let tag = document.getElementById(id);
  if (!tag) {
    tag = document.createElement("script");
    tag.id = id;
    tag.type = "application/ld+json";
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(data);
}

export default function SEOManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = pathname.replace(/\/$/, "") || "/";
    const meta = routeMeta[normalizedPath] || {
      title: `${SITE_NAME} | Medical Report Intelligence`,
      description: DEFAULT_DESCRIPTION,
      robots: normalizedPath.startsWith("/patient") || normalizedPath.startsWith("/doctor") || normalizedPath.startsWith("/admin")
        ? "noindex, nofollow"
        : "index, follow",
    };
    const canonical = `${SITE_URL}${normalizedPath === "/" ? "/" : normalizedPath}`;
    const robots = meta.robots || "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

    document.title = meta.title;
    setMeta('meta[name="description"]', { name: "description", content: meta.description });
    setMeta('meta[name="keywords"]', {
      name: "keywords",
      content:
        meta.keywords ||
        "DoctorCopilot, medical report AI, health trends, patient timeline, clinical intelligence, doctor review",
    });
    setMeta('meta[name="robots"]', { name: "robots", content: robots });
    setMeta('meta[name="googlebot"]', { name: "googlebot", content: robots });
    setLink("canonical", canonical);

    setMeta('meta[property="og:title"]', { property: "og:title", content: meta.title });
    setMeta('meta[property="og:description"]', { property: "og:description", content: meta.description });
    setMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    setMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    setMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });
    setMeta('meta[property="og:image"]', { property: "og:image", content: `${SITE_URL}/icons/icon-512.png` });
    setMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: "DoctorCopilot medical AI app icon" });

    setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: meta.title });
    setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: meta.description });
    setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: `${SITE_URL}/icons/icon-512.png` });

    setJsonLd("doctorcopilot-software-jsonld", {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web, iOS, Android",
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      featureList: [
        "Medical report intelligence",
        "Patient health timeline",
        "Health trend analysis",
        "Doctor review workflow",
        "HIPAA-aware architecture roadmap",
      ],
    });

    setJsonLd("doctorcopilot-organization-jsonld", {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512.png`,
      sameAs: ["https://github.com/theway-kamyavardhan/Doctorcopilotfinal"],
    });
  }, [pathname]);

  return null;
}
