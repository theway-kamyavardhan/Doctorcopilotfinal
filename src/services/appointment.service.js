import api from "./api";

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.detail || error?.message || fallbackMessage;
}

export async function createAppointment(payload) {
  try {
    const response = await api.post("/api/v1/appointments", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create appointment."));
  }
}

export async function getPatientAppointments() {
  try {
    const response = await api.get("/api/v1/patients/me/appointments");
    return response.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load appointments."));
  }
}

export async function getDoctorAppointments() {
  try {
    const response = await api.get("/api/v1/doctors/me/appointments");
    return response.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load doctor appointments."));
  }
}

export async function updateAppointment(appointmentId, payload) {
  try {
    const response = await api.patch(`/api/v1/appointments/${appointmentId}`, payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update appointment."));
  }
}

export const appointmentService = {
  createAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointment,
};

export default appointmentService;
