import useSWR from "swr";
import CACHE_KEYS from "../lib/cacheKeys";
import reportService from "../services/report.service";

async function fetchPatientTrendsData() {
  const [trends, insightResult] = await Promise.all([
    reportService.getTrends(),
    reportService.getInsights().catch(() => null),
  ]);

  return {
    trends,
    insights: insightResult,
  };
}

export default function usePatientTrendsData() {
  return useSWR(CACHE_KEYS.patientTrends, fetchPatientTrendsData, {
    dedupingInterval: 5 * 60_000,
  });
}
