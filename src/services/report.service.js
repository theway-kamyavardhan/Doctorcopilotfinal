import api from "./api";

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

export const reportService = {
  uploadReport,
  getReports,
  getTrends,
  getInsights,
  deleteReport,
};

export default reportService;
