import { useMemo, useRef, useState, type MouseEvent } from "react";
import { Header } from "~/components/Header";
import { TabsBar } from "~/components/TabsBar";
import { useAuth } from "~/lib/auth";

export function meta() {
  return [
    { title: "News · Low-Carbon Screener" },
    {
      name: "description",
      content:
        "Curated ESG, climate disclosure and low-carbon investment updates.",
    },
  ];
}

type Category = "Regulation" | "Market" | "Science" | "Disclosure";

interface NewsItem {
  id: string;
  date: string; // ISO yyyy-mm-dd
  category: Category;
  source: string;
  title: string;
  summary: string;
  url: string;
}

// Curated ESG / low-carbon investment headlines. Hand-picked links so we
// stay away from paywalled or short-lived sources that will rot quickly.
const NEWS_ITEMS: NewsItem[] = [
  {
    id: "sec-climate-rule",
    date: "2026-08-12",
    category: "Regulation",
    source: "U.S. SEC",
    title:
      "SEC adopts amendments to modernize Regulation S-K climate disclosures",
    summary:
      "Public companies must now disclose material climate risks, Scope 1 & 2 emissions and the financial effects of severe weather events in their 10-K filings, with phased compliance starting the largest accelerated filers in FY2026.",
    url: "https://www.sec.gov/rules/final/2024/33-11275.pdf",
  },
  {
    id: "iigcc-netzero",
    date: "2026-07-30",
    category: "Market",
    source: "IIGCC",
    title: "Net Zero Stewardship Toolkit 2.0 released for asset managers",
    summary:
      "The Institutional Investors Group on Climate Change refreshes its engagement framework, adding sector-specific escalation paths for high-emitters and a new biodiversity indicator alongside the existing net-zero scorecard.",
    url: "https://www.iigcc.org/",
  },
  {
    id: "msci-carbon-premium",
    date: "2026-07-04",
    category: "Market",
    source: "MSCI",
    title: "Carbon-efficient equity indices outperform broad market by 3.2% YTD",
    summary:
      "MSCI's quarterly rebalance notes that indices tilting toward low carbon intensity and high improvement-to-target scores continued to lead year-to-date, driven by energy, materials and utilities exclusions.",
    url: "https://www.msci.com/climate-change-solutions",
  },
  {
    id: "tcfd-status",
    date: "2026-06-18",
    category: "Disclosure",
    source: "TCFD / IFRS Foundation",
    title: "ISSB IFRS S2 climate disclosures effective in 30+ jurisdictions",
    summary:
      "More than thirty jurisdictions have now mandated or allowed use of IFRS S2 (the climate sibling of IFRS S1). Reporting preparers can drop legacy TCFD-aligned reports and consolidate on the ISSB baseline starting FY2026.",
    url: "https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/ifrs-s2-climate-related-disclosures/",
  },
  {
    id: "cbam-phase2",
    date: "2026-05-22",
    category: "Regulation",
    source: "European Commission",
    title:
      "EU CBAM enters Phase 2 — quarterly embedded-emission reporting now binding",
    summary:
      "The Carbon Border Adjustment Mechanism's transitional phase ends; importers of steel, aluminium, cement, fertilisers, electricity and hydrogen must now file quarterly CBAM reports with verified embedded carbon.",
    url: "https://ec.europa.eu/taxation_customs/green-taxation-0/carbon-border-adjustment-mechanism_en",
  },
  {
    id: "ipcc-ar7-srccf",
    date: "2026-04-09",
    category: "Science",
    source: "IPCC",
    title:
      "IPCC AR7 Special Report on Cities, Fast Fashion and Food published",
    summary:
      "Working Group III flags three high-leverage mitigation levers — compact urban form, circular textiles, and dietary shifts — and estimates a 30-50% emissions reduction potential across sectors by 2050 if pursued jointly.",
    url: "https://www.ipcc.ch/",
  },
];

// Subtle category accents. Green remains the dominant brand colour; the
// per-category tints only show up on a single chip + the featured hero
// ribbon so the page reads as one palette at a glance.
const CATEGORY_STYLE: Record<Category, {
  chip: string;
  dot: string;
  heroFrom: string;
  heroTo: string;
  ring: string;
}> = {
  Regulation: {
    chip:
      "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/60",
    dot: "bg-amber-500 dark:bg-amber-400",
    heroFrom: "from-amber-500/15",
    heroTo: "to-emerald-500/15",
    ring: "ring-amber-200/60 dark:ring-amber-800/40",
  },
  Market: {
    chip:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/60",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    heroFrom: "from-emerald-500/15",
    heroTo: "to-cyan-500/15",
    ring: "ring-emerald-200/60 dark:ring-emerald-800/40",
  },
  Science: {
    chip:
      "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800/60",
    dot: "bg-sky-500 dark:bg-sky-400",
    heroFrom: "from-sky-500/15",
    heroTo: "to-emerald-500/15",
    ring: "ring-sky-200/60 dark:ring-sky-800/40",
  },
  Disclosure: {
    chip:
      "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800/60",
    dot: "bg-violet-500 dark:bg-violet-400",
    heroFrom: "from-violet-500/15",
    heroTo: "to-emerald-500/15",
    ring: "ring-violet-200/60 dark:ring-violet-800/40",
  },
};

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function readMinutes(text: string): string {
  // Crude but useful — 200 wpm.
  const words = text.split(/\s+/).length;
  const m = Math.max(1, Math.round(words / 200));
  return `${m} min read`;
}

type Filter = "All" | Category;
const FILTERS: Filter[] = ["All", "Regulation", "Market", "Science", "Disclosure"];

interface CardProps {
  item: NewsItem;
  index: number;
  featured?: boolean;
  onPointer: (e: MouseEvent<HTMLElement>) => void;
}

/**
 * Single news card. Featured variant gets a coloured gradient ribbon
 * and bigger title; both variants share the spotlight-border hover
 * effect driven by the parent.
 */
function NewsCard({ item, index, featured, onPointer }: CardProps) {
  const style = CATEGORY_STYLE[item.category];
  const meta = `${item.source} · ${formatDate(item.date)} · ${readMinutes(item.title + " " + item.summary)}`;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer noopener"
      onMouseMove={onPointer}
      style={{ ["--i" as string]: index } as React.CSSProperties}
      className={[
        "spotlight-card rise-in group relative block overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 transition-transform duration-300 ease-out hover:-translate-y-0.5 dark:bg-[#0f1c18] dark:ring-emerald-900/30",
        featured
          ? `p-6 sm:p-7 bg-gradient-to-br ${style.heroFrom} ${style.heroTo} ring-1 ${style.ring}`
          : "p-5",
      ].join(" ")}
    >
      {/* Featured ribbon */}
      {featured && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm dark:bg-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Featured
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-800/80 dark:text-emerald-200/70">
            Latest
          </span>
        </div>
      )}

      {/* Category + date row */}
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${style.chip}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          {item.category}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{meta}</span>
      </div>

      {/* Title */}
      <h3
        className={
          featured
            ? "text-xl font-semibold leading-snug text-gray-900 transition-colors group-hover:text-emerald-700 sm:text-2xl dark:text-gray-100 dark:group-hover:text-emerald-300"
            : "text-base font-semibold leading-snug text-gray-900 transition-colors group-hover:text-emerald-700 dark:text-gray-100 dark:group-hover:text-emerald-300"
        }
      >
        {item.title}
      </h3>

      {/* Summary */}
      <p
        className={
          featured
            ? "mt-3 max-w-[65ch] text-[15px] leading-relaxed text-gray-700 dark:text-gray-300"
            : "mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
        }
      >
        {item.summary}
      </p>

      {/* Read-source CTA */}
      <div className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        Read source
        <svg
          className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 17 17 7" />
          <path d="M7 7h10v10" />
        </svg>
      </div>
    </a>
  );
}

export default function NewsPage() {
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState<Filter>("All");
  const cardRef = useRef<HTMLDivElement>(null);

  // Filter + sort newest first.
  const items = useMemo(() => {
    const list = filter === "All"
      ? NEWS_ITEMS
      : NEWS_ITEMS.filter((i) => i.category === filter);
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [filter]);

  const [featured, ...rest] = items;

  // Update CSS custom props so the spotlight border tracks the cursor.
  const onPointerMove = (e: MouseEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    target.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    target.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a1512]">
      <Header userName={user?.name} onLogout={logout} />
      <TabsBar />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {/* Title block */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-[28px] dark:text-gray-100">
              Low-carbon investing briefing
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Curated by the Low-Carbon Screener team · {NEWS_ITEMS.length}{" "}
              headlines, refreshed manually.
            </p>
          </div>
          <div className="shimmer relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
              Last curated · Sep 4, 2026
            </span>
          </div>
        </header>

        {/* Category filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const active = f === filter;
            const tone = f === "All" ? null : CATEGORY_STYLE[f];
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all duration-200",
                  active
                    ? "bg-emerald-600 text-white shadow-sm ring-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:ring-emerald-500"
                    : `bg-white text-gray-700 ring-gray-200 hover:ring-emerald-300 hover:text-emerald-700 dark:bg-[#0f1c18] dark:text-gray-300 dark:ring-emerald-900/30 dark:hover:ring-emerald-700 dark:hover:text-emerald-300 ${tone?.chip ?? ""}`,
                ].join(" ")}
              >
                {f !== "All" && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white/80" : CATEGORY_STYLE[f].dot}`}
                  />
                )}
                {f}
              </button>
            );
          })}
        </div>

        {/* Featured + grid */}
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500 dark:border-emerald-900/30 dark:bg-[#0f1c18] dark:text-gray-400">
            <p className="font-medium text-gray-700 dark:text-gray-200">
              No stories in this category yet.
            </p>
            <p className="mt-1 text-xs">
              Switch back to <em>All</em> to see the rest of the briefing.
            </p>
          </div>
        ) : (
          <div ref={cardRef} className="space-y-5">
            {featured && (
              <NewsCard item={featured} index={0} featured onPointer={onPointerMove} />
            )}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {rest.map((item, idx) => (
                  <NewsCard
                    key={item.id}
                    item={item}
                    index={idx + 1}
                    onPointer={onPointerMove}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <footer className="pb-6 pt-2 text-center text-xs text-gray-400 dark:text-gray-500">
          MVP · For research only, not investment advice
        </footer>
      </main>
    </div>
  );
}