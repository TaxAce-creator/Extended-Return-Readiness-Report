// =============================================================================
// TaxAce — Import Data Page
// Dedicated page for CSV upload and Zapier sync configuration
// =============================================================================

import { useRef } from "react";
import { Upload, Zap, FileText, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface ImportPageProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  hasData: boolean;
  syncSource: "zapier" | "manual" | null;
  lastUpdated?: Date;
  onRefresh: () => void;
}

export function ImportPage({
  onFileUpload,
  isLoading,
  hasData,
  syncSource,
  lastUpdated,
  onRefresh,
}: ImportPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("drag-over");
  };

  return (
    <div className="space-y-6 fade-in-up max-w-3xl">
      {/* Page header */}
      <div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: "1.6rem",
            color: "oklch(0.22 0.07 155)",
            lineHeight: 1.2,
            marginBottom: "0.35rem",
          }}
        >
          Import Data
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.9rem",
            color: "oklch(0.52 0.04 155)",
          }}
        >
          Upload a Canopy task export CSV or configure Zapier for automatic syncing.
        </p>
      </div>

      {/* Current data status */}
      {hasData && (
        <div
          className="flex items-center justify-between px-5 py-4 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, oklch(0.95 0.03 155), oklch(0.97 0.015 155))",
            border: "1px solid oklch(0.85 0.03 155)",
          }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} style={{ color: "oklch(0.35 0.12 155)" }} />
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "oklch(0.28 0.07 155)",
                }}
              >
                Data loaded
                {syncSource === "zapier" && (
                  <span
                    className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: "oklch(0.75 0.14 75 / 0.15)",
                      color: "oklch(0.55 0.12 75)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                    }}
                  >
                    <Zap size={10} />
                    Zapier
                  </span>
                )}
              </p>
              {lastUpdated && (
                <p
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.72rem",
                    color: "oklch(0.52 0.04 155)",
                  }}
                >
                  Last updated: {lastUpdated.toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.8rem",
              fontWeight: 500,
              backgroundColor: "oklch(0.28 0.07 155)",
              color: "oklch(0.97 0.008 85)",
              boxShadow: "0 2px 8px oklch(0.28 0.07 155 / 0.3)",
            }}
          >
            <RefreshCw size={14} />
            Refresh from DB
          </button>
        </div>
      )}

      {/* Upload zone */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "oklch(1 0 0)",
          border: "1px solid oklch(0.89 0.015 85)",
          boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06)",
        }}
      >
        {/* Section header */}
        <div
          className="px-5 py-4 flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, oklch(0.97 0.010 155), oklch(0.99 0.005 85))",
            borderBottom: "1px solid oklch(0.91 0.012 85)",
          }}
        >
          <Upload size={15} style={{ color: "oklch(0.45 0.06 155)" }} />
          <h2
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: "0.85rem",
              color: "oklch(0.28 0.07 155)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Manual CSV Upload
          </h2>
        </div>

        <div className="p-6">
          {/* Drop zone */}
          <div
            className="upload-zone rounded-2xl p-10 text-center cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload(file);
                e.target.value = "";
              }}
            />

            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.35 0.08 155))",
                  }}
                >
                  <RefreshCw size={22} color="oklch(0.75 0.14 75)" className="animate-spin" />
                </div>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    color: "oklch(0.35 0.07 155)",
                  }}
                >
                  Parsing your CSV…
                </p>
              </div>
            ) : (
              <>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.35 0.08 155))",
                    boxShadow: "0 4px 16px oklch(0.28 0.07 155 / 0.3)",
                  }}
                >
                  <FileText size={24} color="oklch(0.75 0.14 75)" />
                </div>
                <p
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 700,
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
                    fontSize: "0.85rem",
                    color: "oklch(0.52 0.04 155)",
                    marginBottom: "1.25rem",
                  }}
                >
                  or click to browse — .csv files only
                </p>
                <span
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.22 0.07 155))",
                    color: "oklch(0.97 0.008 85)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    boxShadow: "0 3px 12px oklch(0.28 0.07 155 / 0.35)",
                  }}
                >
                  <Upload size={15} />
                  Choose File
                </span>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                step: "1",
                title: "Export from Canopy",
                desc: "Go to Tasks → Filter → Export as CSV",
              },
              {
                step: "2",
                title: "Upload the file",
                desc: "Drag & drop or click the upload zone above",
              },
              {
                step: "3",
                title: "View your pipeline",
                desc: "All 23 stages populate instantly",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{
                  backgroundColor: "oklch(0.975 0.008 155)",
                  border: "1px solid oklch(0.91 0.012 155)",
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    backgroundColor: "oklch(0.28 0.07 155)",
                    color: "oklch(0.75 0.14 75)",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                  }}
                >
                  {s.step}
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      color: "oklch(0.28 0.07 155)",
                    }}
                  >
                    {s.title}
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.72rem",
                      color: "oklch(0.52 0.04 155)",
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zapier auto-sync section */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "oklch(1 0 0)",
          border: "1px solid oklch(0.89 0.015 85)",
          boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06)",
        }}
      >
        <div
          className="px-5 py-4 flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, oklch(0.97 0.04 75), oklch(0.99 0.02 75))",
            borderBottom: "1px solid oklch(0.91 0.012 85)",
          }}
        >
          <Zap size={15} style={{ color: "oklch(0.58 0.14 75)" }} />
          <h2
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: "0.85rem",
              color: "oklch(0.45 0.10 75)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Zapier Auto-Sync
          </h2>
          <span
            className="ml-auto px-2 py-0.5 rounded-md"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.65rem",
              fontWeight: 700,
              backgroundColor: "oklch(0.75 0.14 75 / 0.15)",
              color: "oklch(0.55 0.12 75)",
            }}
          >
            CONFIGURED
          </span>
        </div>

        <div className="p-6 space-y-4">
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.875rem",
              color: "oklch(0.45 0.04 155)",
              lineHeight: 1.6,
            }}
          >
            Your Zapier webhook is active. When Canopy sends an email report, Zapier parses the CSV attachment and POSTs it to this dashboard automatically — no manual upload needed.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                icon: <CheckCircle2 size={16} />,
                title: "Webhook active",
                desc: "POST /api/canopy/zapier-webhook",
                ok: true,
              },
              {
                icon: <CheckCircle2 size={16} />,
                title: "Database persistence",
                desc: "Reports survive page refresh",
                ok: true,
              },
              {
                icon: <AlertCircle size={16} />,
                title: "Email trigger",
                desc: "Configure in your Zapier zap",
                ok: false,
              },
              {
                icon: <AlertCircle size={16} />,
                title: "Canopy export schedule",
                desc: "Set up recurring export in Canopy",
                ok: false,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{
                  backgroundColor: item.ok ? "oklch(0.96 0.025 155)" : "oklch(0.97 0.015 75)",
                  border: `1px solid ${item.ok ? "oklch(0.88 0.03 155)" : "oklch(0.90 0.04 75)"}`,
                }}
              >
                <span style={{ color: item.ok ? "oklch(0.35 0.12 155)" : "oklch(0.58 0.14 75)", marginTop: "1px" }}>
                  {item.icon}
                </span>
                <div>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      color: "oklch(0.28 0.07 155)",
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "0.68rem",
                      color: "oklch(0.52 0.04 155)",
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
