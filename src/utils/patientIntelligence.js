const ABNORMAL_STATUSES = new Set(["low", "high", "deficient", "insufficient", "critical"]);

export function formatParameterLabel(value) {
  if (!value) return "Unknown";
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isAbnormalStatus(status) {
  return ABNORMAL_STATUSES.has(String(status || "").toLowerCase());
}

export function getLatestReport(reports = []) {
  return [...reports].sort((a, b) => {
    const aDate = a?.report_date || a?.created_at || 0;
    const bDate = b?.report_date || b?.created_at || 0;
    return new Date(bDate) - new Date(aDate);
  })[0] || null;
}

export function getRecentReports(reports = [], count = 3) {
  return [...reports]
    .sort((a, b) => {
      const aDate = a?.report_date || a?.created_at || 0;
      const bDate = b?.report_date || b?.created_at || 0;
      return new Date(bDate) - new Date(aDate);
    })
    .slice(0, count);
}

export function getParameterHistory(trends, parameterName) {
  return trends?.series?.[parameterName] || [];
}

export function getLatestParameter(reports = [], parameterName) {
  const latestReport = getLatestReport(reports);
  return latestReport?.parameters?.find((item) => item.name === parameterName) || null;
}

export function calculateHealthScore(reports = [], trends = null, insights = null) {
  let score = 97;
  const reasons = [];
  const latestReport = getLatestReport(reports);
  const latestParameters = latestReport?.parameters || [];

  latestParameters.forEach((parameter) => {
    if (!isAbnormalStatus(parameter.status || parameter.interpretation)) {
      return;
    }

    const status = String(parameter.status || parameter.interpretation).toLowerCase();
    score -= status === "high" || status === "low" ? 8 : 11;
    reasons.push(`${formatParameterLabel(parameter.name)} is currently ${status}.`);

    const history = getParameterHistory(trends, parameter.name);
    const abnormalHistory = history.filter((point) => isAbnormalStatus(point.status));
    if (abnormalHistory.length >= 2) {
      score -= 6;
      reasons.push(`${formatParameterLabel(parameter.name)} has remained abnormal across multiple reports.`);
    }

    const metric = trends?.metrics?.[parameter.name];
    if (metric?.direction === "decreasing" && status !== "high") {
      score -= 4;
      reasons.push(`${formatParameterLabel(parameter.name)} is trending downward.`);
    }
  });

  const findings = [
    ...(insights?.key_findings || []),
    ...(trends?.summary || []),
  ];
  score -= Math.min(findings.length * 2, 10);
  score = Math.max(32, Math.min(99, Math.round(score)));

  let status = "Optimal";
  let explanation = "Most recent markers are within reassuring ranges.";
  if (score < 60) {
    status = "Critical Risk";
    explanation = "Multiple abnormal or persistent issues need closer follow-up.";
  } else if (score < 90) {
    status = "Moderate Risk";
    explanation = "Some markers need monitoring based on recent abnormalities and trends.";
  }

  return { score, status, explanation, reasons: Array.from(new Set(reasons)).slice(0, 4) };
}

export function buildAlertItems(reports = [], trends = null, insights = null) {
  const alerts = [];
  const latestReport = getLatestReport(reports);

  (latestReport?.parameters || []).forEach((parameter) => {
    const status = String(parameter.status || parameter.interpretation || "").toLowerCase();
    if (!isAbnormalStatus(status)) {
      return;
    }

    const label = formatParameterLabel(parameter.name);
    const history = getParameterHistory(trends, parameter.name);
    const abnormalHistory = history.filter((point) => isAbnormalStatus(point.status));
    const severe = abnormalHistory.length >= 2 || status === "deficient";

    alerts.push({
      title: `${label} ${status}`,
      description:
        abnormalHistory.length >= 2
          ? `${label} has remained abnormal across multiple reports.`
          : `${label} is currently ${status} in the latest report.`,
      severity: severe ? "critical" : "warning",
    });
  });

  (trends?.summary || []).forEach((item) => {
    const normalized = String(item || "").toLowerCase();
    if (!normalized) return;
    if (normalized.includes("declined") || normalized.includes("persistent") || normalized.includes("high")) {
      alerts.push({
        title: item,
        description: "Trend intelligence flagged this for closer attention.",
        severity: normalized.includes("persistent") ? "critical" : "warning",
      });
    }
  });

  (insights?.key_findings || []).forEach((item) => {
    alerts.push({
      title: item,
      description: "AI synthesis detected a clinically meaningful finding.",
      severity: "warning",
    });
  });

  const unique = [];
  const seen = new Set();
  for (const alert of alerts) {
    const key = `${alert.title}|${alert.severity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(alert);
  }

  return unique.slice(0, 5);
}

export function buildClinicalInterpretation(report) {
  const parameterBullets = (report?.parameters || [])
    .filter((item) => isAbnormalStatus(item.status || item.interpretation))
    .map((item) => {
      const label = formatParameterLabel(item.name);
      const status = String(item.status || item.interpretation).toLowerCase();

      if (label === "Platelets" && status === "low") {
        return "Mild thrombocytopenia pattern is present in this report.";
      }
      if (label === "Vitamin B12" && (status === "low" || status === "deficient")) {
        return "Vitamin B12 deficiency pattern is present.";
      }
      if (label === "Vitamin D" && (status === "deficient" || status === "insufficient")) {
        return `Vitamin D ${status} pattern is present.`;
      }
      return `${label} is ${status} in this report.`;
    });

  const insightBullets = (report?.insights || [])
    .map((item) => item.description || item.title)
    .filter(Boolean);

  return Array.from(new Set([...parameterBullets, ...insightBullets])).slice(0, 5);
}

export function getReportPreviewInsight(report) {
  const abnormalParameter = (report?.parameters || []).find((item) => isAbnormalStatus(item.status || item.interpretation));
  if (abnormalParameter) {
    return `${formatParameterLabel(abnormalParameter.name)} is ${String(abnormalParameter.status || abnormalParameter.interpretation).toLowerCase()}.`;
  }

  const insight = (report?.insights || []).map((item) => item.description || item.title).find(Boolean);
  if (insight) {
    return insight;
  }

  if (report?.summary) {
    return report.summary;
  }

  return "Structured report added to your health timeline.";
}

export function getTrendArrow(direction) {
  if (direction === "increasing") return "↑";
  if (direction === "decreasing") return "↓";
  return "→";
}

export function getNormalRangeExplanation(parameterName, history = []) {
  const latestUnit = history[history.length - 1]?.unit || "";
  const rules = {
    hemoglobin: `Hemoglobin is commonly interpreted against an adult reference interval around 12-17 ${latestUnit || "g/dL"}, depending on lab context.`,
    platelets: "Platelet counts are typically interpreted around a normal range of 150000-450000 /µL.",
    vitamin_b12: "Vitamin B12 is usually considered low below roughly 200 pg/mL, depending on the laboratory reference used.",
    vitamin_d: "Vitamin D is often categorized as deficient below 20 ng/mL, insufficient at 20-30 ng/mL, and adequate above 30 ng/mL.",
    white_blood_cells: "White blood cell counts are typically interpreted using the lab-specific normal interval around 4-11 ×10³/µL.",
  };

  return rules[parameterName] || `${formatParameterLabel(parameterName)} should be interpreted against the reference range shown in the originating report.`;
}
