import axios from "axios";

const TOKEN_STORAGE_KEY = "token";
const ROLE_STORAGE_KEY = "role";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
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

export function setAuthRole(role) {
  if (role) {
    localStorage.setItem(ROLE_STORAGE_KEY, String(role).toLowerCase());
  }
}

export function getAuthRole() {
  return localStorage.getItem(ROLE_STORAGE_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(ROLE_STORAGE_KEY);
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
