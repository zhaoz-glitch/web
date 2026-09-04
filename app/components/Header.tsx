import { Link } from "react-router";

interface Props {
  userName?: string;
  onLogout: () => void;
}

/**
 * Shared top header used by all logged-in pages. Renders the leaf logo,
 * product name, status pills and user controls. Tabs (Screener / News)
 * live one level below this and are composed by each page so non-tab
 * routes like /db can render their own header.
 */
export function Header({ userName, onLogout }: Props) {
  return (
    <header className="relative overflow-hidden border-b border-emerald-700/30 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 dark:border-emerald-900/50 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-950">
      {/* Decorative leaf silhouettes */}
      <svg
        className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rotate-12 opacity-[0.12] dark:opacity-[0.08]"
        viewBox="0 0 24 24"
        fill="white"
      >
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      </svg>
      <svg
        className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 -rotate-45 opacity-[0.07] dark:opacity-[0.05]"
        viewBox="0 0 24 24"
        fill="white"
      >
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      </svg>

      {/* Slow-drifting aurora blobs — give the gradient header a living
          surface without ever triggering a repaint of the chrome. */}
      <div
        aria-hidden
        className="aurora-a pointer-events-none absolute -left-24 top-0 h-56 w-[28rem] rounded-full bg-emerald-300/25 blur-3xl"
      />
      <div
        aria-hidden
        className="aurora-b pointer-events-none absolute -right-32 -bottom-20 h-64 w-[32rem] rounded-full bg-cyan-300/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 shadow-lg shadow-emerald-900/20 ring-1 ring-white/25 backdrop-blur-sm">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Low-Carbon Screener
              </h1>
              <p className="text-xs font-medium text-emerald-50/80 dark:text-emerald-100/70">
                US equities × carbon emissions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden flex-col items-end gap-1.5 sm:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/20 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-300" />
                Market · TradingView live
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/20 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-200" />
                Carbon · Bavest annual
              </span>
            </div>
            <div className="flex items-center gap-2 border-l border-white/20 pl-4">
              <Link
                to="/db"
                className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/25 transition hover:bg-white/20 dark:hover:bg-white/15"
              >
                Tables
              </Link>
              <span className="text-xs font-medium text-white/90">{userName}</span>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/25 transition hover:bg-white/20 dark:hover:bg-white/15"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}