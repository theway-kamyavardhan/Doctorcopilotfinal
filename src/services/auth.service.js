import api, { clearAuthToken, getAuthRole, getAuthToken, setAuthRole, setAuthToken } from "./api";

const AUTH_BASE_PATH = "/api/v1/auth";

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.detail || error?.message || fallbackMessage;
}

export function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

export function getDashboardPathForRole(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "admin") return "/admin";
  if (normalizedRole === "doctor") return "/doctor/dashboard";
  return "/patient/dashboard";
}

export async function loginUser({ username, password }) {
  try {
    const response = await api.post(`${AUTH_BASE_PATH}/login`, {
      username,
      password,
    });

    if (response.data?.access_token) {
      setAuthToken(response.data.access_token);
    }

    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Login failed."));
  }
}

export async function registerPatient(payload) {
  try {
    const response = await api.post(`${AUTH_BASE_PATH}/register/patient`, payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Patient registration failed."));
  }
}

export async function getMe() {
  if (!getAuthToken()) {
    throw new Error("No authentication token found.");
  }

  try {
    const response = await api.get(`${AUTH_BASE_PATH}/me`);
    if (response.data?.role) {
      setAuthRole(response.data.role);
    }
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch current user."));
  }
}

export async function getPatientProfile() {
  if (!getAuthToken()) {
    throw new Error("No authentication token found.");
  }

  try {
    const response = await api.get("/api/v1/patients/me");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch patient profile."));
  }
}

export async function updatePatientProfile(payload) {
  try {
    const response = await api.patch("/api/v1/patients/me", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update patient profile."));
  }
}

export async function changePatientPassword(payload) {
  try {
    const response = await api.patch("/api/v1/patients/me/password", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update password."));
  }
}

export async function changeDoctorPassword(payload) {
  try {
    const response = await api.patch("/api/v1/doctors/me/password", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update password."));
  }
}

export function logout() {
  clearAuthToken();
}

export function hasToken() {
  return Boolean(getAuthToken());
}

export function getStoredRole() {
  return normalizeRole(getAuthRole());
}

export const authService = {
  loginUser,
  registerPatient,
  getMe,
  getPatientProfile,
  updatePatientProfile,
  changePatientPassword,
  changeDoctorPassword,
  logout,
  hasToken,
  getStoredRole,
  normalizeRole,
  getDashboardPathForRole,
};

export default authService;
