import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Search, ZoomIn, ZoomOut } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import reportService from "../../services/report.service";

GlobalWorkerOptions.workerSrc = pdfWorker;

const MAGNIFIER_SIZE = 220;
const MAGNIFIER_SCALE = 2.2;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function OriginalReportViewer({ reportId, mimeType, isDark }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [blobUrl, setBlobUrl] = useState("");
  const [fileType, setFileType] = useState(mimeType || "");
  const [zoom, setZoom] = useState(1);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
  const [magnifierState, setMagnifierState] = useState({ visible: false, x: 0, y: 0, bgX: 0, bgY: 0, width: 0, height: 0 });
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [canvasSnapshot, setCanvasSnapshot] = useState("");
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    let active = true;
    let currentUrl = "";

    const loadFile = async () => {
      setLoading(true);
      setError("");
      setPdfDoc(null);
      setCanvasSnapshot("");
      setPageNumber(1);
      try {
        const response = await reportService.getReportFile(reportId);
        if (!active) return;

        const resolvedType = response.headers?.["content-type"] || mimeType || "";
        const nextUrl = URL.createObjectURL(response.blob);
        currentUrl = nextUrl;
        setBlobUrl(nextUrl);
        setFileType(resolvedType);

        if (resolvedType.includes("pdf")) {
          const data = await response.blob.arrayBuffer();
          if (!active) return;
          const documentProxy = await getDocument({ data }).promise;
          if (!active) return;
          setPdfDoc(documentProxy);
          setPageCount(documentProxy.numPages || 1);
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || "Unable to open the original uploaded report.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadFile();

    return () => {
      active = false;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [reportId, mimeType]);

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      const page = await pdfDoc.getPage(pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale: zoom });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
      if (!cancelled) {
        setCanvasSnapshot(canvas.toDataURL("image/png"));
      }
    };

    renderPage().catch((renderError) => {
      if (!cancelled) {
        setError(renderError.message || "Unable to render the uploaded PDF.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber, zoom]);

  const handleZoomIn = () => setZoom((current) => Math.min(current + 0.25, 3));
  const handleZoomOut = () => setZoom((current) => Math.max(current - 0.25, 0.5));
  const handleReset = () => setZoom(1);

  const handlePointerMove = (event) => {
    if (!magnifierEnabled) return;
    const sourceElement = fileType.includes("pdf") ? canvasRef.current : imageRef.current;
    const container = containerRef.current;
    if (!sourceElement || !container) return;

    const rect = sourceElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setMagnifierState((current) => ({ ...current, visible: false }));
      return;
    }

    const lensX = clamp(
      container.scrollLeft + event.clientX - containerRect.left - MAGNIFIER_SIZE / 2,
      0,
      Math.max(container.scrollWidth - MAGNIFIER_SIZE, 0)
    );
    const lensY = clamp(
      container.scrollTop + event.clientY - containerRect.top - MAGNIFIER_SIZE / 2,
      0,
      Math.max(container.scrollHeight - MAGNIFIER_SIZE, 0)
    );

    setMagnifierState({
      visible: true,
      x: lensX,
      y: lensY,
      bgX: x * MAGNIFIER_SCALE - MAGNIFIER_SIZE / 2,
      bgY: y * MAGNIFIER_SCALE - MAGNIFIER_SIZE / 2,
      width: rect.width,
      height: rect.height,
    });
  };

  const handlePointerLeave = () => {
    setMagnifierState((current) => ({ ...current, visible: false }));
  };

  const previewBackground = fileType.includes("pdf") ? canvasSnapshot : blobUrl;

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-cyan-500/10 text-cyan-100" : "bg-cyan-50 text-cyan-700"}`}>
        Viewing the original uploaded report. Use zoom controls for closer inspection, and enable the magnifier for fine-grained review.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            <ZoomOut size={14} />
            Zoom Out
          </button>
          <div className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
            {Math.round(zoom * 100)}%
          </div>
          <button
            type="button"
            onClick={handleZoomIn}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            <ZoomIn size={14} />
            Zoom In
          </button>
          <button
            type="button"
            onClick={handleReset}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setMagnifierEnabled((current) => !current)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
              magnifierEnabled
                ? "bg-blue-600 text-white"
                : isDark
                  ? "bg-white/5 text-slate-200 hover:bg-white/10"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Search size={14} />
            {magnifierEnabled ? "Magnifier On" : "Magnifier"}
          </button>
        </div>

        {fileType.includes("pdf") ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPageNumber((current) => Math.max(current - 1, 1))}
              disabled={pageNumber <= 1}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"} disabled:opacity-50`}
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <div className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
              Page {pageNumber} / {pageCount}
            </div>
            <button
              type="button"
              onClick={() => setPageNumber((current) => Math.min(current + 1, pageCount))}
              disabled={pageNumber >= pageCount}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"} disabled:opacity-50`}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        ) : null}
      </div>

      <div
        ref={containerRef}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        className={`relative overflow-auto rounded-2xl border p-4 ${isDark ? "border-white/10 bg-slate-950" : "border-slate-200 bg-slate-50"}`}
        style={{ minHeight: "32rem", maxHeight: "65vh" }}
      >
        {loading ? (
          <div className="flex h-[32rem] items-center justify-center">
            <LoaderCircle size={26} className="animate-spin text-cyan-400" />
          </div>
        ) : error ? (
          <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
            {error}
          </div>
        ) : fileType.includes("image/") ? (
          <div className="flex min-h-[30rem] items-start justify-center">
            <img
              ref={imageRef}
              src={blobUrl}
              alt="Original uploaded report"
              className="max-w-none rounded-xl shadow-lg"
              style={{ width: `${zoom * 100}%` }}
            />
          </div>
        ) : fileType.includes("pdf") ? (
          <div className="flex min-h-[30rem] items-start justify-center">
            <canvas ref={canvasRef} className="rounded-xl shadow-lg" />
          </div>
        ) : (
          <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-300" : "bg-white text-slate-700"}`}>
            This file type cannot be previewed directly here, but it can still be exported.
          </div>
        )}

        {magnifierEnabled && magnifierState.visible && previewBackground ? (
          <div
            className="pointer-events-none absolute overflow-hidden rounded-full border-2 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.25)]"
            style={{
              width: MAGNIFIER_SIZE,
              height: MAGNIFIER_SIZE,
              left: magnifierState.x,
              top: magnifierState.y,
              backgroundImage: `url(${previewBackground})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${magnifierState.width * MAGNIFIER_SCALE}px ${magnifierState.height * MAGNIFIER_SCALE}px`,
              backgroundPosition: `-${magnifierState.bgX}px -${magnifierState.bgY}px`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
