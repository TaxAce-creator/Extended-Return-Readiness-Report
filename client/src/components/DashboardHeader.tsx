// =============================================================================
// TaxAce Dashboard — Header Component v2
// Design: Deep forest green header with Playfair Display branding
// Tier 2: Richer gradient, animated status badge, improved layout
// =============================================================================

import { Upload, RefreshCw, Wifi, WifiOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  onUploadClick: () => void;
  lastUpdated?: Date;
  hasData: boolean;
  syncSource?: "zapier" | "manual" | null;
  onRefresh?: () => void;
}

export function DashboardHeader({ onUploadClick, lastUpdated, hasData, syncSource, onRefresh }: DashboardHeaderProps) {
  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <header
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, oklch(0.19 0.07 155) 0%, oklch(0.26 0.08 155) 50%, oklch(0.32 0.07 155) 100%)",
        boxShadow: "0 4px 32px oklch(0.18 0.07 155 / 0.5), 0 1px 0 oklch(0.40 0.08 155 / 0.3)",
      }}
    >
      {/* Subtle grid texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(oklch(0.55 0.05 155 / 0.06) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0.55 0.05 155 / 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Radial glow top-right */}
      <div
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: "360px",
          height: "100%",
          background: "radial-gradient(ellipse at top right, oklch(0.75 0.14 75 / 0.12) 0%, transparent 70%)",
        }}
      />

      <div className="container relative z-10 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-4">
            {/* Logo mark */}
            <div
              className="relative flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
              style={{
                background: "linear-gradient(135deg, oklch(0.75 0.14 75), oklch(0.68 0.16 65))",
                boxShadow: "0 2px 12px oklch(0.75 0.14 75 / 0.45), inset 0 1px 0 oklch(1 0 0 / 0.25)",
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "oklch(0.18 0.04 155)",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                TA
              </span>
              {/* Sparkle accent */}
              <Sparkles
                size={10}
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  color: "oklch(0.75 0.14 75)",
                  filter: "drop-shadow(0 0 4px oklch(0.75 0.14 75))",
                }}
              />
            </div>

            <div>
              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "oklch(0.97 0.008 85)",
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                }}
              >
                TaxAce Group
              </h1>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: "0.72rem",
                  color: "oklch(0.72 0.06 155)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginTop: "1px",
                }}
              >
                Tax Prep Operations Dashboard
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2.5">
            {/* Zapier sync status badge */}
            {syncSource === "zapier" && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: "oklch(0.32 0.08 155)",
                  border: "1px solid oklch(0.45 0.08 155)",
                  boxShadow: "0 0 0 3px oklch(0.45 0.08 155 / 0.2)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: "oklch(0.75 0.14 75)",
                    boxShadow: "0 0 6px oklch(0.75 0.14 75)",
                    animation: "pulse 2s ease-in-out infinite",
                  }}
                />
                <Wifi size={11} style={{ color: "oklch(0.75 0.14 75)" }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "oklch(0.85 0.06 155)", fontWeight: 500 }}>
                  Auto-synced via Zapier
                </span>
              </div>
            )}
            {syncSource === "manual" && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: "oklch(0.28 0.04 85)", border: "1px solid oklch(0.42 0.04 85)" }}
              >
                <WifiOff size={11} style={{ color: "oklch(0.72 0.06 85)" }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "oklch(0.78 0.04 85)", fontWeight: 500 }}>
                  Manual upload
                </span>
              </div>
            )}

            {lastUpdated && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ color: "oklch(0.68 0.05 155)" }}
              >
                <RefreshCw size={11} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem" }}>
                  {formatDate(lastUpdated)}
                </span>
              </div>
            )}

            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Refresh from database"
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                style={{
                  color: "oklch(0.72 0.05 155)",
                  backgroundColor: "oklch(0.32 0.06 155 / 0.6)",
                  border: "1px solid oklch(0.42 0.06 155 / 0.5)",
                }}
              >
                <RefreshCw size={14} />
              </button>
            )}

            <button
              onClick={onUploadClick}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all"
              style={{
                background: "linear-gradient(135deg, oklch(0.75 0.14 75), oklch(0.68 0.16 65))",
                color: "oklch(0.18 0.04 155)",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "0.82rem",
                border: "none",
                boxShadow: "0 2px 10px oklch(0.75 0.14 75 / 0.45), inset 0 1px 0 oklch(1 0 0 / 0.2)",
              }}
            >
              <Upload size={14} />
              {hasData ? "Upload New Report" : "Upload Report"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
