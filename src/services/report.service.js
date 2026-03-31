import api from "./api";

async function parseExportError(error) {
  const detail = error?.response?.data;
  if (!detail) {
    return error?.message || "Failed to export health summary.";
  }

  if (typeof Blob !== "undefined" && detail instanceof Blob) {
    const text = await detail.text().catch(() => "");
    if (text) {
      try {
        const payload = JSON.parse(text);
        return payload?.detail || text;
      } catch {
        return text;
      }
    }
  }

  if (typeof detail === "object" && detail?.detail) {
    return detail.detail;
  }

  return error?.message || "Failed to export health summary.";
}

export async function uploadReport(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/api/v1/reports/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function getReports() {
  const response = await api.get("/api/v1/patients/me/reports");
  return response.data || [];
}

export async function getTrends() {
  const response = await api.get("/api/v1/patients/me/trends");
  return response.data;
}

export async function getInsights() {
  const response = await api.get("/api/v1/patients/me/insights");
  return response.data;
}

export async function deleteReport(reportId) {
  await api.delete(`/api/v1/reports/${reportId}`);
}

export async function exportHealthSummary() {
  try {
    const response = await api.get("/api/v1/patients/me/export", {
      responseType: "blob",
      headers: {
        Accept: "application/pdf",
      },
    });

    return {
      blob: response.data,
      headers: {
        "content-disposition": response.headers?.["content-disposition"],
      },
    };
  } catch (error) {
    throw new Error(await parseExportError(error));
  }
}

export const reportService = {
  uploadReport,
  getReports,
  getTrends,
  getInsights,
  deleteReport,
  exportHealthSummary,
};

export default reportService;
