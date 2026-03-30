import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DebugPanel from "./DebugPanel";

const PRIORITY_PARAMETERS = ["hemoglobin", "platelets", "vitamin_b12"];

function TrendDashboard({ trendsData, isLoading, onLoad, patientId, onPatientIdChange, token }) {
  const [selectedParameter, setSelectedParameter] = useState("hemoglobin");
  const [showDebug, setShowDebug] = useState(false);
  const parameterOptions = useMemo(() => Object.keys(trendsData?.series || {}), [trendsData]);
  const activeParameter = parameterOptions.includes(selectedParameter) ? selectedParameter : parameterOptions[0] || "";
  const chartData = trendsData?.table || [];

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onLoad(patientId.trim() || null);
  };

  return (
    <section className="panel">
      <h2>Trend Dashboard</h2>
      <form className="upload-form inline-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Patient ID</span>
          <input
            className="text-input"
            value={patientId}
            onChange={(event) => onPatientIdChange(event.target.value)}
            placeholder="Leave empty to use current patient"
          />
        </label>
        <button className="primary-button" type="submit" disabled={isLoading || !token.trim()}>
          {isLoading ? "Loading..." : "Load Trends"}
        </button>
      </form>

      {!trendsData ? (
        <p className="placeholder-text">Load patient trends to visualize report history.</p>
      ) : (
        <>
          <div className="trend-dashboard-layout">
            <div className="field">
              <span>Parameter</span>
              <select className="text-input" value={activeParameter} onChange={(event) => setSelectedParameter(event.target.value)}>
                {parameterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="timeline-strip">
              {trendsData.reports?.map((report) => (
                <div key={report.id} className="timeline-node">
                  <strong>{report.report_date || "Undated"}</strong>
                  <span>{report.report_type || "Report"}</span>
                </div>
              ))}
            </div>

            <div className="chart-grid">
              {[activeParameter, ...PRIORITY_PARAMETERS.filter((item) => item !== activeParameter)]
                .filter((value, index, self) => value && self.indexOf(value) === index)
                .filter((parameter) => trendsData.series?.[parameter]?.length)
                .slice(0, 3)
                .map((parameter) => (
                  <article key={parameter} className="chart-card">
                    <div className="trend-card-header">
                      <h3>{parameter}</h3>
                      <span className={`status-pill trend-${trendsData.metrics?.[parameter]?.trend || "stable"}`}>
                        {trendsData.metrics?.[parameter]?.trend || "stable"}
                      </span>
                    </div>
                    <div className="trend-meta">
                      Delta: {trendsData.metrics?.[parameter]?.delta ?? 0}
                      {trendsData.metrics?.[parameter]?.unit ? ` ${trendsData.metrics[parameter].unit}` : ""}
                      {typeof trendsData.metrics?.[parameter]?.percentage_change === "number"
                        ? ` | ${trendsData.metrics[parameter].percentage_change}%`
                        : ""}
                    </div>
                    <div className="chart-shell">
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={chartData}>
                          <CartesianGrid stroke="#d8e0ea" strokeDasharray="4 4" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey={parameter} stroke="#1366d6" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </article>
                ))}
            </div>

            <div className="summary-list">
              <div className="summary-header">
                <h3>Trend Insights</h3>
                <button className="secondary-button" type="button" onClick={() => setShowDebug((value) => !value)}>
                  {showDebug ? "Hide Debug" : "Show Debug"}
                </button>
              </div>
              {(trendsData.summary || []).map((item, index) => (
                <div key={`trend-insight-${index}`} className="summary-item">
                  {item}
                </div>
              ))}
            </div>
          </div>
          {showDebug ? <DebugPanel trendsData={trendsData} /> : null}
        </>
      )}
    </section>
  );
}

export default TrendDashboard;
