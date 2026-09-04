import { displayTemplate } from "~/lib/labels";
import type { Template } from "~/types";

interface Props {
  templates: Template[];
  activeTemplateIds: number[];
  onToggle: (template: Template) => void;
}

/** Pre-defined glyph + ring colour per preset category — used both
 * for the icon and to colour the active-state glow. */
function templateAccent(tpl: Template): {
  icon: React.ReactNode;
  ring: string;
  chip: string;
  glow: string;
} {
  const k = (tpl.name ?? "").toLowerCase();
  if (k.includes("value") || k.includes("dividend") || k.includes("yield")) {
    return {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      ring: "ring-emerald-300/60 dark:ring-emerald-500/40",
      chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
      glow: "from-emerald-400/20 via-teal-300/15",
    };
  }
  if (k.includes("carbon") || k.includes("esg") || k.includes("green") || k.includes("climate")) {
    return {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      ),
      ring: "ring-lime-300/60 dark:ring-lime-500/40",
      chip: "bg-lime-50 text-lime-700 dark:bg-lime-950/60 dark:text-lime-300",
      glow: "from-lime-400/25 via-emerald-300/15",
    };
  }
  if (k.includes("growth") || k.includes("momentum")) {
    return {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17 9 11l4 4 8-8" />
          <path d="M14 7h7v7" />
        </svg>
      ),
      ring: "ring-sky-300/60 dark:ring-sky-500/40",
      chip: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
      glow: "from-sky-400/20 via-cyan-300/15",
    };
  }
  // Default
  return {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a9 9 0 1 0 9 9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
    ring: "ring-teal-300/60 dark:ring-teal-500/40",
    chip: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
    glow: "from-teal-400/20 via-emerald-300/15",
  };
}

export function TemplateSelector({ templates, activeTemplateIds, onToggle }: Props) {
  if (templates.length === 0) return null;

  return (
    <section
      aria-label="Preset screens"
      className="liquid-glass p-4 sm:p-5"
    >
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Preset Screens
          </h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            One-click filter sets
          </span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {templates.length} available
        </span>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {templates.map((tpl, idx) => {
          const active = activeTemplateIds.includes(tpl.id);
          const copy = displayTemplate(tpl);
          const accent = templateAccent(tpl);

          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onToggle(tpl)}
              style={{ ["--i" as string]: idx }}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
              }}
              className={[
                "tactile group rise-in spotlight-card relative overflow-hidden",
                "rounded-xl p-3 text-left",
                "border transition-all duration-300",
                active
                  ? `border-emerald-400/70 bg-emerald-50/60 dark:border-emerald-400/60 dark:bg-emerald-950/30 ${accent.ring} ring-1`
                  : "border-ink-200/70 bg-white/60 hover:border-emerald-300 dark:border-emerald-900/30 dark:bg-[#0f1c18]/60 dark:hover:border-emerald-500/60",
              ].join(" ")}
            >
              {/* Active-state ambient glow that breathes behind the card. */}
              {active && (
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -inset-px -z-10 bg-gradient-to-br ${accent.glow} to-transparent opacity-90 blur-xl`}
                />
              )}

              <div className="flex items-start justify-between gap-2">
                <div
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    active
                      ? `${accent.chip}`
                      : "bg-gray-100 text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 dark:bg-emerald-950/30 dark:text-gray-400 dark:group-hover:bg-emerald-950/50 dark:group-hover:text-emerald-300",
                  ].join(" ")}
                >
                  {accent.icon}
                </div>
                {active && (
                  <span className="chip-emerald shrink-0 text-[10px]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Active
                  </span>
                )}
              </div>

              <div className="mt-2.5 min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {copy.name}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {copy.description}
                </p>
                <p className="mt-1 truncate text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  {copy.use_case}
                </p>
              </div>

              {/* Tiny chevron that nudges on hover */}
              <svg
                aria-hidden
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={[
                  "absolute bottom-2.5 right-2.5 transition-transform duration-300",
                  active
                    ? "translate-x-0 text-emerald-600 dark:text-emerald-300"
                    : "text-gray-300 group-hover:translate-x-0.5 group-hover:text-emerald-500 dark:text-gray-600",
                ].join(" ")}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          );
        })}
      </div>
    </section>
  );
}