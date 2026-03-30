function ReportList({ reports }) {
  return (
    <section className="panel">
      <h2>Stored Reports</h2>
      {!reports?.length ? (
        <p className="placeholder-text">No stored reports loaded yet.</p>
      ) : (
        <div className="report-list">
          {reports.map((report) => (
            <article key={report.id} className="report-card">
              <div className="report-card-header">
                <h3>{report.report_type || report.file_name}</h3>
                <span>{report.report_date || "No date"}</span>
              </div>
              <div className="trend-meta">{report.lab_name || "Unknown lab"}</div>
              <div className="summary-item">{report.summary || "No summary available."}</div>
              <div className="report-findings">
                {(report.insights || []).slice(0, 2).map((insight) => (
                  <div key={insight.id} className="summary-item">
                    {insight.title}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ReportList;
