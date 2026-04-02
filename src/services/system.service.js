import api, { clearSessionOpenAiKey, getSessionOpenAiKey, setSessionOpenAiKey } from "./api";

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.detail || error?.message || fallbackMessage;
}

export async function getAiAccessStatus() {
  try {
    const response = await api.get("/api/v1/system/ai-access");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load AI access status."));
  }
}

export async function validateSessionApiKey() {
  try {
    const response = await api.get("/api/v1/system/ai-access");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to validate session API key."));
  }
}

export function saveSessionApiKey(value) {
  setSessionOpenAiKey(value);
}

export function readSessionApiKey() {
  return getSessionOpenAiKey();
}

export function removeSessionApiKey() {
  clearSessionOpenAiKey();
}

const systemService = {
  getAiAccessStatus,
  validateSessionApiKey,
  saveSessionApiKey,
  readSessionApiKey,
  removeSessionApiKey,
};

export default systemService;
