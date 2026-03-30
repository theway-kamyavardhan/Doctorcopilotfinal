import { useMemo, useState } from "react";

function Sparkline({ points, color = "#1366d6" }) {
  const normalized = useMemo(() => {
    if (!points?.length) return "";
    const width = 280;
    const height = 80;
    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return points
      .map((point, index) => {
        const x = (index / Math.max(points.length - 1, 1)) * width;
        const y = height - ((point.value - min) / range) * (height - 10) - 5;
        return `${x},${y}`;
      })
      .join(" ");
  }, [points]);

  return (
    <svg className="sparkline" viewBox="0 0 280 80" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="3" points={normalized} />
    </svg>
  );
}

function TrendCard({ label, trend }) {
  return (
    <article className="trend-card">
      <div className="trend-card-header">
        <h3>{label}</h3>
        <span className={`status-pill trend-${trend.trend}`}>{trend.trend}</span>
      </div>
      <div className="trend-meta">Status: {trend.status}</div>
      <Sparkline points={trend.values} />
      <div className="trend-points">
        {trend.values.map((point) => (
          <div key={`${label}-${point.date}`} className="trend-point-row">
            <span>{point.date}</span>
            <strong>
              {point.value}
              {point.unit ? ` ${point.unit}` : ""}
            </strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function InsightsViewer({ token, onFetchInsights, insights, isLoading }) {
  const [patientId, setPatientId] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token.trim()) {
      setError("A bearer token is required to fetch patient insights.");
      return;
    }
    if (!patientId.trim()) {
      setError("Enter a patient ID to load multi-report insights.");
      return;
    }
    setError("");
    await onFetchInsights(patientId.trim());
  };

  return (
    <section className="panel">
      <h2>Trends</h2>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Patient ID</span>
          <input
            className="text-input"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
            placeholder="Patient UUID"
          />
        </label>
        {error ? <div className="error-inline">{error}</div> : null}
        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? "Loading..." : "Load Insights"}
        </button>
      </form>

      {!insights ? (
        <p className="placeholder-text">No trend data loaded yet.</p>
      ) : (
        <div className="insights-layout">
          <div className="summary-list">
            <h3>AI Summary</h3>
            {insights.summary?.map((item, index) => (
              <div key={`summary-${index}`} className="summary-item">
                {item}
              </div>
            ))}
            <div className="risk-line">
              <strong>Risk Level:</strong> {insights.risk_level}
            </div>
            <h3>Key Findings</h3>
            {insights.key_findings?.map((item, index) => (
              <div key={`finding-${index}`} className="summary-item">
                {item}
              </div>
            ))}
          </div>

          <div className="trend-grid">
            {Object.entries(insights.trends || {})
              .filter(([name]) => name === "hemoglobin" || name === "platelets")
              .map(([name, trend]) => (
                <TrendCard key={name} label={name} trend={trend} />
              ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default InsightsViewer;
