import { useEffect, useState } from "react";
import { getPatientInsights, getPatientTrendOverview } from "../../../services/doctor.service";

const CACHE_PREFIX = "doctor-patient-insights-bundle-v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCacheKey(patientId) {
  return `${CACHE_PREFIX}:${patientId}`;
}

function readBundleCache(patientId) {
  if (!patientId) return null;
  try {
    const raw = sessionStorage.getItem(getCacheKey(patientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(getCacheKey(patientId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeBundleCache(patientId, payload) {
  if (!patientId) return;
  try {
    sessionStorage.setItem(
      getCacheKey(patientId),
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      })
    );
  } catch {
    // Ignore storage failures.
  }
}

export default function usePatientInsightsBundle(patientId) {
  const cached = readBundleCache(patientId);
  const [trends, setTrends] = useState(cached?.trends || null);
  const [insights, setInsights] = useState(cached?.insights || null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!patientId) {
      setTrends(null);
      setInsights(null);
      setLoading(false);
      setError("");
      return () => {
        cancelled = true;
      };
    }

    const warm = readBundleCache(patientId);
    if (warm) {
      setTrends(warm.trends || null);
      setInsights(warm.insights || null);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchBundle = async () => {
      try {
        const [trendData, insightData] = await Promise.all([
          getPatientTrendOverview(patientId),
          getPatientInsights(patientId),
        ]);
        if (cancelled) return;
        setTrends(trendData);
        setInsights(insightData);
        setError("");
        setLoading(false);
        writeBundleCache(patientId, { trends: trendData, insights: insightData });
      } catch (bundleError) {
        if (cancelled) return;
        setError(bundleError.message || "Failed to load patient insights.");
        setLoading(false);
      }
    };

    fetchBundle();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  return { trends, insights, loading, error };
}
