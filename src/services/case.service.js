import api from "./api";
import {
  addDemoCaseMessage,
  getDemoCase,
  getDemoCaseMessages,
  getDemoCases,
  isDemoSession,
  updateDemoReportAccess,
} from "../lib/demoData";

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.detail || error?.message || fallbackMessage;
}

export async function getCases() {
  if (isDemoSession()) {
    return getDemoCases();
  }

  try {
    const response = await api.get("/api/v1/cases");
    return response.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load consultation cases."));
  }
}

export async function requestConsultation(payload = { type: "consultation_request" }) {
  if (isDemoSession()) {
    throw new Error("New consultations are disabled in static reviewer demo mode.");
  }

  try {
    const response = await api.post("/api/v1/cases", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to request consultation."));
  }
}

export async function cancelConsultation(caseId, note = "") {
  if (isDemoSession()) {
    throw new Error("Demo consultations cannot be cancelled.");
  }

  try {
    const response = await api.patch(`/api/v1/cases/${caseId}/cancel`, {
      note: note || "Consultation request cancelled by patient.",
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to cancel consultation request."));
  }
}

export async function getCaseDetails(caseId) {
  if (isDemoSession()) {
    return getDemoCase(caseId);
  }

  try {
    const response = await api.get(`/api/v1/cases/${caseId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load case details."));
  }
}

export async function getCaseMessages(caseId) {
  if (isDemoSession()) {
    return getDemoCaseMessages(caseId);
  }

  try {
    const response = await api.get(`/api/v1/cases/${caseId}/messages`);
    return response.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load chat messages."));
  }
}

export async function sendCaseMessage(caseId, content) {
  if (isDemoSession()) {
    return addDemoCaseMessage(caseId, content);
  }

  try {
    const response = await api.post(`/api/v1/cases/${caseId}/messages`, {
      content,
      message_type: "text",
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to send message."));
  }
}

export async function respondReportAccess(caseId, decision) {
  if (isDemoSession()) {
    updateDemoReportAccess(caseId, decision);
    return addDemoCaseMessage(
      caseId,
      decision === "granted"
        ? "Patient granted report access. Doctor may now review the reports."
        : "Patient denied report access. The case is now waiting until the doctor sends another request.",
    );
  }

  try {
    const response = await api.patch(`/api/v1/cases/${caseId}/report-access`, {
      decision,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to respond to report access request."));
  }
}

export const caseService = {
  getCases,
  requestConsultation,
  cancelConsultation,
  getCaseDetails,
  getCaseMessages,
  sendCaseMessage,
  respondReportAccess,
};

export default caseService;
