"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Boxes,
  Cpu,
  FlaskConical,
  GitBranch,
  Network,
  PackageCheck,
  Route,
  Search,
  Warehouse as WarehouseIcon,
  Bot,
  Zap,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { ALGO_COLORS } from "@/lib/theme";
import { modelStats } from "@/lib/warehouse";
import { Button, Card, Stat } from "@/components/common/ui";
import { WarehouseView } from "@/features/warehouse/WarehouseView";

const PIPELINE = [
  { icon: Boxes, title: "Shelf Request", text: "Target coordinate emitted from order feed." },
  { icon: WarehouseIcon, title: "Grid State Space", text: "2D map of racks, obstacles & costs." },
  { icon: Search, title: "Uninformed Search", text: "FIFO (BFS), LIFO (DFS) or Priority Queue (UCS)." },
  { icon: GitBranch, title: "Path Reconstruction", text: "Parent pointer traversal backwards from goal." },
  { icon: Bot, title: "AMR Dispatch", text: "Autonomous physical travel cell by cell." },
  { icon: PackageCheck, title: "Retrieval Complete", text: "Shelf payload retrieved at docking point." },
];

const ALGOS = [
  {
    id: "BFS" as const,
    name: "Breadth-First Search",
    frontier: "FIFO Queue",
    color: "#4b8cff",
    badge: "FEWEST MOVES",
    text: "Systematically expands layer by layer outward from the docking bay. Guaranteed to identify the route with the minimum number of cell hops, irrespective of terrain costs.",
  },
  {
    id: "DFS" as const,
    name: "Depth-First Search",
    frontier: "LIFO Stack",
    color: "#38c982",
    badge: "RAPID DEPTH",
    text: "Follows deep navigational corridors until blocked, then backtracks. Extremely fast in open aisles, but without path optimality guarantees — frequently discovering winding routes.",
  },
  {
    id: "UCS" as const,
    name: "Uniform-Cost Search",
    frontier: "Priority Queue",
    color: "#ff5a63",
    badge: "LOWEST COST",
    text: "Continually expands the frontier node with the minimum accumulated traversal cost g(n). Guaranteed to return the most cost-effective path across weighted warehouse floors.",
  },
];

const LINKS = [
  {
    href: "/simulator",
    icon: WarehouseIcon,
    title: "Warehouse Simulator",
    text: "Design custom warehouse layouts, place docking stations, obstacles, and dispatch robots.",
  },
  {
    href: "/visualization",
    icon: Network,
    title: "Algorithm Visualization",
    text: "Step-by-step search debugger inspecting the live frontier container, tree and timeline.",
  },
  {
    href: "/comparison",
    icon: BarChart3,
    title: "Algorithm Comparison",
    text: "Side-by-side execution benchmarks, route overlays, and empirical runtime metrics.",
  },
  {
    href: "/experiments",
    icon: FlaskConical,
    title: "Experimental Analysis",
    text: "Run 6 reproducible parameterized tests across synthetic grids with instant CSV export.",
  },
  {
    href: "/explanations",
    icon: BookOpen,
    title: "AI Explanations",
    text: "Full formal problem formulation, pseudocode, time/space complexity, and evaluation guide.",
  },
];

function Marquee() {
  const items = [
    "BREADTH FIRST SEARCH",
    "DEPTH FIRST SEARCH",
    "UNIFORM COST SEARCH",
    "AUTONOMOUS NAVIGATION",
    "FIFO QUEUE EXPLORATION",
    "LIFO STACK BACKTRACKING",
    "MINIMUM-COST PRIORITY HEAP",
    "EVENT-DRIVEN SEARCH REPLAY",
  ];

  return (
    <div
      className="my-16 -mx-4 sm:-mx-6 lg:-mx-8 border-y border-line bg-surface py-5 marquee-container"
      aria-label="Core Search Algorithms Marquee"
    >
      <div className="marquee-track flex items-center gap-10">
        {[...items, ...items].map((item, idx) => (
          <span
            key={idx}
            className="flex items-center gap-10 font-display text-3xl sm:text-5xl lg:text-6xl tracking-tight text-ink uppercase"
            aria-hidden={idx >= items.length}
          >
            <span>{item}</span>
            <span className="text-volt text-2xl sm:text-3xl">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function HeroArtwork() {
  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl border border-line bg-[#0e1114] p-4 overflow-hidden shadow-2xl shadow-black/80 flex items-center justify-center">
      {/* Subtle radial lime glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,255,46,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* Background SVG Grid & Blueprint Lines */}
      <svg
        viewBox="0 0 540 400"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="hero-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1d232a" strokeWidth="0.8" />
          </pattern>
          <linearGradient id="beam-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c8ff2e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c8ff2e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Floor Blueprint Grid */}
        <rect width="540" height="400" fill="url(#hero-grid)" />

        {/* Warehouse Storage Racks Layout (Industrial Charcoal with shelf rails) */}
        {/* Top Racks */}
        <g stroke="#2a333d" strokeWidth="1.2">
          <rect x="50" y="40" width="130" height="50" rx="3" fill="#14191e" />
          <line x1="50" y1="65" x2="180" y2="65" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />

          <rect x="230" y="40" width="130" height="50" rx="3" fill="#14191e" />
          <line x1="230" y1="65" x2="360" y2="65" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />

          <rect x="410" y="40" width="90" height="50" rx="3" fill="#14191e" />
          <line x1="410" y1="65" x2="500" y2="65" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />

          {/* Bottom Racks */}
          <rect x="50" y="310" width="130" height="50" rx="3" fill="#14191e" />
          <line x1="50" y1="335" x2="180" y2="335" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />

          <rect x="230" y="310" width="130" height="50" rx="3" fill="#14191e" />
          <line x1="230" y1="335" x2="360" y2="335" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />

          <rect x="410" y="310" width="90" height="50" rx="3" fill="#14191e" />
          <line x1="410" y1="335" x2="500" y2="335" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />
        </g>

        {/* Aisle Route Line (Computed Path in Green) */}
        <path
          d="M 90 200 L 220 200 L 220 120 L 440 120 L 440 85"
          fill="none"
          stroke="#38c982"
          strokeWidth="3.5"
          strokeDasharray="6 4"
        />

        {/* Goal Shelf Marker */}
        <g transform="translate(440, 65)">
          <circle r="14" fill="#ffd23e" fillOpacity="0.25" stroke="#ffd23e" strokeWidth="1.5" />
          <circle r="6" fill="#ffd23e" />
          <text y="-18" textAnchor="middle" fontSize="10" fontWeight="900" fill="#ffd23e" letterSpacing="1">
            TARGET SHELF
          </text>
        </g>

        {/* Start / Dock Marker */}
        <g transform="translate(90, 200)">
          <rect x="-18" y="-18" width="36" height="36" rx="4" fill="none" stroke="#2a343e" strokeWidth="1.5" strokeDasharray="3 3" />
          <text y="28" textAnchor="middle" fontSize="9" fontWeight="800" fill="#9aa3aa" letterSpacing="0.8">
            DOCK 01
          </text>
        </g>

        {/* Central Autonomous Mobile Robot (AMR) */}
        <g transform="translate(220, 200)">
          {/* Concentric radar rings */}
          <circle r="55" fill="none" stroke="#c8ff2e" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 6" className="wa-scan" />
          <circle r="36" fill="none" stroke="#c8ff2e" strokeOpacity="0.35" strokeWidth="1.2" />

          {/* Rotating Lidar Sweep Cone */}
          <path
            d="M 0 0 L 60 -30 A 70 70 0 0 1 60 30 Z"
            fill="url(#beam-grad)"
            className="wa-scan"
          />

          {/* Robot Chassis */}
          <rect x="-24" y="-18" width="48" height="36" rx="6" fill="#181d22" stroke="#c8ff2e" strokeWidth="2" />
          <rect x="-18" y="-13" width="36" height="26" rx="3" fill="#121517" stroke="#2a333d" strokeWidth="1" />

          {/* Wheels */}
          <rect x="-26" y="-22" width="12" height="6" rx="1.5" fill="#0a0b0c" stroke="#38414a" strokeWidth="1" />
          <rect x="14" y="-22" width="12" height="6" rx="1.5" fill="#0a0b0c" stroke="#38414a" strokeWidth="1" />
          <rect x="-26" y="16" width="12" height="6" rx="1.5" fill="#0a0b0c" stroke="#38414a" strokeWidth="1" />
          <rect x="14" y="16" width="12" height="6" rx="1.5" fill="#0a0b0c" stroke="#38414a" strokeWidth="1" />

          {/* Heading pointer & Lidar Turret */}
          <polygon points="18,0 8,-7 8,7" fill="#c8ff2e" />
          <circle cx="-5" cy="0" r="6" fill="#0a0b0c" stroke="#c8ff2e" strokeWidth="1.5" />
          <circle cx="-5" cy="0" r="2.5" fill="#c8ff2e" />
        </g>
      </svg>

      {/* Floating Keel-style Industrial HUD Badges */}
      <div className="absolute top-4 left-4 rounded-lg border border-line bg-surface/90 px-3 py-1.5 backdrop-blur">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">ACTIVE ALGORITHM</div>
        <div className="flex items-center gap-1.5 text-xs font-black text-volt">
          <span className="h-2 w-2 rounded-full bg-volt" /> BREADTH-FIRST SEARCH
        </div>
      </div>

      <div className="absolute top-4 right-4 rounded-lg border border-line bg-surface/90 px-3 py-1.5 backdrop-blur text-right">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">TARGET PAYLOAD</div>
        <div className="text-xs font-black text-[#ffd23e]">SHELF RACK #04</div>
      </div>

      <div className="absolute bottom-4 left-4 rounded-lg border border-line bg-surface/90 px-3 py-1.5 backdrop-blur">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">STATE SPACE</div>
        <div className="text-xs font-black text-ink">DISCRETE 2D GRID</div>
      </div>

      <div className="absolute bottom-4 right-4 rounded-lg border border-line bg-surface/90 px-3 py-1.5 backdrop-blur text-right">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">DECISION ENGINE</div>
        <div className="text-xs font-black text-[#38c982]">OPTIMAL ROUTE READY</div>
      </div>
    </div>
  );
}

export function OverviewPage({ onReplayWelcome }: { onReplayWelcome?: () => void } = {}) {
  const model = useStore((s) => s.model);
  const ready = useStore((s) => s.ready);
  const presets = useStore((s) => s.presets);
  const stats = modelStats(model);
  const [activeTab, setActiveTab] = useState<"blueprint" | "live">("blueprint");

  return (
    <div className="space-y-16">
      {/* Keel-style Editorial Split Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          {/* Eyebrow Label with Lime Horizontal Rule */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-0.5 w-8 bg-volt" />
              <span className="text-xs font-extrabold uppercase tracking-[0.24em] text-volt">
                AUTONOMOUS WAREHOUSE SYSTEMS · AI SEARCH SIMULATION
              </span>
            </div>
            {onReplayWelcome && (
              <button
                onClick={onReplayWelcome}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-line bg-surface/80 text-[11px] font-bold uppercase tracking-wider text-muted hover:text-ink hover:border-volt/50 transition duration-150"
                title="Replay Team Claude007 Welcome Intro"
              >
                <Sparkles className="w-3 h-3 text-volt" /> Team Claude007 Intro
              </button>
            )}
          </div>

          {/* Oversized Anton Display Headline with 3-line editorial treatment */}
          <h1 className="font-display text-5xl sm:text-7xl xl:text-8xl leading-[0.88] tracking-tight uppercase">
            <span className="block text-ink">FIND THE</span>
            <span className="block text-volt">FASTEST PATH</span>
            <span className="block headline-outlined">TO THE SHELF.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="max-w-xl text-base sm:text-lg leading-relaxed text-muted">
            An autonomous mobile robot docked at a warehouse bay must retrieve a requested shelf.
            Simulate classical AI planning with <b className="text-ink">BFS</b>,{" "}
            <b className="text-ink">DFS</b>, and <b className="text-ink">Uniform-Cost Search</b>.
            Step through live priority queues, examine parent-pointer search trees, and watch the
            robot drive the verified route.
          </p>

          {/* CTAs: Lime Primary + Outline Secondary */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/simulator"
              className="inline-flex items-center gap-2.5 rounded-xl bg-volt px-7 py-4 font-display text-lg uppercase tracking-wide text-[#0a0b0c] shadow-xl shadow-volt/25 transition duration-150 hover:bg-volt-dim hover:-translate-y-0.5 active:translate-y-0"
              data-testid="cta-simulator"
            >
              LAUNCH SIMULATOR <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/visualization"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-6 py-4 font-display text-lg uppercase tracking-wide text-ink transition duration-150 hover:border-volt/60 hover:text-volt hover:-translate-y-0.5 active:translate-y-0"
            >
              ALGORITHM VISUALIZATION
            </Link>
            {onReplayWelcome && (
              <button
                onClick={onReplayWelcome}
                className="sm:hidden inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-line bg-surface text-xs font-bold uppercase tracking-wider text-muted hover:text-ink hover:border-volt/50 transition duration-150"
              >
                <Sparkles className="w-3.5 h-3.5 text-volt" /> REPLAY INTRO
              </button>
            )}
          </div>

          {/* 3-Column Metric Row with Top Border */}
          <div className="grid grid-cols-3 gap-6 border-t border-line pt-6">
            <div>
              <div className="font-display text-4xl sm:text-5xl tracking-tight text-ink">03</div>
              <div className="mt-1 text-xs font-extrabold uppercase tracking-wider text-muted">
                ALGORITHMS
              </div>
            </div>
            <div>
              <div className="font-display text-4xl sm:text-5xl tracking-tight text-volt">04</div>
              <div className="mt-1 text-xs font-extrabold uppercase tracking-wider text-muted">
                MOVE ACTIONS
              </div>
            </div>
            <div>
              <div className="font-display text-4xl sm:text-5xl tracking-tight text-ink">
                {String(presets.length || 8).padStart(2, "0")}+
              </div>
              <div className="mt-1 text-xs font-extrabold uppercase tracking-wider text-muted">
                BENCHMARK MAPS
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Graphic / Live Preview Switcher */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold uppercase tracking-widest text-muted">
              SYSTEM WORKBENCH
            </span>
            <div className="flex rounded-lg border border-line bg-raised p-0.5 text-xs font-bold">
              <button
                onClick={() => setActiveTab("blueprint")}
                className={`rounded-md px-3 py-1 transition ${activeTab === "blueprint" ? "bg-volt text-[#0a0b0c] font-black" : "text-muted hover:text-ink"
                  }`}
              >
                BLUEPRINT
              </button>
              <button
                onClick={() => setActiveTab("live")}
                className={`rounded-md px-3 py-1 transition ${activeTab === "live" ? "bg-volt text-[#0a0b0c] font-black" : "text-muted hover:text-ink"
                  }`}
              >
                LIVE GRID
              </button>
            </div>
          </div>

          {activeTab === "blueprint" ? (
            <HeroArtwork />
          ) : (
            <div className="rounded-2xl border border-line bg-[#0e1114] p-4 shadow-2xl">
              {ready ? (
                <WarehouseView
                  model={model}
                  mode="warehouse"
                  robot={{ cell: model.start, angle: 0, moveMs: 300, scanning: true }}
                  maxCell={46}
                  testId="overview-preview"
                />
              ) : (
                <div className="h-64 animate-pulse rounded-xl bg-raised" />
              )}
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">
                Active Map: {model.name} · {model.rows}×{model.cols} grid
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Keel-style Horizontal Marquee Strip */}
      <Marquee />

      {/* Metrics Band: Asymmetrical Keel-style section */}
      <section className="rounded-2xl border border-line bg-surface p-8 sm:p-10 shadow-xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr] items-center">
          <div className="space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-volt">
              SYSTEM TELEMETRY
            </div>
            <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-tight text-ink leading-tight">
              MEASURED PERFORMANCE METRICS
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Every data point in Warehouse Autonomy is computed by the authoritative Python search
              engine. Zero fabricated values or mock statistics.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Algorithms" value="03" hint="BFS · DFS · UCS" />
            <Stat label="Warehouse Grid" value={`${model.rows}×${model.cols}`} hint={`${stats.free} traversable cells`} />
            <Stat label="Racks & Shelves" value={stats.blocked} hint="Storage obstacles" />
            <Stat label="Weighted Zones" value={stats.weighted} hint="Variable traversal costs" />
          </div>
        </div>
      </section>

      {/* AI Pipeline: Step-by-Step Flow */}
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-volt">
            SYSTEM ARCHITECTURE
          </div>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-tight text-ink">
            FROM REQUEST TO RETRIEVED SHELF
          </h2>
          <p className="text-sm text-muted max-w-xl">
            How the autonomous retrieval pipeline operates without heuristics or goal-directed guidance.
          </p>
        </div>

        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {PIPELINE.map((p, i) => {
            const Icon = p.icon;
            return (
              <li
                key={p.title}
                className="group relative rounded-xl border border-line bg-surface p-5 transition duration-200 hover:border-volt/60 hover:-translate-y-1"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-raised text-volt group-hover:bg-volt group-hover:text-[#0a0b0c] transition duration-200">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-display text-lg text-muted">0{i + 1}</span>
                </div>
                <div className="font-display text-lg uppercase tracking-tight text-ink">{p.title}</div>
                <div className="mt-1 text-xs text-muted leading-snug">{p.text}</div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 3-Column Algorithm Cards (BFS, DFS, UCS) */}
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-volt">
            UNINFORMED SEARCH ENGINE
          </div>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-tight text-ink">
            CORE ALGORITHMIC STRATEGIES
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {ALGOS.map((a) => (
            <div
              key={a.id}
              className="group rounded-2xl border border-line bg-surface p-7 shadow-xl transition duration-200 hover:-translate-y-1 hover:border-[#38414a]"
              style={{ borderTopColor: a.color, borderTopWidth: 3 }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="rounded-full border px-2.5 py-0.5 text-xs font-black uppercase tracking-wider"
                  style={{
                    borderColor: a.color + "60",
                    background: a.color + "18",
                    color: a.color,
                  }}
                >
                  {a.badge}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  {a.frontier}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: a.color }} />
                <h3 className="font-display text-2xl uppercase tracking-tight text-ink">{a.id}</h3>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted mt-0.5">
                {a.name}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted">{a.text}</p>

              <div className="mt-6 pt-5 border-t border-line/60 flex items-center justify-between text-xs font-bold text-muted group-hover:text-ink transition">
                <span>VIEW ALGORITHM IN SIMULATOR</span>
                <ArrowRight className="h-4 w-4 text-volt group-hover:translate-x-1 transition" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Features & Architecture Grid */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="ENGINEERING CAPABILITIES" subtitle="Core system features" icon={<Route className="h-5 w-5" />}>
          <ul className="space-y-3.5 text-sm text-ink">
            {[
              "High-fidelity top-down warehouse canvas rendered from the logical discrete grid.",
              "Search first, drive second: animated search exploration, followed by cell-by-cell AMR navigation.",
              "Queue debugger: inspect live FIFO, LIFO and priority queue contents with event-by-event explanations.",
              "React Flow search-tree layout visualizing parent-pointer chains and decision states.",
              "Warehouse editor with rack, obstacle, dock placement and custom terrain traversal weights.",
            ].map((text, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-volt" />
                <span className="leading-snug">{text}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="EVENT-DRIVEN ARCHITECTURE" subtitle="Python Search Engine Bridge" icon={<GitBranch className="h-5 w-5" />}>
          <p className="text-sm leading-relaxed text-muted">
            The Next.js frontend never computes BFS, DFS or UCS independently. Instead, the backend
            executes the search once, producing an exact, deterministic event history:
          </p>
          <div className="mt-4 rounded-xl border border-line bg-raised p-4 font-mono text-xs text-ink/90 leading-relaxed">
            <span className="text-volt">Warehouse Grid</span> → Python Engine (deque, list, heapq)
            <br />
            &nbsp;&nbsp;↳ Recorded Event History + Tree DAG
            <br />
            &nbsp;&nbsp;&nbsp;&nbsp;↳ Replayed deterministically in React with 0 drift
          </div>
          <p className="mt-4 text-xs font-semibold text-muted">
            Every step, pause, speed adjustment and backward navigation is instantaneous and 100% faithful to the underlying Python implementation.
          </p>
        </Card>
      </section>

      {/* Navigation Shortcuts */}
      <section className="space-y-4">
        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-volt">
          EXPLORE THE PLATFORM
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-xl border border-line bg-surface p-5 transition duration-200 hover:border-volt/70 hover:bg-[#161a1d] hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <Icon className="h-6 w-6 text-volt mb-3 group-hover:scale-110 transition duration-200" />
                  <div className="font-display text-lg uppercase tracking-tight text-ink group-hover:text-volt transition">
                    {link.title}
                  </div>
                  <p className="mt-1.5 text-xs text-muted leading-relaxed">{link.text}</p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-volt opacity-0 group-hover:opacity-100 transition">
                  OPEN MODULE <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Keel-style Full-Width Lime CTA Section */}
      <section className="rounded-3xl bg-volt p-8 sm:p-12 text-[#0a0b0c] shadow-2xl relative overflow-hidden">
        {/* Subtle Watermark AMR Icon in background */}
        <div className="absolute right-4 -bottom-10 opacity-10 pointer-events-none select-none">
          <WarehouseIcon className="w-80 h-80" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-[#0a0b0c]/80">
            DISPATCH SIMULATION
          </div>
          <h2 className="font-display text-4xl sm:text-6xl uppercase tracking-tight leading-[0.9]">
            READY TO DISPATCH AUTONOMOUS RETRIEVAL?
          </h2>
          <p className="text-base font-semibold leading-relaxed text-[#0a0b0c]/85">
            Configure the warehouse layout, position the robot dock, choose a requested shelf and watch
            BFS, DFS, and UCS find the path in real time.
          </p>
          <div className="pt-2">
            <Link
              href="/simulator"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0a0b0c] px-8 py-4 font-display text-lg uppercase tracking-wider text-volt shadow-2xl transition hover:bg-[#181d22] hover:-translate-y-0.5 active:translate-y-0"
            >
              OPEN SIMULATOR WORKSPACE <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
