import { useState } from "react";

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

  if (!open) return null;

  const canExportSelected = selectedCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-emerald-900/40 dark:bg-[#0f1c18]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Export Options
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Choose what to include in the export.
        </p>

        <div className="mt-5 space-y-4">
          {/* Scope */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Export scope
            </label>
            <div className="mt-2 space-y-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition hover:bg-gray-50 dark:border-emerald-900/30 dark:hover:bg-emerald-950/20">
                <input
                  type="radio"
                  name="export-scope"
                  value="all"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  All results ({totalCount} stocks)
                </span>
              </label>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition ${
                  canExportSelected
                    ? "border-gray-200 hover:bg-gray-50 dark:border-emerald-900/30 dark:hover:bg-emerald-950/20"
                    : "cursor-not-allowed border-gray-100 opacity-50 dark:border-emerald-900/20"
                }`}
              >
                <input
                  type="radio"
                  name="export-scope"
                  value="selected"
                  checked={scope === "selected"}
                  onChange={() => canExportSelected && setScope("selected")}
                  disabled={!canExportSelected}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Selected only ({selectedCount} stocks)
                </span>
              </label>
            </div>
          </div>

          {/* Charts toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition hover:bg-gray-50 dark:border-emerald-900/30 dark:hover:bg-emerald-950/20">
            <input
              type="checkbox"
              checked={includeCharts}
              onChange={(e) => setIncludeCharts(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-emerald-800"
            />
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Include 5-Year Carbon Trend charts
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Exports as a ZIP file containing CSV + chart images
              </p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-emerald-900/30 dark:text-gray-300 dark:hover:bg-emerald-950/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm({ scope, includeCharts });
              onClose();
            }}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
