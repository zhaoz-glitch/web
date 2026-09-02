import { displayDimension, displayFieldLabel } from "~/lib/labels";
import type { Dimension, FilterState, FilterValue, CarbonDataMode } from "~/types";

interface Props {
  dimensions: Dimension[];
  filterState: FilterState;
  carbonMode: CarbonDataMode;
  onFilterChange: (key: string, value: FilterValue) => void;
  onCarbonModeChange: (mode: CarbonDataMode) => void;
  onReset: () => void;
  onRun: () => void;
  running: boolean;
}

function isRange(v: FilterValue): v is Extract<FilterValue, { kind: "range" }> {
  return v.kind === "range";
}

/** Human-readable label for a filter chip. */
export function describeFilter(key: string, value: FilterValue): string {
  if (isRange(value)) {
    const parts: string[] = [];
    if (value.min) parts.push(`≥ ${value.min}`);
    if (value.max) parts.push(`≤ ${value.max}`);
    return parts.join(" · ");
  }
  const opLabel: Record<string, string> = {
    ">": ">",
    "<": "<",
    ">=": "≥",
    "<=": "≤",
  };
  return `${opLabel[value.op] ?? value.op} ${value.value ?? ""}`;
}

export function FilterPanel({
  dimensions,
  filterState,
  carbonMode,
  onFilterChange,
  onCarbonModeChange,
  onReset,
  onRun,
  running,
}: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-emerald-900/30 dark:bg-[#0f1c18]">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-emerald-900/20">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Custom Filters</span>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onReset}
            className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-emerald-900/30 dark:text-gray-400 dark:hover:bg-emerald-950/20"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={running}
            className="whitespace-nowrap rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
          >
            {running ? "Screening…" : "Run Screen"}
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {dimensions.map((dim) => {
          const meta = displayDimension(dim);
          return (
          <div key={dim.key}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  dim.key === "market"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                }`}
              >
                {dim.key === "market" ? "A" : "B"}
              </span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{meta.label}</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {meta.frequency}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {dim.fields.map((field) => {
                // 跳过 has_carbon_data，它由下方的单选按钮控制
                if (field.key === "has_carbon_data") return null;
                const value = filterState[field.key];
                if (!value) return null;
                const checked = value.enabled;

                return (
                  <div
                    key={field.key}
                    className={`rounded-lg border p-2.5 transition ${
                      checked
                        ? "border-emerald-400 bg-emerald-50/30 dark:border-emerald-500/60 dark:bg-emerald-950/20"
                        : "border-gray-200 dark:border-emerald-900/25"
                    }`}
                  >
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          onFilterChange(field.key, {
                            ...value,
                            enabled: e.target.checked,
                          })
                        }
                        className="h-3.5 w-3.5 accent-emerald-600"
                      />
                      <span className="min-w-0 truncate font-medium text-gray-700 dark:text-gray-300">
                        {displayFieldLabel(field)}
                      </span>
                      {field.unit && (
                        <span className="text-gray-400 dark:text-gray-500">({field.unit})</span>
                      )}
                    </label>

                    {checked && (
                      isRange(value) ? (
                        <div className="mt-2 grid grid-cols-[1fr_20px_1fr] items-center gap-1.5">
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder={field.unit ? `Min (${field.unit})` : "Min"}
                            value={value.min ?? ""}
                            onChange={(e) =>
                              onFilterChange(field.key, {
                                ...value,
                                min: e.target.value,
                              })
                            }
                            className="block h-8 w-full rounded border border-gray-300 bg-white px-2 text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none dark:border-emerald-900/40 dark:bg-[#141f1c] dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-emerald-400"
                          />
                          <span className="block text-center text-[10px] text-gray-400 dark:text-gray-500">~</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder={field.unit ? `Max (${field.unit})` : "Max"}
                            value={value.max ?? ""}
                            onChange={(e) =>
                              onFilterChange(field.key, {
                                ...value,
                                max: e.target.value,
                              })
                            }
                            className="block h-8 w-full rounded border border-gray-300 bg-white px-2 text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none dark:border-emerald-900/40 dark:bg-[#141f1c] dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-emerald-400"
                          />
                        </div>
                      ) : (
                        <div className="mt-2 grid grid-cols-[3.5rem_1fr] items-center gap-1.5">
                          <select
                            value={value.op}
                            onChange={(e) =>
                              onFilterChange(field.key, {
                                ...value,
                                op: e.target.value,
                              })
                            }
                            className="block h-8 w-full rounded border border-gray-300 bg-white px-1 text-xs font-medium text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-emerald-900/40 dark:bg-[#141f1c] dark:text-gray-100 dark:focus:border-emerald-400"
                            aria-label="Operator"
                          >
                            {(field.ops ?? [">", "<", ">=", "<="]).map((op) => (
                              <option key={op} value={op}>
                                {op === ">" ? ">" : op === "<" ? "<" : op === ">=" ? "≥" : "≤"}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder={field.unit ? `Value (${field.unit})` : "Value"}
                            value={value.value ?? ""}
                            onChange={(e) =>
                              onFilterChange(field.key, {
                                ...value,
                                value: e.target.value,
                              })
                            }
                            className="block h-8 w-full rounded border border-gray-300 bg-white px-2 text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none dark:border-emerald-900/40 dark:bg-[#141f1c] dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-emerald-400"
                          />
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}

        {/* Carbon data availability filter */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-emerald-900/20 dark:bg-emerald-950/10">
          <span className="shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300">Carbon data:</span>
          {(
            [
              ["true", "With data"],
              ["false", "No data"],
              ["all", "All"],
            ] as const
          ).map(([mode, label]) => (
            <label key={mode} className="flex cursor-pointer items-center gap-1 text-xs">
              <input
                type="radio"
                name="carbon-mode"
                checked={carbonMode === mode}
                onChange={() => onCarbonModeChange(mode)}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              <span className="text-gray-600 dark:text-gray-400">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
