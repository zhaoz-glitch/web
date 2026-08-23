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
    return parts.join(" 且 ");
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
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="text-sm font-semibold text-gray-900">自定义筛选条件</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            重置
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={running}
            className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {running ? "筛选中…" : "执行筛选"}
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {dimensions.map((dim) => (
          <div key={dim.key}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  dim.key === "market"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {dim.key === "market" ? "维度A" : "维度B"}
              </span>
              <span className="text-xs font-medium text-gray-700">{dim.label}</span>
              <span className="text-[10px] text-gray-400">
                {dim.update_frequency}
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
                        ? "border-emerald-400 bg-emerald-50/30"
                        : "border-gray-200"
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
                      <span className="font-medium text-gray-700">
                        {field.label}
                      </span>
                      {field.unit && (
                        <span className="text-gray-400">({field.unit})</span>
                      )}
                    </label>

                    {checked && (
                      <div className="mt-2 flex items-stretch gap-1.5">
                        {isRange(value) ? (
                          <>
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder={String(field.min ?? "min")}
                              value={value.min ?? ""}
                              onChange={(e) =>
                                onFilterChange(field.key, {
                                  ...value,
                                  min: e.target.value,
                                })
                              }
                              className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                            />
                            <span className="self-center text-[10px] text-gray-400">~</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder={String(field.max ?? "max")}
                              value={value.max ?? ""}
                              onChange={(e) =>
                                onFilterChange(field.key, {
                                  ...value,
                                  max: e.target.value,
                                })
                              }
                              className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                            />
                          </>
                        ) : (
                          <>
                            <select
                              value={value.op}
                              onChange={(e) =>
                                onFilterChange(field.key, {
                                  ...value,
                                  op: e.target.value,
                                })
                              }
                              className="shrink-0 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium focus:border-emerald-500 focus:outline-none"
                              aria-label="运算符"
                            >
                              {(field.ops ?? [">", "<", ">=", "<="]).map((op) => (
                                <option key={op} value={op}>
                                  {op === ">" ? ">" : op === "<" ? "<" : op === ">=" ? "≥" : "≤"}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder={`输入数值${field.unit ? ` (${field.unit})` : ""}`}
                              value={value.value ?? ""}
                              onChange={(e) =>
                                onFilterChange(field.key, {
                                  ...value,
                                  value: e.target.value,
                                })
                              }
                              className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Carbon data availability filter */}
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2.5">
          <span className="text-xs font-medium text-gray-700">碳数据覆盖：</span>
          {(
            [
              ["true", "仅含碳数据标的"],
              ["false", "仅无碳数据标的"],
              ["all", "全部"],
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
              <span className="text-gray-600">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
