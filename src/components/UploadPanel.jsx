import { useState } from "react";

function UploadPanel({ onUpload, isLoading, token, onTokenChange }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setLocalError("Please choose a PDF or image file before uploading.");
      return;
    }

    if (!token.trim()) {
      setLocalError("A bearer token is required for this backend endpoint.");
      return;
    }

    setLocalError("");
    await onUpload({ file: selectedFile, token: token.trim() });
  };

  return (
    <section className="panel">
      <h2>Upload Panel</h2>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Bearer Token</span>
          <textarea
            className="text-input token-input"
            value={token}
            onChange={(event) => onTokenChange(event.target.value)}
            placeholder="Paste JWT token here"
            rows={3}
          />
        </label>

        <label className="field">
          <span>Medical Report</span>
          <input
            className="file-input"
            type="file"
            accept=".pdf,image/*"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
        </label>

        {selectedFile ? (
          <div className="file-meta">
            <strong>Selected:</strong> {selectedFile.name}
          </div>
        ) : null}

        {localError ? <div className="error-inline">{localError}</div> : null}

        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? "Processing..." : "Upload Report"}
        </button>
      </form>
    </section>
  );
}

export default UploadPanel;
