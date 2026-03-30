function JsonBlock({ value }) {
  return <pre className="code-block">{JSON.stringify(value, null, 2)}</pre>;
}

function ResultViewer({ result }) {
  if (!result) {
    return (
      <section className="panel">
        <h2>Results</h2>
        <p className="placeholder-text">No response yet. Upload a report to inspect the pipeline output.</p>
      </section>
    );
  }

  return (
    <section className="results-grid">
      <div className="panel">
        <h2>Raw Text</h2>
        <pre className="text-box">{result.raw_text}</pre>
      </div>

      <div className="panel">
        <h2>AI Output</h2>
        <JsonBlock value={result.ai_output} />
      </div>

      <div className="panel">
        <h2>Parsed Data</h2>
        <JsonBlock value={result.parsed_data} />
      </div>

      <div className="panel">
        <h2>Logs</h2>
        <div className="log-list">
          {result.logs?.map((log, index) => (
            <article className="log-item" key={`${log.step}-${index}`}>
              <div className="log-header">
                <strong>{log.step}</strong>
                <span className={`status-pill status-${log.status}`}>{log.status}</span>
              </div>
              <div className="log-message">{log.detail || "No detail provided."}</div>
              {log.created_at ? <div className="log-time">{log.created_at}</div> : null}
              {log.error_message ? <div className="log-error">{log.error_message}</div> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ResultViewer;
