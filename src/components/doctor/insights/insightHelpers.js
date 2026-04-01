import { formatParameterLabel } from "../../../utils/patientIntelligence";

export const PARAMETER_META = {
  hemoglobin: { label: "Hemoglobin", color: "#38bdf8" },
  platelets: { label: "Platelets", color: "#14b8a6" },
  vitamin_b12: { label: "Vitamin B12", color: "#f59e0b" },
  vitamin_d: { label: "Vitamin D", color: "#a855f7" },
  white_blood_cells: { label: "WBC", color: "#ef4444" },
  red_blood_cells: { label: "RBC", color: "#22c55e" },
};

export const DEFAULT_PARAMETERS = [
  "hemoglobin",
  "platelets",
  "vitamin_b12",
  "vitamin_d",
  "white_blood_cells",
  "red_blood_cells",
];

function sanitizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function titleize(value) {
  return formatParameterLabel(String(value || "").replaceAll("__", "_"));
}

function getMetricStatus(metric = {}) {
  const trend = String(metric.trend || "").toLowerCase();
  const stability = String(metric.stability || "").toLowerCase();
  if (trend.includes("wors") || trend.includes("declin")) return "warning";
  if (stability === "volatile") return "warning";
  if (trend.includes("improv")) return "improving";
  return "stable";
}

function inferPointStatus(point = {}, metric = {}) {
  const direct = String(point.status || "").toLowerCase();
  if (direct) return direct;
  const trend = String(metric.trend || "").toLowerCase();
  if (trend.includes("low")) return "low";
  if (trend.includes("high")) return "high";
  if (trend.includes("deficien")) return "deficient";
  return "normal";
}

export function getParameterMeta(name) {
  return PARAMETER_META[name] || { label: titleize(name), color: "#60a5fa" };
}

export function getAvailableParameters(trends) {
  const names = Object.keys(trends?.series || {});
  const ordered = DEFAULT_PARAMETERS.filter((name) => names.includes(name));
  const remaining = names.filter((name) => !ordered.includes(name));
  return [...ordered, ...remaining];
}

export function getChartParameters(trends) {
  return getAvailableParameters(trends);
}

export function buildTrendChartData(trends, selectedParameters = []) {
  const chartMap = new Map();

  selectedParameters.forEach((parameter) => {
    (trends?.series?.[parameter] || []).forEach((point) => {
      if (!chartMap.has(point.date)) {
        chartMap.set(point.date, { date: point.date, label: formatChartDate(point.date) });
      }

      const metric = trends?.metrics?.[parameter] || {};
      const current = chartMap.get(point.date);
      current[parameter] = sanitizeNumber(point.value);
      current[`${parameter}Status`] = inferPointStatus(point, metric);
      current[`${parameter}Unit`] = point.unit || metric.unit || "";
    });
  });

  return Array.from(chartMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function formatChartDate(dateString) {
  if (!dateString) return "Unknown";
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return dateString;
  return value.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

export function getLatestPoint(points = []) {
  return [...points].sort((a, b) => new Date(a.date) - new Date(b.date)).at(-1) || null;
}

export function getLatestParameterCards(trends) {
  return getAvailableParameters(trends)
    .map((parameter) => {
      const points = trends?.series?.[parameter] || [];
      const latest = getLatestPoint(points);
      if (!latest) return null;

      const meta = getParameterMeta(parameter);
      const metric = trends?.metrics?.[parameter] || {};
      const value = sanitizeNumber(latest.value);

      return {
        key: parameter,
        label: meta.label,
        color: meta.color,
        latestValue: value,
        latestUnit: latest.unit || metric.unit || "",
        latestStatus: inferPointStatus(latest, metric),
        direction: metric.direction || "stable",
        change: metric.change || null,
        trend: metric.trend || "stable",
        stability: metric.stability || "stable",
      };
    })
    .filter(Boolean);
}

export function buildTrendInsightRows(trends) {
  return getAvailableParameters(trends)
    .map((parameter) => {
      const metric = trends?.metrics?.[parameter];
      const points = trends?.series?.[parameter] || [];
      if (!metric) return null;
      const meta = getParameterMeta(parameter);
      return {
        key: parameter,
        label: meta.label,
        color: meta.color,
        direction: metric.direction || "stable",
        change: metric.change || (metric.percentage_change != null ? `${metric.percentage_change}%` : "n/a"),
        interpretation: metric.trend || "No trend interpretation",
        stability: metric.stability || "stable",
        status: getMetricStatus(metric),
        reportCount: points.length,
        latestUnit: metric.unit || points.at(-1)?.unit || "",
      };
    })
    .filter(Boolean);
}

export function buildInsightSummaryItems(insights, trends) {
  const items = [
    ...(insights?.key_findings || []),
    ...(insights?.summary || []),
    ...(trends?.summary || []),
  ]
    .filter(Boolean)
    .map((item) => String(item).trim())
    .filter(Boolean);

  return Array.from(new Set(items)).slice(0, 8);
}

export function summarizeHealthMetrics(trends, insights) {
  const cards = getLatestParameterCards(trends);
  const abnormalCount = cards.filter((item) =>
    ["low", "high", "deficient", "insufficient", "critical"].includes(String(item.latestStatus).toLowerCase())
  ).length;
  const unstableCount = buildTrendInsightRows(trends).filter((item) => item.stability === "volatile").length;
  const stableCount = cards.length - unstableCount;
  const anomalyCount = (trends?.anomalies || []).length;

  let score = 96;
  score -= abnormalCount * 9;
  score -= unstableCount * 5;
  score -= Math.min(anomalyCount * 3, 12);
  score -= Math.min((insights?.key_findings || []).length * 2, 8);
  score = Math.max(28, Math.min(99, Math.round(score)));

  let status = "Good";
  if (score < 60) status = "Critical";
  else if (score < 85) status = "Risk";

  return {
    score,
    status,
    abnormalCount,
    stableCount: Math.max(stableCount, 0),
    unstableCount,
  };
}

export function buildConfidenceModel(trends, insights) {
  const metrics = Object.values(trends?.metrics || {});
  const stabilityValues = metrics
    .map((metric) => sanitizeNumber(metric.stability_score))
    .filter((value) => value != null);
  const reportCount = Array.isArray(trends?.reports) && trends.reports.length
    ? trends.reports.length
    : Math.max(...Object.values(trends?.series || {}).map((points) => points.length), 0);

  let confidence = 82;
  if (stabilityValues.length) {
    confidence = Math.round(stabilityValues.reduce((sum, value) => sum + value, 0) / stabilityValues.length);
  }
  confidence = Math.max(55, Math.min(99, confidence));

  const dates = (trends?.reports || [])
    .map((report) => report.date || report.report_date)
    .filter(Boolean)
    .sort();
  const dateRange = dates.length
    ? `${dates[0]} to ${dates[dates.length - 1]}`
    : reportCount > 0
      ? `${reportCount} report history points`
      : "Limited longitudinal history";

  return {
    confidence,
    reportCount,
    dateRange,
    insightCount: buildInsightSummaryItems(insights, trends).length,
  };
}

export function getAnomalySeverityForPoint(parameter, point, anomalies = []) {
  const pointDate = point?.date;
  const matched = anomalies.find((anomaly) => {
    const sameParameter = String(anomaly?.parameter || "").toLowerCase() === String(parameter || "").toLowerCase();
    const relatedDate = String(anomaly?.date || anomaly?.report_date || "");
    return sameParameter && (!relatedDate || relatedDate === pointDate);
  });

  if (matched) {
    return matched.severity === "critical" ? "critical" : "warning";
  }

  const normalizedStatus = String(point?.status || "").toLowerCase();
  if (["deficient", "critical"].includes(normalizedStatus)) return "critical";
  if (["low", "high", "insufficient"].includes(normalizedStatus)) return "warning";
  return null;
}

export function getAnomalyPills(trends, selectedParameters = []) {
  const selected = new Set(selectedParameters);
  return (trends?.anomalies || [])
    .filter((anomaly) => !selected.size || selected.has(anomaly.parameter))
    .map((anomaly, index) => ({
      id: `${anomaly.parameter || "anomaly"}-${index}`,
      parameter: getParameterMeta(anomaly.parameter || "").label,
      severity: anomaly.severity === "critical" ? "critical" : "warning",
      message: anomaly.message || "Trend anomaly detected",
      type: anomaly.type || "out_of_range",
    }))
    .slice(0, 8);
}

export function buildHistoricalRows(trends) {
  return getAvailableParameters(trends).map((parameter) => {
    const meta = getParameterMeta(parameter);
    const points = (trends?.series?.[parameter] || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = points.at(-1) || null;
    const metric = trends?.metrics?.[parameter] || {};
    const values = points
      .map((point) => `${formatChartDate(point.date)}: ${sanitizeNumber(point.value) ?? "-"}${point.unit ? ` ${point.unit}` : ""}`)
      .join(" • ");
    const numericValues = points.map((point) => sanitizeNumber(point.value)).filter((value) => value != null);

    return {
      key: parameter,
      label: meta.label,
      color: meta.color,
      count: points.length,
      latestValue: latest ? `${sanitizeNumber(latest.value) ?? "-"}${latest.unit ? ` ${latest.unit}` : ""}` : "n/a",
      latestStatus: inferPointStatus(latest || {}, metric),
      minValue: numericValues.length ? Math.min(...numericValues) : null,
      maxValue: numericValues.length ? Math.max(...numericValues) : null,
      direction: metric.direction || "stable",
      values,
    };
  });
}

export function buildCoverageItems(trends, reports = []) {
  const trendReports = (trends?.reports || []).map((report, index) => ({
    id: report.id || `trend-report-${index}`,
    date: report.date || report.report_date || "Unknown",
    reportType: report.report_type || report.type || "Clinical Report",
    labName: report.lab_name || report.lab || "Lab pending",
    source: "trend",
  }));

  const caseReports = (reports || []).map((report) => ({
    id: report.id,
    date: report.report_date || report.created_at || "Unknown",
    reportType: report.report_type || "Clinical Report",
    labName: report.lab_name || "Lab pending",
    source: "case",
    summary: report.summary || "",
  }));

  const merged = [...caseReports, ...trendReports];
  const seen = new Set();
  return merged
    .filter((item) => {
      const key = `${item.id}-${item.date}-${item.reportType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}
