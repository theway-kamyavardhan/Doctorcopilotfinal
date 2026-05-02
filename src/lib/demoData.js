import reviewData from "../data/demoReviewData.json";
import { getLastLoginIdentifier, setAuthRole, setAuthToken, setLastLoginIdentifier } from "../services/api";

export const DEMO_PATIENT_IDENTIFIER = "P-10005";
export const DEMO_DOCTOR_IDENTIFIER = "D-10001";

const DEMO_TOKEN_PREFIX = "demo-session";
const DEMO_PASSWORDS = {
  [DEMO_PATIENT_IDENTIFIER]: "demo2205",
  [DEMO_DOCTOR_IDENTIFIER]: "demo123",
};

function normalizeIdentifier(value) {
  return String(value || "").trim().toUpperCase();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function list(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function enumValue(value) {
  return String(value || "").toLowerCase();
}

function byId(items) {
  return new Map(list(items).map((item) => [item.id, item]));
}

function sortByNewest(left, right) {
  return new Date(right.report_date || right.created_at || 0) - new Date(left.report_date || left.created_at || 0);
}

function isAbnormalStatus(value) {
  return ["low", "high", "deficient", "insufficient", "critical", "severe", "moderate"].includes(enumValue(value));
}

function label(name) {
  return String(name || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeParameter(parameter) {
  if (!parameter || typeof parameter.value !== "number") return null;
  let value = parameter.value;
  let unit = parameter.unit || null;
  if (parameter.name === "platelets" && value < 1000) {
    value = Math.round(value * 1000);
    unit = "/µL";
  }
  if (parameter.name === "white_blood_cells" && value > 1000) {
    value = Math.round((value / 1000) * 100) / 100;
    unit = "×10³/µL";
  }
  return { ...parameter, value, unit, status: enumValue(parameter.status || parameter.interpretation || "normal") };
}

function buildSeries(reports) {
  const series = {};
  const tableByDate = new Map();

  reports
    .filter((report) => report.report_date)
    .sort((a, b) => new Date(a.report_date) - new Date(b.report_date))
    .forEach((report) => {
      const date = report.report_date;
      const row = tableByDate.get(date) || { date };
      (report.parameters || []).map(normalizeParameter).filter(Boolean).forEach((parameter) => {
        row[parameter.name] = parameter.value;
        series[parameter.name] = series[parameter.name] || [];
        if (!series[parameter.name].some((point) => point.date === date)) {
          series[parameter.name].push({
            date,
            value: parameter.value,
            unit: parameter.unit,
            status: parameter.status,
            report_id: report.id,
            report_type: report.report_type,
          });
        }
      });
      tableByDate.set(date, row);
    });

  return { series, table: Array.from(tableByDate.values()).sort((a, b) => new Date(a.date) - new Date(b.date)) };
}

function metricFor(points) {
  const first = points[0]?.value ?? 0;
  const last = points[points.length - 1]?.value ?? first;
  const delta = Math.round((last - first) * 100) / 100;
  const percentage = first ? Math.round((delta / first) * 10000) / 100 : null;
  const direction = Math.abs(delta) <= Math.max(Math.abs(first) * 0.05, 0.5) ? "stable" : delta > 0 ? "increasing" : "decreasing";
  return {
    delta,
    percentage_change: percentage,
    change: percentage == null ? null : `${percentage > 0 ? "+" : ""}${percentage}%`,
    direction,
    stability_score: points.length > 1 ? 82 : 100,
    stability: points.length > 1 ? "watchful" : "stable",
    trend: direction,
    unit: points[points.length - 1]?.unit || null,
  };
}

function buildTrends(patientId, reports) {
  const { series, table } = buildSeries(reports);
  const metrics = Object.fromEntries(Object.entries(series).map(([name, points]) => [name, metricFor(points)]));
  const summary = [];
  const anomalies = [];

  Object.entries(series).forEach(([name, points]) => {
    if (!points.length) return;
    const statuses = points.map((point) => enumValue(point.status));
    const latest = points[points.length - 1];
    const metric = metrics[name];
    if (statuses.filter(isAbnormalStatus).length >= 2 && isAbnormalStatus(latest.status)) {
      anomalies.push({
        parameter: name,
        type: `persistent_${latest.status}`,
        message: `${label(name)} consistently ${latest.status} across ${statuses.filter(isAbnormalStatus).length} reports`,
        severity: statuses.filter(isAbnormalStatus).length >= 3 ? "critical" : "warning",
      });
    }
    if (name === "vitamin_b12" && statuses.some((status) => status === "low")) {
      summary.push("Persistent Vitamin B12 deficiency across historical reports");
    } else if (name === "vitamin_d" && statuses.some((status) => ["deficient", "insufficient"].includes(status))) {
      summary.push("Vitamin D remains below the preferred range in stored history");
    } else if (metric.direction !== "stable") {
      summary.push(`${label(name)} shows a ${metric.direction} trend across stored reports`);
    } else {
      summary.push(`${label(name)} remained clinically stable`);
    }
  });

  return {
    patient_id: patientId,
    table,
    series,
    metrics,
    summary: Array.from(new Set(summary)).slice(0, 8),
    anomalies,
    reports: reports.map((report) => ({
      id: report.id,
      report_date: report.report_date,
      lab_name: report.lab_name,
      report_type: report.report_type,
      summary: report.summary,
      insights: (report.insights || []).slice(0, 2).map((item) => item.title || item.description),
      metadata: report.report_metadata || {},
    })),
    debug: {},
  };
}

function buildStore() {
  const users = byId(reviewData.users);
  const patient = list(reviewData.patients)[0];
  const doctor = list(reviewData.doctors)[0];
  const patientUser = users.get(patient.user_id);
  const doctorUser = users.get(doctor.user_id);
  const patientProfile = { ...patient, user: patientUser };
  const doctorProfile = { ...doctor, user: doctorUser };
  const reportInsights = list(reviewData.report_insights);

  const reports = list(reviewData.reports)
    .map((report) => ({
      ...report,
      status: enumValue(report.status || "processed"),
      report_category: report.report_category || "other",
      insights: reportInsights
        .filter((insight) => insight.report_id === report.id)
        .map((insight) => ({ ...insight, severity: enumValue(insight.severity || "info") })),
      parameters: list(report.parameters).map(normalizeParameter).filter(Boolean),
    }))
    .sort(sortByNewest);

  const reportsByCase = new Map();
  list(reviewData.cases).forEach((caseItem) => reportsByCase.set(caseItem.id, []));
  reports.forEach((report) => {
    if (report.case_id && reportsByCase.has(report.case_id)) {
      reportsByCase.get(report.case_id).push(report);
    }
  });

  const serializeCase = (caseItem, forDoctor = false) => {
    const isMainPatientCase = caseItem.patient_id === patient.id;
    const caseReports = isMainPatientCase ? reports : reportsByCase.get(caseItem.id) || [];
    const caseMessages = list(reviewData.messages)
      .filter((message) => message.case_id === caseItem.id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const normalizedStatus = enumValue(caseItem.status);
    const accessStatus = isMainPatientCase ? "granted" : caseItem.report_access_status || "not_requested";
    const latestMessage = caseMessages[caseMessages.length - 1];
    const patientSummary = isMainPatientCase
      ? {
          id: patient.id,
          patient_id: patient.patient_id,
          full_name: patientUser?.full_name || "Lakhan Bang",
          age: patient.age,
          gender: patient.gender,
          blood_group: patient.blood_group,
          phone_number: patient.phone_number,
        }
      : {
          id: caseItem.patient_id,
          patient_id: "P-DEMO",
          full_name: "Reviewer Demo Patient",
          age: 31,
          gender: "female",
          blood_group: "O+",
          phone_number: "",
        };

    return {
      ...caseItem,
      status: normalizedStatus,
      report_access_status: accessStatus,
      patient_name: patientSummary.full_name,
      doctor_name: doctorUser?.full_name,
      latest_message_at: latestMessage?.created_at || null,
      latest_message_preview: latestMessage?.content || null,
      report_count: caseReports.length,
      message_count: caseMessages.length,
      patient: patientSummary,
      doctor: {
        id: doctor.id,
        full_name: doctorUser?.full_name,
        license_number: doctor.license_number,
        specialization: doctor.specialization,
        hospital: doctor.hospital,
        location: doctor.location,
        phone_number: doctor.phone_number,
      },
      reports: forDoctor && accessStatus !== "granted"
        ? caseReports.map((report) => ({ ...report, summary: null, parameters: [], insights: [], raw_text: null }))
        : caseReports,
      notes: [],
    };
  };

  const cases = list(reviewData.cases).map((caseItem) => serializeCase(caseItem, false));
  const trends = buildTrends(patient.id, reports);
  const keyFindings = Array.from(
    new Set([
      ...reportInsights.map((insight) => insight.description || insight.title).filter(Boolean),
      ...reports.map((report) => report.summary).filter(Boolean),
    ]),
  ).slice(0, 10);

  return {
    users: list(reviewData.users),
    patientProfile,
    doctorProfile,
    reports,
    cases,
    messages: list(reviewData.messages).map((message) => ({ ...message, sender_type: enumValue(message.sender_type) })),
    appointments: list(reviewData.appointments).map((appointment) => ({
      ...appointment,
      status: enumValue(appointment.status),
      patient_name: patientUser?.full_name,
      doctor_name: doctorUser?.full_name,
      doctor_specialization: doctor.specialization,
    })),
    trends,
    insights: {
      patient_id: patient.id,
      trends: {},
      key_findings: keyFindings,
      risk_level: "medium",
      summary: trends.summary,
    },
    directory: [
      {
        id: doctor.id,
        full_name: doctorUser?.full_name,
        license_number: doctor.license_number,
        specialization: doctor.specialization,
        hospital: doctor.hospital,
        location: doctor.location,
      },
    ],
    serializeCase,
  };
}

let demoStore = buildStore();

export function isPatientDemoIdentifier(identifier) {
  return normalizeIdentifier(identifier) === DEMO_PATIENT_IDENTIFIER;
}

export function isDoctorDemoIdentifier(identifier) {
  return normalizeIdentifier(identifier) === DEMO_DOCTOR_IDENTIFIER;
}

export function isDemoIdentifier(identifier) {
  return isPatientDemoIdentifier(identifier) || isDoctorDemoIdentifier(identifier);
}

export function isDemoPassword(identifier, password) {
  return DEMO_PASSWORDS[normalizeIdentifier(identifier)] === password;
}

export function getActiveDemoIdentifier() {
  return normalizeIdentifier(getLastLoginIdentifier());
}

export function getActiveDemoRole() {
  const identifier = getActiveDemoIdentifier();
  if (isPatientDemoIdentifier(identifier)) return "patient";
  if (isDoctorDemoIdentifier(identifier)) return "doctor";
  return "";
}

export function isDemoSession() {
  return Boolean(getActiveDemoRole());
}

export function startDemoSession(identifier) {
  const normalized = normalizeIdentifier(identifier);
  const role = isDoctorDemoIdentifier(normalized) ? "doctor" : "patient";
  setAuthToken(`${DEMO_TOKEN_PREFIX}:${role}:${normalized}`);
  setAuthRole(role);
  setLastLoginIdentifier(normalized);
  demoStore = buildStore();
  return getDemoCurrentUser(role);
}

export function getDemoCurrentUser(role = getActiveDemoRole()) {
  if (role === "doctor") {
    return { ...clone(demoStore.doctorProfile.user), role: "doctor" };
  }
  return { ...clone(demoStore.patientProfile.user), role: "patient" };
}

export function getPatientDemoDashboardSeed() {
  return isPatientDemoIdentifier(getActiveDemoIdentifier())
    ? {
        profile: clone(demoStore.patientProfile),
        reports: clone(demoStore.reports),
        trends: clone(demoStore.trends),
        insights: clone(demoStore.insights),
        cases: clone(demoStore.cases.filter((item) => item.patient_id === demoStore.patientProfile.id)),
        appointments: clone(demoStore.appointments.filter((item) => item.patient_id === demoStore.patientProfile.id)),
      }
    : null;
}

export function getDoctorDemoDashboardSeed() {
  return isDoctorDemoIdentifier(getActiveDemoIdentifier())
    ? {
        profile: clone(demoStore.doctorProfile),
        dashboard: getDemoDoctorDashboard(),
        cases: clone(getDemoDoctorCases()),
        appointments: clone(getDemoDoctorAppointments()),
      }
    : null;
}

export function getDemoPatientProfile() {
  return clone(demoStore.patientProfile);
}

export function getDemoDoctorProfile() {
  return clone(demoStore.doctorProfile);
}

export function getDemoReports() {
  return clone(demoStore.reports);
}

export function getDemoReport(reportId) {
  return clone(demoStore.reports.find((report) => String(report.id) === String(reportId)));
}

export function getDemoTrends() {
  return clone(demoStore.trends);
}

export function getDemoInsights() {
  return clone(demoStore.insights);
}

export function getDemoCases() {
  const role = getActiveDemoRole();
  const cases = role === "doctor" ? getDemoDoctorCases() : demoStore.cases.filter((item) => item.patient_id === demoStore.patientProfile.id);
  return clone(cases);
}

export function getDemoCase(caseId) {
  const found = demoStore.cases.find((item) => String(item.id) === String(caseId));
  return clone(found);
}

export function getDemoCaseMessages(caseId) {
  return clone(demoStore.messages.filter((message) => String(message.case_id) === String(caseId)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
}

export function addDemoCaseMessage(caseId, content) {
  const role = getActiveDemoRole();
  const sender = role === "doctor" ? demoStore.doctorProfile.user_id : demoStore.patientProfile.user_id;
  const message = {
    id: `demo-message-${Date.now()}`,
    case_id: caseId,
    sender_user_id: sender,
    sender_type: role,
    content,
    message_type: "text",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  demoStore.messages.push(message);
  return clone(message);
}

export function getDemoPatientAppointments() {
  return clone(demoStore.appointments.filter((item) => item.patient_id === demoStore.patientProfile.id));
}

export function getDemoDoctorAppointments() {
  return clone(demoStore.appointments.filter((item) => item.doctor_id === demoStore.doctorProfile.id));
}

export function getDemoDoctorDashboard() {
  const doctorCases = getDemoDoctorCases();
  return {
    total_cases: doctorCases.length,
    pending_cases: doctorCases.filter((item) => item.status === "pending").length,
    open_cases: doctorCases.filter((item) => item.status === "open").length,
    in_review_cases: doctorCases.filter((item) => item.status === "in_review").length,
    closed_cases: doctorCases.filter((item) => item.status === "closed").length,
    recent_report_count: demoStore.reports.length,
  };
}

export function getDemoDoctorCases() {
  return demoStore.cases.filter((item) => item.doctor_id === demoStore.doctorProfile.id);
}

export function updateDemoCaseStatus(caseId, status) {
  const found = demoStore.cases.find((item) => String(item.id) === String(caseId));
  if (found) {
    found.status = enumValue(status);
    found.doctor_id = demoStore.doctorProfile.id;
  }
  return clone(found);
}

export function updateDemoReportAccess(caseId, status = "requested") {
  const found = demoStore.cases.find((item) => String(item.id) === String(caseId));
  if (found) {
    found.report_access_status = status;
    found.report_access_requested_at = new Date().toISOString();
    found.report_access_updated_at = found.report_access_requested_at;
  }
  return clone(found);
}

export function getDemoDoctorDirectory() {
  return clone(demoStore.directory);
}

export function searchDemoPatients(query = "") {
  const normalized = String(query || "").toLowerCase();
  const patient = {
    id: demoStore.patientProfile.id,
    patient_id: demoStore.patientProfile.patient_id,
    full_name: demoStore.patientProfile.user?.full_name,
    age: demoStore.patientProfile.age,
    gender: demoStore.patientProfile.gender,
    blood_group: demoStore.patientProfile.blood_group,
  };
  if (!normalized) return [patient];
  return [patient].filter((item) => JSON.stringify(item).toLowerCase().includes(normalized));
}

export async function getDemoReportFile(reportId) {
  const report = demoStore.reports.find((item) => String(item.id) === String(reportId));
  if (!report?.static_file_url) {
    throw new Error("Demo report file was not found.");
  }
  const response = await fetch(report.static_file_url);
  if (!response.ok) {
    throw new Error("Demo report file could not be loaded.");
  }
  return {
    blob: await response.blob(),
    headers: {
      "content-type": response.headers.get("content-type") || report.mime_type || "application/pdf",
      "content-disposition": `attachment; filename=\"${report.file_name || "demo-report.pdf"}\"`,
    },
  };
}

export function getDemoAiAccessStatus() {
  return {
    ai_enabled: false,
    demo_mode: true,
    session_key_present: false,
    message: "Static reviewer demo mode is active.",
  };
}
