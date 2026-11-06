"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  CircleAlert,
  CircleCheck,
  FlaskConical,
  Info,
  LayoutDashboard,
  Menu,
  Network,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/layout/PageTransition";
import { PHASE_LABEL, timelineOf, useStore } from "@/store/useStore";
import { usePlayback } from "@/hooks/usePlayback";
import { EXEC_MS, HOLD_MS, searchBaseMs } from "@/lib/playback";
import { ALGO_COLORS } from "@/lib/theme";
import { Pill, cx } from "@/components/common/ui";

export const NAV = [
  { href: "/", label: "Overview", shortLabel: "Overview", icon: LayoutDashboard },
  { href: "/simulator", label: "Warehouse Simulator", shortLabel: "Simulator", icon: WarehouseIcon },
  { href: "/visualization", label: "Algorithm Visualization", shortLabel: "Visualization", icon: Network },
  { href: "/comparison", label: "Algorithm Comparison", shortLabel: "Comparison", icon: BarChart3 },
  { href: "/experiments", label: "Experimental Analysis", shortLabel: "Experiments", icon: FlaskConical },
  { href: "/explanations", label: "AI & Explanations", shortLabel: "AI & Theory", icon: BookOpen },
] as const;

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className="flex items-center justify-center rounded-lg bg-volt font-display text-base font-black text-[#0a0b0c] shadow-md shadow-volt/25 transition-transform hover:scale-105"
        style={{ width: size, height: size }}
        aria-hidden
      >
        WA
      </div>
      <div className="leading-none">
        <div className="font-display text-lg tracking-tight text-ink">WAREHOUSE</div>
        <div className="font-display text-[11px] tracking-[0.2em] text-volt">AUTONOMY</div>
      </div>
    </div>
  );
}

function PlaybackDriver() {
  const playing = useStore((s) => s.playing);
  const t = useStore((s) => s.t);
  const speed = useStore((s) => s.speed);
  const result = useStore((s) => s.result);
  const next = useStore((s) => s.next);
  const pause = useStore((s) => s.pause);

  useEffect(() => {
    if (!playing || !result) return;
    const { E, total } = timelineOf(result);
    if (t >= total - 1) {
      pause();
      return;
    }
    const base = t < E - 1 ? searchBaseMs(E) : t === E - 1 ? HOLD_MS : EXEC_MS;
    const id = window.setTimeout(next, Math.max(8, base / speed));
    return () => window.clearTimeout(id);
  }, [playing, t, speed, result, next, pause]);
  return null;
}

function Toasts() {
  const notices = useStore((s) => s.notices);
  const dismiss = useStore((s) => s.dismiss);
  useEffect(() => {
    if (!notices.length) return;
    const timers = notices.map((n) =>
      window.setTimeout(() => dismiss(n.id), n.kind === "error" ? 7000 : 4500),
    );
    return () => timers.forEach(clearTimeout);
  }, [notices, dismiss]);
  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(92vw,420px)] flex-col gap-2.5"
      aria-live="polite"
    >
      {notices.map((n) => (
        <div
          key={n.id}
          role={n.kind === "error" ? "alert" : "status"}
          className={cx(
            "wa-fade-up pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl shadow-black/80 backdrop-blur",
            n.kind === "success" && "border-[#38c982]/50 bg-[#0e2118]/95 text-[#6ee7b7]",
            n.kind === "error" && "border-[#ff5a63]/60 bg-[#2b1014]/95 text-[#fca5a5]",
            n.kind === "info" && "border-volt/50 bg-[#121517]/95 text-volt",
          )}
        >
          {n.kind === "success" ? (
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#38c982]" />
          ) : n.kind === "error" ? (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5a63]" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
          )}
          <span className="flex-1 leading-snug">{n.message}</span>
          <button
            onClick={() => dismiss(n.id)}
            aria-label="Dismiss"
            className="opacity-70 hover:opacity-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function StatusPill() {
  const view = usePlayback();
  const running = useStore((s) => s.running);
  const loadingPreset = useStore((s) => s.loadingPreset);
  if (loadingPreset) return <Pill tone="brand" dot>Loading Warehouse…</Pill>;
  if (running) return <Pill tone="warn" dot>Search Running</Pill>;
  const tone =
    view.phase === "unreachable"
      ? "bad"
      : view.phase === "completed" || view.phase === "goal_found"
        ? "ok"
        : view.phase === "searching" || view.phase === "moving"
          ? "warn"
          : "brand";
  return (
    <Pill tone={tone} dot>
      {PHASE_LABEL[view.phase]}
    </Pill>
  );
}

function PhaseProbe() {
  const view = usePlayback();
  return (
    <span className="sr-only" data-testid="phase">
      {view.phase}
    </span>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const init = useStore((s) => s.init);
  const algo = useStore((s) => s.algo);
  const model = useStore((s) => s.model);
  const ready = useStore((s) => s.ready);
  const modified = useStore((s) => s.modified);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const current =
    NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href))) ?? NAV[0];

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink selection:bg-volt/30 selection:text-ink">
      <PlaybackDriver />
      <PhaseProbe />

      {/* Keel-style Fixed Top Header (~72px) */}
      <header
        className={cx(
          "fixed top-0 inset-x-0 z-40 h-[72px] transition duration-200",
          scrolled || mobileMenuOpen
            ? "bg-[#0a0b0c]/95 border-b border-line shadow-2xl shadow-black/80 backdrop-blur-md"
            : "bg-transparent border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Region 1: Product Branding (Dedicated width, never shrinks) */}
          <div className="flex items-center shrink-0 min-w-[185px]">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="Warehouse Autonomy Home">
              <Logo />
            </Link>
          </div>

          {/* Region 2: Six Navigation Links (Evenly spaced, vertically centered, responsive) */}
          <nav className="hidden xl:flex items-center justify-center gap-5 2xl:gap-7 flex-1 min-w-0 px-2" aria-label="Main navigation">
            {NAV.map((n) => {
              const active = n.href === current.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "text-xs font-extrabold uppercase tracking-[0.12em] transition duration-150 py-2 relative whitespace-nowrap shrink-0",
                    active ? "text-volt" : "text-muted hover:text-ink",
                  )}
                >
                  <span className="hidden 2xl:inline">{n.label}</span>
                  <span className="inline 2xl:hidden">{n.shortLabel}</span>
                  {active && (
                    <motion.span
                      layoutId="header-nav-indicator"
                      className="absolute bottom-0 inset-x-0 h-0.5 bg-volt rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Region 3: Far Right Status & Action Controls */}
          <div className="flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2.5">
              <StatusPill />
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider shrink-0"
                style={{
                  borderColor: ALGO_COLORS[algo] + "80",
                  background: ALGO_COLORS[algo] + "18",
                  color: "#fff",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: ALGO_COLORS[algo] }} />
                {algo}
              </span>
            </div>

            <Link
              href="/simulator"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-volt px-4 py-2 text-xs font-black uppercase tracking-wider text-[#0a0b0c] shadow-md shadow-volt/20 transition hover:bg-volt-dim hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            >
              SIMULATOR <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            {/* Mobile menu trigger: visible below xl breakpoint (< 1280px) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex xl:hidden items-center justify-center rounded-lg border border-line bg-raised p-2 text-ink hover:border-volt/60 hover:text-volt transition shrink-0 ml-1"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-volt" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Keel-style Mobile Full-Screen Overlay Navigation */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-[72px] z-30 flex flex-col justify-between bg-[#0a0b0c]/98 p-6 sm:p-8 backdrop-blur-xl xl:hidden wa-fade-up overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="space-y-1 divide-y divide-line">
            {NAV.map((n, i) => {
              const active = n.href === current.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cx(
                    "flex items-center justify-between py-5 transition",
                    active ? "text-volt" : "text-ink hover:text-volt",
                  )}
                >
                  <span className="font-display text-2xl sm:text-4xl uppercase tracking-tight">
                    {n.label}
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-muted">
                    0{i + 1}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 space-y-4 border-t border-line pt-6">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>ACTIVE ALGORITHM</span>
              <span className="font-bold text-volt">{algo}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>WAREHOUSE MAP</span>
              <span className="font-bold text-ink">
                {model.name} {modified ? "(edited)" : ""} · {model.rows}×{model.cols}
              </span>
            </div>
            <Link
              href="/simulator"
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-volt py-3.5 text-center font-extrabold uppercase tracking-wider text-[#0a0b0c] shadow-lg shadow-volt/20"
            >
              LAUNCH SIMULATOR <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Area — begins below fixed header */}
      <main className="flex-1 pt-[72px]">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>

      {/* Keel-style 4-Column Editorial Footer */}
      <footer className="border-t border-line bg-[#0a0b0c] mt-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {/* Col 1: Brand & Purpose */}
            <div className="space-y-4">
              <Logo size={42} />
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-volt">
                INTELLIGENT SHELF RETRIEVAL
              </p>
              <p className="text-sm leading-relaxed text-muted">
                Classical uninformed search simulation for autonomous mobile robots. Driven by an
                authoritative Python search engine with deterministic event-history replay.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-muted">
                <Activity className="h-3.5 w-3.5 text-[#38c982]" /> Python 3 Backend Engine Connected
              </div>
            </div>

            {/* Col 2: Navigation Links */}
            <div>
              <div className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-ink">
                APPLICATION
              </div>
              <ul className="space-y-2.5 text-sm font-semibold text-muted">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="hover:text-volt transition">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Search Theory */}
            <div>
              <div className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-ink">
                CORE ALGORITHMS
              </div>
              <ul className="space-y-2.5 text-sm font-semibold text-muted">
                <li>
                  <Link href="/explanations#bfs" className="hover:text-volt transition">
                    Breadth-First Search (FIFO)
                  </Link>
                </li>
                <li>
                  <Link href="/explanations#dfs" className="hover:text-volt transition">
                    Depth-First Search (LIFO)
                  </Link>
                </li>
                <li>
                  <Link href="/explanations#ucs" className="hover:text-volt transition">
                    Uniform-Cost Search (Heap)
                  </Link>
                </li>
                <li>
                  <Link href="/explanations#optimality" className="hover:text-volt transition">
                    Optimality & Complexity
                  </Link>
                </li>
                <li>
                  <Link href="/explanations#architecture" className="hover:text-volt transition">
                    Event Replay Architecture
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: System Telemetry */}
            <div className="space-y-3">
              <div className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-ink">
                SYSTEM TELEMETRY
              </div>
              <div className="rounded-xl border border-line bg-surface p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted">CURRENT GRID:</span>
                  <span className="font-bold text-ink">
                    {model.rows}×{model.cols} ({model.name})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">ACTIVE ALGORITHM:</span>
                  <span className="font-bold text-volt">{algo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">ENGINE STATUS:</span>
                  <span className="font-bold text-[#38c982]">
                    {ready ? "OPERATIONAL" : "CONNECTING"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">VERSION:</span>
                  <span className="font-mono text-muted">2.0.0-PROD</span>
                </div>
              </div>
              <p className="text-[11px] leading-snug text-muted">
                All metrics and paths are measured directly from the search algorithms without
                interpolation or simulated benchmarks.
              </p>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line/60 pt-8 text-xs font-medium text-muted">
            <div>© {new Date().getFullYear()} WAREHOUSE AUTONOMY. ALL RIGHTS RESERVED.</div>
            <div className="flex items-center gap-6">
              <span>UNINFORMED AI SEARCH</span>
              <span>·</span>
              <span>AUTONOMOUS ROBOTICS</span>
              <span>·</span>
              <span>MIT LICENSE</span>
            </div>
          </div>
        </div>
      </footer>

      <Toasts />
    </div>
  );
}
