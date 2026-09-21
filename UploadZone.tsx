// =============================================================================
// TaxAce Dashboard — Upload Zone Component
// Design: Warm cream with forest green accents, drag-and-drop CSV upload
// =============================================================================

import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";

interface UploadZoneProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export function UploadZone({ onFileUpload, isLoading }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileUpload(file);
    },
    [onFileUpload]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Welcome text */}
      <div className="text-center mb-10 max-w-xl">
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: "2rem",
            color: "oklch(0.22 0.07 155)",
            lineHeight: 1.2,
            marginBottom: "0.75rem",
          }}
        >
          Tax Preparation Dashboard
        </h2>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            color: "oklch(0.45 0.04 155)",
            fontSize: "1rem",
            lineHeight: 1.6,
          }}
        >
          Upload your Canopy report to instantly visualize where every client stands across all 23 workflow stages.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="upload-zone w-full max-w-lg rounded-2xl p-12 text-center cursor-pointer transition-all"
        style={{
          border: isDragOver
            ? "2px dashed oklch(0.28 0.07 155)"
            : "2px dashed oklch(0.70 0.05 155)",
          backgroundColor: isDragOver
            ? "oklch(0.94 0.03 155)"
            : "oklch(1 0 0)",
          boxShadow: isDragOver
            ? "0 8px 32px oklch(0.28 0.07 155 / 0.15)"
            : "0 2px 16px oklch(0.28 0.07 155 / 0.06)",
        }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2
              size={48}
              className="animate-spin"
              style={{ color: "oklch(0.28 0.07 155)" }}
            />
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                color: "oklch(0.35 0.07 155)",
              }}
            >
              Processing your Canopy report...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div
              className="flex items-center justify-center w-16 h-16 rounded-2xl"
              style={{ backgroundColor: "oklch(0.92 0.03 155)" }}
            >
              <FileSpreadsheet size={32} style={{ color: "oklch(0.28 0.07 155)" }} />
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "1.1rem",
                  color: "oklch(0.22 0.07 155)",
                  marginBottom: "0.35rem",
                }}
              >
                Drop your Canopy CSV here
              </p>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.875rem",
                  color: "oklch(0.52 0.04 155)",
                }}
              >
                or click the{" "}
                <span style={{ fontWeight: 600, color: "oklch(0.28 0.07 155)" }}>
                  Upload Report
                </span>{" "}
                button in the header
              </p>
            </div>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: "oklch(0.95 0.015 85)" }}
            >
              <Upload size={14} style={{ color: "oklch(0.52 0.04 155)" }} />
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.75rem",
                  color: "oklch(0.52 0.04 155)",
                }}
              >
                .csv files only
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {[
          { step: "1", title: "Export from Canopy", desc: "Run your task filter report and export as CSV" },
          { step: "2", title: "Upload the file", desc: "Drag & drop or click Upload Report in the header" },
          { step: "3", title: "View the pipeline", desc: "Instantly see all 23 workflow stages with client counts" },
        ].map((item) => (
          <div
            key={item.step}
            className="flex flex-col gap-2 p-4 rounded-xl"
            style={{ backgroundColor: "oklch(1 0 0)", border: "1px solid oklch(0.89 0.015 85)" }}
          >
            <div
              className="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold"
              style={{
                backgroundColor: "oklch(0.28 0.07 155)",
                color: "oklch(0.97 0.008 85)",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: "0.8rem",
              }}
            >
              {item.step}
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.875rem", color: "oklch(0.22 0.07 155)" }}>
              {item.title}
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "oklch(0.52 0.04 155)", lineHeight: 1.5 }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
