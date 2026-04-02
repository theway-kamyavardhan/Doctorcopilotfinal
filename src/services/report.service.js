import api from "./api";

async function parseApiError(error, fallbackMessage = "Request failed.") {
  const detail = error?.response?.data;
  if (!detail) {
    return error?.message || fallbackMessage;
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
    if (typeof detail.detail === "string") {
      return detail.detail;
    }
    return JSON.stringify(detail.detail);
  }

  if (typeof detail === "string") {
    return detail;
  }

  return error?.message || fallbackMessage;
}

export async function uploadReport(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/api/v1/reports/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(await parseApiError(error, "Upload failed."));
  }
}

export async function getReports() {
  const response = await api.get("/api/v1/patients/me/reports");
  return response.data || [];
}

export async function getReport(reportId) {
  const response = await api.get(`/api/v1/reports/${reportId}`);
  return response.data;
}

export async function getReportFile(reportId) {
  const response = await api.get(`/api/v1/reports/${reportId}/file`, {
    responseType: "blob",
  });

  return {
    blob: response.data,
    headers: {
      "content-type": response.headers?.["content-type"],
      "content-disposition": response.headers?.["content-disposition"],
    },
  };
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
    throw new Error(await parseApiError(error, "Failed to export health summary."));
  }
}

export async function exportReportPdf(reportId, mode = "ai") {
  try {
    const response = await api.get(`/api/v1/reports/${reportId}/export`, {
      params: { mode },
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
    throw new Error(await parseApiError(error, "Failed to export report PDF."));
  }
}

export const reportService = {
  uploadReport,
  getReports,
  getReport,
  getReportFile,
  getTrends,
  getInsights,
  deleteReport,
  exportHealthSummary,
  exportReportPdf,
};

export default reportService;
