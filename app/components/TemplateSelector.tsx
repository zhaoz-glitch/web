import { displayTemplate } from "~/lib/labels";
import type { Template } from "~/types";

interface Props {
  templates: Template[];
  activeTemplateId: number | null;
  onSelect: (template: Template) => void;
}

export function TemplateSelector({ templates, activeTemplateId, onSelect }: Props) {
  if (templates.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-emerald-900/30 dark:bg-[#0f1c18]">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Preset Screens</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">One-click filter sets</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {templates.map((tpl) => {
          const active = activeTemplateId === tpl.id;
          const copy = displayTemplate(tpl);
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelect(tpl)}
              className={`rounded-lg border p-3 text-left transition ${
                active
                  ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30 dark:border-emerald-400 dark:bg-emerald-950/30 dark:ring-emerald-400/20"
                  : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-emerald-900/25 dark:bg-[#131f1b]/60 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {copy.name}
                </span>
                {active && (
                  <span className="shrink-0 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-emerald-400 dark:text-emerald-950">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                {copy.description}
              </p>
              <p className="mt-1 truncate text-[11px] text-emerald-700 dark:text-emerald-400">{copy.use_case}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
