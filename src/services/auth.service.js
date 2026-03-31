import api, { clearAuthToken, getAuthToken, setAuthToken } from "./api";

const AUTH_BASE_PATH = "/api/v1/auth";

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.detail || error?.message || fallbackMessage;
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

export function logout() {
  clearAuthToken();
}

export function hasToken() {
  return Boolean(getAuthToken());
}

export const authService = {
  loginUser,
  registerPatient,
  getMe,
  getPatientProfile,
  updatePatientProfile,
  changePatientPassword,
  logout,
  hasToken,
};

export default authService;
