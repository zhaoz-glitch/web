import { useEffect, useRef, useState, type CSSProperties } from "react";
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

interface Indicator {
  left: number;
  width: number;
  height: number;
  visible: boolean;
}

/**
 * Horizontal tab bar with a sliding emerald indicator that travels
 * between tabs as the user clicks or hovers. The indicator's
 * position is recomputed whenever the active tab, hover tab or
 * viewport size changes so it always lines up pixel-perfect.
 */
export function TabsBar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [indicator, setIndicator] = useState<Indicator>({
    left: 0,
    width: 0,
    height: 0,
    visible: false,
  });

  // Measure the indicator target (active wins, otherwise hover ghost)
  const targetIdx = hoverIdx ?? activeIdx;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const compute = () => {
      const tab = tabRefs.current[targetIdx];
      if (!tab) return;
      const cRect = container.getBoundingClientRect();
      const tRect = tab.getBoundingClientRect();
      setIndicator({
        left: tRect.left - cRect.left,
        width: tRect.width,
        height: tRect.height,
        visible: true,
      });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    tabRefs.current.forEach((t) => t && ro.observe(t));
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [targetIdx]);

  // Slide-in transform, GPU-friendly. Width/height/left transition
  // together so the pill glides as one shape.
  const indicatorStyle: CSSProperties = {
    transform: `translate3d(${indicator.left}px, 0, 0)`,
    width: indicator.width,
    height: indicator.height,
    opacity: indicator.visible ? 1 : 0,
  };

  return (
    <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white/85 backdrop-blur dark:border-emerald-900/30 dark:bg-[#0a1512]/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          ref={containerRef}
          className="relative -mb-px flex gap-1 overflow-x-auto sm:gap-2"
          role="tablist"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Sliding emerald pill — always positioned on the active tab,
              and follows the cursor onto inactive tabs as a hover preview. */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 rounded-lg bg-emerald-50 ring-1 ring-emerald-200/80 transition-all duration-300 ease-out dark:bg-emerald-950/40 dark:ring-emerald-800/50"
            style={{
              ...indicatorStyle,
              transitionProperty: "transform, width, height, opacity",
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />

          {TABS.map((tab, idx) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              role="tab"
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              onClick={() => setActiveIdx(idx)}
              onMouseEnter={() => setHoverIdx(idx)}
              className={({ isActive }) =>
                [
                  "relative z-10 shrink-0 px-4 py-3 text-sm font-medium transition-colors duration-300",
                  isActive
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-gray-500 hover:text-emerald-700 dark:text-gray-400 dark:hover:text-emerald-300",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <span className="relative inline-flex items-center gap-1.5">
                  {isActive && (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400"
                    />
                  )}
                  {tab.label}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}