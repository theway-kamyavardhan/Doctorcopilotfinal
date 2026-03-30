import { useMemo, useState } from "react";

function JsonBlock({ data }) {
  return <pre className="code-block">{JSON.stringify(data, null, 2)}</pre>;
}

function DebugPanel({ trendsData }) {
  const [isDark, setIsDark] = useState(true);
  const [copyState, setCopyState] = useState("Copy Debug Output");
  const debugPayload = useMemo(() => {
    if (!trendsData) return null;
    return {
      table: trendsData.table || [],
      series: trendsData.series || {},
      summary: trendsData.summary || [],
      debug: trendsData.debug || {},
    };
  }, [trendsData]);

  const handleCopy = async () => {
    if (!debugPayload) return;
    await navigator.clipboard.writeText(JSON.stringify(debugPayload, null, 2));
    setCopyState("Copied");
    window.setTimeout(() => setCopyState("Copy Debug Output"), 1200);
  };

  if (!trendsData) {
    return null;
  }

  return (
    <section className="panel">
      <div className="debug-toolbar">
        <h2>Debug</h2>
        <div className="debug-actions">
          <button className="secondary-button" type="button" onClick={() => setIsDark((value) => !value)}>
            {isDark ? "Light View" : "Dark View"}
          </button>
          <button className="secondary-button" type="button" onClick={handleCopy}>
            {copyState}
          </button>
        </div>
      </div>

      <div className={`debug-sections ${isDark ? "debug-dark" : "debug-light"}`}>
        <div className="panel">
          <h3>Raw Reports</h3>
          <JsonBlock data={debugPayload.debug.raw_reports || []} />
        </div>
        <div className="panel">
          <h3>Table Data</h3>
          <JsonBlock data={debugPayload.table} />
        </div>
        <div className="panel">
          <h3>Series Data</h3>
          <JsonBlock data={debugPayload.series} />
        </div>
        <div className="panel">
          <h3>Trend Summary</h3>
          <div className="summary-list">
            {(debugPayload.summary || []).map((item, index) => (
              <div key={`debug-summary-${index}`} className="summary-item">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>Debug Info</h3>
          <JsonBlock
            data={{
              normalized_parameters: debugPayload.debug.normalized_parameters || {},
              trend_calculations: debugPayload.debug.trend_calculations || {},
              metadata: debugPayload.debug.metadata || [],
            }}
          />
        </div>
      </div>
    </section>
  );
}

export default DebugPanel;
