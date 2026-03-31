import api from "./api";

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.detail || error?.message || fallbackMessage;
}

export async function getCases() {
  try {
    const response = await api.get("/api/v1/cases");
    return response.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load consultation cases."));
  }
}

export async function requestConsultation(payload = { type: "consultation_request" }) {
  try {
    const response = await api.post("/api/v1/cases", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to request consultation."));
  }
}

export async function getCaseMessages(caseId) {
  try {
    const response = await api.get(`/api/v1/cases/${caseId}/messages`);
    return response.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load chat messages."));
  }
}

export async function sendCaseMessage(caseId, content) {
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

export const caseService = {
  getCases,
  requestConsultation,
  getCaseMessages,
  sendCaseMessage,
};

export default caseService;
