import { useState } from "react";

function MultiUpload({ token, onUploadMany, isUploading }) {
  const [files, setFiles] = useState([]);
  const [localError, setLocalError] = useState("");

  const handleChange = (event) => {
    setFiles(Array.from(event.target.files || []));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token.trim()) {
      setLocalError("A bearer token is required before uploading reports.");
      return;
    }
    if (!files.length) {
      setLocalError("Select one or more reports to upload.");
      return;
    }
    setLocalError("");
    await onUploadMany(files);
  };

  return (
    <section className="panel">
      <h2>Multi Upload</h2>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Medical Reports</span>
          <input className="file-input" type="file" accept=".pdf,image/*" multiple onChange={handleChange} />
        </label>

        {files.length ? (
          <div className="queue-list">
            {files.map((file) => (
              <div key={`${file.name}-${file.size}`} className="queue-item">
                <strong>{file.name}</strong>
                <span>{Math.round(file.size / 1024)} KB</span>
              </div>
            ))}
          </div>
        ) : null}

        {localError ? <div className="error-inline">{localError}</div> : null}

        <button className="primary-button" type="submit" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload All"}
        </button>
      </form>
    </section>
  );
}

export default MultiUpload;
