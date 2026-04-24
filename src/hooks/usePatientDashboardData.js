import useSWR from "swr";
import appointmentService from "../services/appointment.service";
import authService from "../services/auth.service";
import caseService from "../services/case.service";
import reportService from "../services/report.service";
import CACHE_KEYS from "../lib/cacheKeys";
import { getPatientDemoDashboardSeed } from "../lib/demoData";

async function fetchPatientDashboardData() {
  const [profile, reports, trends] = await Promise.all([
    authService.getPatientProfile(),
    reportService.getReports(),
    reportService.getTrends(),
  ]);

  const [insightResult, caseResult, appointmentResult] = await Promise.allSettled([
    reportService.getInsights(),
    caseService.getCases(),
    appointmentService.getPatientAppointments(),
  ]);

  return {
    profile,
    reports: reports || [],
    trends: trends || null,
    insights: insightResult.status === "fulfilled" ? insightResult.value : null,
    cases: caseResult.status === "fulfilled" ? caseResult.value || [] : [],
    appointments: appointmentResult.status === "fulfilled" ? appointmentResult.value || [] : [],
  };
}

export default function usePatientDashboardData() {
  const demoFallback = getPatientDemoDashboardSeed();

  return useSWR(CACHE_KEYS.patientDashboard, fetchPatientDashboardData, {
    dedupingInterval: 5 * 60_000,
    fallbackData: demoFallback || undefined,
  });
}
