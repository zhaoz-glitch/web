import { NavLink } from "react-router";

interface TabSpec {
  to: string;
  label: string;
  end?: boolean;
}

const TABS: TabSpec[] = [
  { to: "/", label: "Screener", end: true },
  { to: "/news", label: "News" },
];

/**
 * Horizontal tab bar shown above the main content on tabbed routes
 * (Screener, News). The active tab is highlighted with an emerald
 * bottom border so the current page is unambiguous even when content
 * scrolls.
 */
export function TabsBar() {
  return (
    <nav className="border-b border-gray-200 bg-white dark:border-emerald-900/30 dark:bg-[#0f1c18]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mb-px flex gap-1 overflow-x-auto sm:gap-2" role="tablist">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              role="tab"
              className={({ isActive }) =>
                [
                  "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "border-emerald-500 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                    : "border-transparent text-gray-500 hover:border-emerald-300 hover:text-emerald-600 dark:text-gray-400 dark:hover:border-emerald-700 dark:hover:text-emerald-300",
                ].join(" ")
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}