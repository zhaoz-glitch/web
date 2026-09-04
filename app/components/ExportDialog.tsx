import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  totalCount: number;
  selectedCount: number;
  onClose: () => void;
  onConfirm: (opts: { scope: "all" | "selected"; includeCharts: boolean }) => void;
}

export function ExportDialog({ open, totalCount, selectedCount, onClose, onConfirm }: Props) {
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [includeCharts, setIncludeCharts] = useState(false);

  useEffect(() => {
    if (open) {
      setScope(selectedCount > 0 ? "selected" : "all");
      setIncludeCharts(false);
    }
  }, [open, selectedCount]);

  if (!open) return null;

  const canExportSelected = selectedCount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="liquid-glass w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ ["--i" as string]: 0 } as React.CSSProperties}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-ink-200/60 px-6 py-4 dark:border-emerald-900/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/40">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </span>
              <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                Export Options
              </h3>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Choose what to include in the export.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tactile rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-emerald-950/30 dark:hover:text-gray-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Scope */}
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Export scope
            </div>
            <div className="space-y-2">
              <ScopeCard
                active={scope === "all"}
                title="All results"
                subtitle="Every stock matching the current filters"
                badge={`${totalCount} stocks`}
                disabled={totalCount === 0}
                onSelect={() => setScope("all")}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                }
              />
              <ScopeCard
                active={scope === "selected"}
                title="Selected only"
                subtitle="Just the stocks you ticked"
                badge={`${selectedCount} stocks`}
                disabled={!canExportSelected}
                onSelect={() => canExportSelected && setScope("selected")}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Charts toggle */}
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Output format
            </div>
            <label
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
              }}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-xl p-3",
                "border transition-all duration-200",
                includeCharts
                  ? "border-emerald-400 bg-emerald-50/50 shadow-sm shadow-emerald-500/10 dark:border-emerald-500/60 dark:bg-emerald-950/20"
                  : "border-ink-200/80 bg-white/60 hover:border-emerald-300 dark:border-emerald-900/40 dark:bg-[#0d1714]/60 dark:hover:border-emerald-700",
              ].join(" ")}
            >
              <span className="relative mt-0.5 inline-flex">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-ink-200 bg-white accent-emerald-600 transition checked:border-emerald-500 checked:bg-emerald-500 dark:border-emerald-900/40 dark:bg-[#0d1714] dark:checked:border-emerald-400 dark:checked:bg-emerald-400"
                />
                <svg
                  aria-hidden
                  className="pointer-events-none absolute inset-0 m-auto h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100 dark:text-emerald-950"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Include 5-Year Carbon Trend charts
                  </span>
                  <span
                    className={[
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                      includeCharts
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-500 dark:bg-emerald-950/30 dark:text-gray-400",
                    ].join(" ")}
                  >
                    {includeCharts ? "ZIP" : "CSV"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  ZIP = CSV + chart images, CSV = plain tabular data only.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-ink-200/60 bg-gray-50/60 px-6 py-4 dark:border-emerald-900/30 dark:bg-emerald-950/10">
          <button
            type="button"
            onClick={onClose}
            className="tactile rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-700 dark:border-emerald-900/40 dark:text-gray-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm({ scope, includeCharts });
              onClose();
            }}
            className="tactile inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:from-emerald-600 hover:to-teal-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export {includeCharts ? "ZIP" : "CSV"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ScopeCardProps {
  active: boolean;
  title: string;
  subtitle: string;
  badge: string;
  disabled: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
}

function ScopeCard({ active, title, subtitle, badge, disabled, onSelect, icon }: ScopeCardProps) {
  return (
    <label
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      onClick={() => !disabled && onSelect()}
      className={[
        "spotlight-card tactile flex cursor-pointer items-center gap-3 rounded-xl p-3",
        "border transition-all duration-200",
        disabled
          ? "cursor-not-allowed border-ink-200/60 bg-gray-50/40 opacity-50 dark:border-emerald-900/20 dark:bg-[#0d1714]/40"
          : active
            ? "border-emerald-400 bg-emerald-50/60 shadow-sm shadow-emerald-500/10 dark:border-emerald-500/60 dark:bg-emerald-950/20"
            : "border-ink-200/80 bg-white/60 hover:border-emerald-300 dark:border-emerald-900/40 dark:bg-[#0d1714]/60 dark:hover:border-emerald-700",
      ].join(" ")}
    >
      <input
        type="radio"
        name="export-scope"
        checked={active}
        disabled={disabled}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors",
          active
            ? "bg-emerald-500 text-white ring-emerald-500"
            : "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800/40",
        ].join(" ")}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</span>
          <span
            className={[
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
              active
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-500 dark:bg-emerald-950/30 dark:text-gray-400",
            ].join(" ")}
          >
            {badge}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
      {active && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </label>
  );
}