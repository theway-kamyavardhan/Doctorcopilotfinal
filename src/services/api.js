import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export async function processReport(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/api/v1/debug/process-report", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function uploadReport(file, token, caseId) {
  const formData = new FormData();
  formData.append("file", file);
  if (caseId) {
    formData.append("case_id", caseId);
  }

  const response = await api.post("/api/v1/reports/upload", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function fetchPatientInsights(patientId, token) {
  const response = await api.get(`/api/v1/patients/${patientId}/insights`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function fetchPatientTrends(patientId, token) {
  const path = patientId ? `/api/v1/patients/${patientId}/trends` : "/api/v1/patients/me/trends";
  const response = await api.get(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function fetchMyReports(token) {
  const response = await api.get("/api/v1/patients/me/reports", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

export default api;
