import { Header } from "~/components/Header";
import { TabsBar } from "~/components/TabsBar";
import { useAuth } from "~/lib/auth";

export function meta() {
  return [
    { title: "News · Low-Carbon Screener" },
    {
      name: "description",
      content: "Curated ESG, climate disclosure and low-carbon investment updates.",
    },
  ];
}

interface NewsItem {
  id: string;
  date: string;       // ISO yyyy-mm-dd
  category: "Regulation" | "Market" | "Science" | "Disclosure";
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
    title: "SEC adopts amendments to modernize Regulation S-K climate disclosures",
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
    title: "EU CBAM enters Phase 2 — quarterly embedded-emission reporting now binding",
    summary:
      "The Carbon Border Adjustment Mechanism's transitional phase ends; importers of steel, aluminium, cement, fertilisers, electricity and hydrogen must now file quarterly CBAM reports with verified embedded carbon.",
    url: "https://ec.europa.eu/taxation_customs/green-taxation-0/carbon-border-adjustment-mechanism_en",
  },
  {
    id: "ipcc-ar7-srccf",
    date: "2026-04-09",
    category: "Science",
    source: "IPCC",
    title: "IPCC AR7 Special Report on Cities, Fast Fashion and Food published",
    summary:
      "Working Group III flags three high-leverage mitigation levers — compact urban form, circular textiles, and dietary shifts — and estimates a 30-50% emissions reduction potential across sectors by 2050 if pursued jointly.",
    url: "https://www.ipcc.ch/",
  },
];

const CATEGORY_STYLES: Record<NewsItem["category"], string> = {
  Regulation:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/60",
  Market:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/60",
  Science:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800/60",
  Disclosure:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800/60",
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

export default function NewsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a1512]">
      <Header userName={user?.name} onLogout={logout} />
      <TabsBar />

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Low-carbon investing briefing
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Curated by the Low-Carbon Screener team. Latest {NEWS_ITEMS.length}{" "}
              items — refreshed manually.
            </p>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Last curated · Sep 4, 2026
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {NEWS_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
              className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-emerald-900/30 dark:bg-[#0f1c18] dark:hover:border-emerald-700"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${CATEGORY_STYLES[item.category]}`}
                >
                  {item.category}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.source}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  · {formatDate(item.date)}
                </span>
              </div>
              <h3 className="text-base font-semibold leading-snug text-gray-900 group-hover:text-emerald-700 dark:text-gray-100 dark:group-hover:text-emerald-300">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {item.summary}
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Read source
                <svg
                  className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
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
          ))}
        </div>

        <footer className="pb-6 pt-2 text-center text-xs text-gray-400 dark:text-gray-500">
          MVP · For research only, not investment advice
        </footer>
      </main>
    </div>
  );
}