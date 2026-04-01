import api from "./api";

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.detail || error?.message || fallbackMessage;
}

export async function getDoctorProfile() {
  try {
    const response = await api.get("/api/v1/doctors/me");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch doctor profile."));
  }
}

export async function updateDoctorProfile(payload) {
  try {
    const response = await api.patch("/api/v1/doctors/me", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update doctor profile."));
  }
}

export async function getDoctorDashboard() {
  try {
    const response = await api.get("/api/v1/doctors/me/dashboard");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch doctor dashboard."));
  }
}

export async function getDoctorCases() {
  try {
    const response = await api.get("/api/v1/doctors/me/cases");
    return response.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch doctor cases."));
  }
}

export async function getDoctorCase(caseId) {
  try {
    const response = await api.get(`/api/v1/cases/${caseId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch case overview."));
  }
}

export async function getPatientTrendOverview(patientId) {
  try {
    const response = await api.get(`/api/v1/patients/${patientId}/trends`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch patient trends."));
  }
}

export async function getPatientInsights(patientId) {
  try {
    const response = await api.get(`/api/v1/patients/${patientId}/insights`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch patient insights."));
  }
}

export async function acceptDoctorCase(caseId) {
  try {
    const response = await api.patch(`/api/v1/cases/${caseId}/status`, {
      status: "open",
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to accept consultation request."));
  }
}

export async function rejectDoctorCase(caseId, note = "") {
  try {
    const response = await api.patch(`/api/v1/cases/${caseId}/reject`, {
      note: note || "Consultation request declined by doctor.",
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to reject consultation request."));
  }
}

export async function referDoctorCase(caseId, doctorId, note = "") {
  try {
    const response = await api.patch(`/api/v1/cases/${caseId}/refer`, {
      doctor_id: doctorId,
      note,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to refer consultation request."));
  }
}

export async function getDoctorDirectory() {
  try {
    const response = await api.get("/api/v1/doctors/directory");
    return response.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load doctor directory."));
  }
}

export async function searchDoctorPatients(query = "") {
  try {
    const response = await api.get("/api/v1/doctors/patients/search", {
      params: query ? { q: query } : {},
    });
    return response.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to search patients."));
  }
}

export async function createDoctorConsultation(payload) {
  try {
    const response = await api.post("/api/v1/cases", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to start consultation."));
  }
}

export async function requestDoctorReportAccess(caseId) {
  try {
    const response = await api.post(`/api/v1/cases/${caseId}/report-access/request`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to request report access."));
  }
}

export async function deleteDoctorCase(caseId) {
  try {
    await api.delete(`/api/v1/cases/${caseId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to delete archived case."));
  }
}

export const doctorService = {
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorDashboard,
  getDoctorCases,
  getDoctorCase,
  getPatientTrendOverview,
  getPatientInsights,
  acceptDoctorCase,
  rejectDoctorCase,
  referDoctorCase,
  getDoctorDirectory,
  searchDoctorPatients,
  createDoctorConsultation,
  requestDoctorReportAccess,
  deleteDoctorCase,
};

export default doctorService;
