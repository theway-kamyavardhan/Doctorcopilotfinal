import reportService from "./report.service";

function parseFilename(contentDisposition) {
  if (!contentDisposition) {
    return `health_report_${new Date().toISOString().slice(0, 10)}.pdf`;
  }

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const simpleMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (simpleMatch?.[1]) {
    return simpleMatch[1];
  }

  return `health_report_${new Date().toISOString().slice(0, 10)}.pdf`;
}

export async function exportAiHealthSummary() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Export is only available in the browser.");
  }

  const response = await reportService.exportHealthSummary();
  const filename = parseFilename(response.headers?.["content-disposition"]);
  const blob = response.blob instanceof Blob
    ? response.blob
    : new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
}

export async function exportSingleReportPdf(reportId, mode = "ai") {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Export is only available in the browser.");
  }

  const response = await reportService.exportReportPdf(reportId, mode);
  const filename = parseFilename(response.headers?.["content-disposition"]);
  const blob = response.blob instanceof Blob
    ? response.blob
    : new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
}

export const ExportService = {
  exportAiHealthSummary,
  exportSingleReportPdf,
};

export default ExportService;
