import axios from "axios";

const TOKEN_STORAGE_KEY = "token";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAuthToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function processReport(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const headers = { "Content-Type": "multipart/form-data" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await api.post("/api/v1/debug/process-report", formData, { headers });
  return response.data;
}

export async function uploadReport(file, token, caseId) {
  const formData = new FormData();
  formData.append("file", file);
  if (caseId) {
    formData.append("case_id", caseId);
  }

  const headers = { "Content-Type": "multipart/form-data" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await api.post("/api/v1/reports/upload", formData, { headers });
  return response.data;
}

export async function fetchPatientInsights(patientId, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await api.get(`/api/v1/patients/${patientId}/insights`, { headers });
  return response.data;
}

export async function fetchPatientTrends(patientId, token) {
  const path = patientId ? `/api/v1/patients/${patientId}/trends` : "/api/v1/patients/me/trends";
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await api.get(path, { headers });
  return response.data;
}

export async function fetchMyReports(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await api.get("/api/v1/patients/me/reports", { headers });
  return response.data;
}

export default api;
