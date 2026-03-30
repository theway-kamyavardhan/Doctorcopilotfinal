import { useState } from "react";
import UploadPanel from "./components/UploadPanel";
import ResultViewer from "./components/ResultViewer";
import InsightsViewer from "./components/InsightsViewer";
import TrendDashboard from "./components/TrendDashboard";
import ReportList from "./components/ReportList";
import MultiUpload from "./components/MultiUpload";
import { processReport, fetchPatientInsights, fetchPatientTrends, uploadReport, fetchMyReports } from "./services/api";

function App() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState(null);
  const [insights, setInsights] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [reports, setReports] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [patientId, setPatientId] = useState("");

  const handleUpload = async ({ file, token: tok }) => {
    setIsLoading(true);
    setError("");
    try {
      const data = await processReport(file, tok);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Upload failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchInsights = async (pid) => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchPatientInsights(pid, token);
      setInsights(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to fetch insights.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadTrends = async (pid) => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchPatientTrends(pid, token);
      setTrendsData(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to fetch trends.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadMany = async (files) => {
    setIsUploading(true);
    setError("");
    try {
      for (const file of files) {
        await uploadReport(file, token);
      }
      const data = await fetchMyReports(token);
      setReports(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Multi-upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>DoctorCopilot Debug UI</h1>
        {error ? <div className="error-banner">{error}</div> : null}
      </header>

      <main className="app-main">
        <UploadPanel
          onUpload={handleUpload}
          isLoading={isLoading}
          token={token}
          onTokenChange={setToken}
        />
        <MultiUpload
          token={token}
          onUploadMany={handleUploadMany}
          isUploading={isUploading}
        />
        <ResultViewer result={result} />
        <InsightsViewer
          token={token}
          onFetchInsights={handleFetchInsights}
          insights={insights}
          isLoading={isLoading}
        />
        <TrendDashboard
          trendsData={trendsData}
          isLoading={isLoading}
          onLoad={handleLoadTrends}
          patientId={patientId}
          onPatientIdChange={setPatientId}
          token={token}
        />
        <ReportList reports={reports} />
      </main>
    </div>
  );
}

export default App;
