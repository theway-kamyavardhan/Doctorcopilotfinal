import api from "./api";

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.detail || error?.message || fallbackMessage;
}

export async function getAdminDashboard() {
  try {
    const response = await api.get("/api/v1/admin/dashboard");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load admin dashboard."));
  }
}

export async function getDoctors() {
  try {
    const response = await api.get("/api/v1/admin/doctors");
    return response.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load doctors."));
  }
}

export async function createDoctor(payload) {
  try {
    const response = await api.post("/api/v1/admin/doctors", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to register doctor."));
  }
}

export async function updateDoctorStatus(doctorId, isActive) {
  try {
    const response = await api.patch(`/api/v1/admin/doctors/${doctorId}/status`, {
      is_active: isActive,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update doctor status."));
  }
}

export async function resetDoctorPassword(doctorId) {
  try {
    const response = await api.post(`/api/v1/admin/doctors/${doctorId}/reset-password`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to reset doctor password."));
  }
}

export async function getPatients() {
  try {
    const response = await api.get("/api/v1/admin/patients");
    return response.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load patients."));
  }
}

export async function deletePatient(patientId) {
  try {
    await api.delete(`/api/v1/admin/patients/${patientId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to delete patient."));
  }
}

export async function getCases() {
  try {
    const response = await api.get("/api/v1/admin/cases");
    return response.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load cases."));
  }
}

export async function updateCase(caseId, payload) {
  try {
    const response = await api.patch(`/api/v1/admin/cases/${caseId}`, payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update case."));
  }
}

export async function getReports() {
  try {
    const response = await api.get("/api/v1/admin/reports");
    return response.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load reports."));
  }
}

export async function getSystemStatus() {
  try {
    const response = await api.get("/api/v1/admin/system-status");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load system status."));
  }
}

export async function getPipeline() {
  try {
    const response = await api.get("/api/v1/admin/pipeline");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load AI pipeline data."));
  }
}

export async function pingHealth() {
  const startedAt = performance.now();
  try {
    const response = await api.get("/health");
    return {
      ...response.data,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Health check failed."));
  }
}

export const adminService = {
  getAdminDashboard,
  getDoctors,
  createDoctor,
  updateDoctorStatus,
  resetDoctorPassword,
  getPatients,
  deletePatient,
  getCases,
  updateCase,
  getReports,
  getSystemStatus,
  getPipeline,
  pingHealth,
};

export default adminService;
