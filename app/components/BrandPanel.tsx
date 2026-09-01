export function BrandPanel() {
  return (
    <div className="relative hidden min-h-[100dvh] overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-950 to-slate-950 lg:flex lg:w-[42%]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, rgba(16,185,129,0.45) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(52,211,153,0.25) 0%, transparent 50%),
              repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px)`,
          }}
        />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-14">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-white">
              Low-Carbon Screener
            </p>
            <p className="text-xs text-emerald-200/60">US equities × carbon data</p>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
            Use carbon data
            <br />
            <span className="text-emerald-300">to screen green stocks.</span>
          </h1>
          <p className="max-w-sm text-base leading-relaxed text-emerald-100/70">
            Put financial quality and carbon intensity on one screen. Filter
            valuation and profitability first, then Scope 1/2 intensity and
            YoY change, to find cleaner names.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-3 pt-2">
            <span className="flex items-center gap-2 text-sm text-emerald-200/70">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              Dual market + carbon filters
            </span>
            <span className="flex items-center gap-2 text-sm text-emerald-200/70">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              Trends and stock drawer
            </span>
            <span className="flex items-center gap-2 text-sm text-emerald-200/70">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              Demo data ready to use
            </span>
          </div>
        </div>

        <p className="text-xs text-emerald-300/35">
          Built for investors who care about both returns and carbon.
        </p>
      </div>
    </div>
  );
}
