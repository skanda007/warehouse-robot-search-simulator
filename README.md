# WAREHOUSE ROBOT SEARCH SIMULATOR
### Intelligent Shelf Retrieval Using Uninformed Search (BFS · DFS · Uniform-Cost Search)

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.6-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.9.3-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776ab?style=flat&logo=python)](https://www.python.org/)
[![Vitest](https://img.shields.io/badge/Vitest-5.1.0-6e9f18?style=flat&logo=vitest)](https://vitest.dev/)
[![Pytest](https://img.shields.io/badge/Pytest-46_Passed-0a9edc?style=flat&logo=pytest)](https://docs.pytest.org/)

**WAREHOUSE ROBOT SEARCH SIMULATOR** is an industrial-grade simulation and pedagogical workbench for Autonomous Mobile Robots (AMRs). Docked at a warehouse loading bay, an AMR plans the optimal route to retrieve goods from a designated storage rack using manually implemented classical AI search algorithms:
* **Breadth-First Search (BFS)** — Guaranteed shortest path by step count (FIFO queue).
* **Depth-First Search (DFS)** — Memory-efficient deep exploration (LIFO stack, non-optimal).
* **Uniform-Cost Search (UCS)** — Guaranteed cost-optimal route across weighted terrain (Min-Heap priority queue).

The application pairs a **Next.js 16 + React 19** dark-and-volt interface with an **authoritative Python search engine**. Instead of merely displaying static paths, the system streams and replays the search process event by event (frontier pushes/pops, explored sets, search trees, cost relaxation), followed by smooth cell-by-cell AMR kinematic execution.

---

## Table of Contents

1. [Key Features](#1-key-features)
2. [AI Problem Formulation](#2-ai-problem-formulation)
3. [System Architecture](#3-system-architecture)
4. [Prerequisites](#4-prerequisites)
5. [Downloading & Running](#5-downloading--running)
   - [Option A: Web Application (Next.js + Python Engine)](#option-a-web-application-nextjs--python-engine)
   - [Option B: Standalone Flask REST API Server](#option-b-standalone-flask-rest-api-server)
6. [Environment Variables](#6-environment-variables)
7. [Application Workflows & Pages](#7-application-workflows--pages)
8. [Project Structure](#8-project-structure)
9. [REST API Reference](#9-rest-api-reference)
10. [Automated Testing & Verification](#10-automated-testing--verification)
11. [Design Tokens & UI Conventions](#11-design-tokens--ui-conventions)
12. [Troubleshooting & FAQ](#12-troubleshooting--faq)

---

## 1. Key Features

- **Team Claude007 Glyph Portal**: Scroll-driven camera experience built with Christian Katzmann's `GlyphPortal` (MIT). Zooms smoothly through live type into a deep-green introduction chamber with a deliberate stopping point before entering the main workbench.
- **Authoritative Python Engine**: Single authoritative implementation of BFS, DFS, and UCS in `backend/app/algorithms/`. The React UI contains **zero search logic**; it only visualizes events emitted by Python.
- **Zero-Latency Event Replay**: Search execution emits delta events. A client-side replay engine with index checkpoints (`src/lib/replay.ts`) enables scrubbing, step-stepping, speed adjustments (0.25× to 4×), and reverse replay without re-querying the backend.
- **Interactive Grid Editor & Workbench**: Draw custom floor plans, place AMR docking bays, assign requested target shelves, paint weighted terrain zones (costs 1 to 8), and place storage racks/pallets with multi-cell brush footprints (1×1, 2×2, 3×3). Includes undo/redo and JSON import/export.
- **Live Search Debugger & Tree Visualizer**: Inspect the live frontier container, track parent pointers, explore the node hierarchy via `@xyflow/react` (React Flow), and read step-by-step plain-English explanations.
- **Empirical Algorithm Benchmark**: Run BFS, DFS, and UCS side-by-side on identical warehouse topologies. Compare path lengths, total traversal costs, expanded nodes, generated nodes, peak frontier sizes, and execution times.
- **Parameterized Experimental Suite**: Execute 6 synthetic benchmark scenarios across varying grid dimensions, obstacle densities, cost distributions, and seeds with automatic mean/median/std statistical analysis and CSV downloads.
- **Fluid Motion & Resilient Layout**: Persistent 3-region responsive navigation, animated spring active indicators, and Framer Motion page transitions with full `prefers-reduced-motion` support.

---

## 2. AI Problem Formulation

| Formulation Dimension | Specification |
|---|---|
| **Environment** | Discrete 2D grid ($R \times C$, $2 \le R, C \le 60$). Traversable aisle cells, positive-cost terrain zones, and non-traversable obstacle/rack cells. |
| **State Space** | Coordinates $(r, c)$ where $0 \le r < R$ and $0 \le c < C$. |
| **Initial State** | Docking station coordinate $S = (r_{\text{start}}, c_{\text{start}})$. |
| **Goal Condition** | Retrieval cell $G = (r_{\text{goal}}, c_{\text{goal}})$ immediately adjacent to the requested storage shelf. |
| **Action Space** | 4 orthogonal moves: $\text{UP} (-1, 0)$, $\text{DOWN} (+1, 0)$, $\text{LEFT} (0, -1)$, $\text{RIGHT} (0, +1)$. Fixed deterministic expansion order: **UP, DOWN, LEFT, RIGHT**. |
| **Path Cost $g(n)$** | Additive cost of entered cells: normal floor $= 1$, low resistance $= 2$, rough terrain $= 3$, heavy traffic $= 5$ (custom positive costs supported). Initial dock $S$ costs $0$. |

### Search Algorithms & Frontier Data Structures

1. **Breadth-First Search (BFS)**:
   - **Frontier**: Double-ended queue (`collections.deque`, FIFO).
   - **Properties**: Complete; optimal for unit step costs; exponential memory $O(b^d)$.
2. **Depth-First Search (DFS)**:
   - **Frontier**: Explicit stack (`list`, LIFO). Neighbours pushed in reverse order (`RIGHT, LEFT, DOWN, UP`) so `UP` is popped first.
   - **Properties**: Complete on finite state spaces with cycle prevention; non-optimal; linear space $O(bm)$.
3. **Uniform-Cost Search (UCS)**:
   - **Frontier**: Priority queue via min-heap (`heapq`). Entries structured as $(g(n), \text{counter}, \text{state}, \text{node})$.
   - **Properties**: Complete; optimal for arbitrary positive costs; expands nodes in order of non-decreasing path cost. Includes stale entry handling and path relaxation.

---

## 3. System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             NEXT.JS 16 FRONTEND                             │
│                                                                             │
│   Team Claude007      Warehouse        Algorithm          Algorithm         │
│    Glyph Portal       Simulator      Visualization        Comparison        │
│         │                 │                │                  │             │
│   Overview Page       Warehouse       Search Tree        Experiments        │
│   (Editorial)          Editor         (React Flow)       (CSV Export)       │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ HTTP fetch (/api/*)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APP ROUTER API LAYER                        │
│                                                                             │
│   /api/health       /api/search        /api/search/compare                  │
│   /api/algorithms   /api/warehouses/*  /api/experiments/*                   │
│                                 │                                           │
│                       src/lib/engine.ts (Bridge)                            │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ stdin / stdout JSON IPC
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTHORITATIVE PYTHON ENGINE                        │
│                                                                             │
│   backend/cli.py  ──────▶  backend/app/service.py                           │
│                                  │                                          │
│         ┌────────────────────────┼────────────────────────┐                 │
│         ▼                        ▼                        ▼                 │
│   algorithms/ (BFS, DFS, UCS)  core/ (Model, Grid)   experiments/ (Trials)  │
│                                                                             │
│   (Optional) Flask HTTP Server: python backend/run.py (Port 5000)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

The browser UI never computes search paths directly. When a search is triggered, the Next.js API route calls `backend/cli.py` via a high-speed subprocess bridge. The Python engine executes the search, records delta events, and returns the verified event log to the frontend.

---

## 4. Prerequisites

Before installing, ensure the following runtimes are available on your system:

- **Node.js**: `v20.x` or `v22.x` (LTS recommended). Check with:
  ```bash
  node --version
  ```
- **npm**: `v10.x` or higher. Check with:
  ```bash
  npm --version
  ```
- **Python**: `3.11`, `3.12`, `3.13`, or `3.14`. Check with:
  ```bash
  python --version   # Windows
  python3 --version  # macOS / Linux
  ```
  *(Note: The core search engine uses only Python standard library modules: `collections`, `heapq`, `time`, `statistics`, `random`, `json`, and `csv`.)*

---

## 5. Downloading & Running

### Option A: Web Application (Next.js + Python Engine)

This is the standard full-stack setup where Next.js serves the frontend and seamlessly drives the Python engine through its internal bridge.

#### 1. Clone or Extract the Repository
```bash
git clone https://github.com/your-username/warehouse-robot-search-simulator.git
cd warehouse-robot-search-simulator
```

#### 2. Install Node Dependencies
```bash
npm install
```

#### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser. Turbopack will compile the pages on demand.

#### 4. Run Production Build
For optimized execution and maximum performance:
```bash
npm run build
npm run start
```
The production server will be ready on **[http://localhost:3000](http://localhost:3000)**.

---

### Option B: Standalone Flask REST API Server

If you wish to test or run the Python backend as an independent REST API service:

#### 1. Navigate to Backend Directory
```bash
cd backend
```

#### 2. Create and Activate a Python Virtual Environment
- **Windows (PowerShell)**:
  ```powershell
  python -m venv .venv
  .venv\Scripts\Activate.ps1
  ```
- **Windows (CMD)**:
  ```cmd
  python -m venv .venv
  .venv\Scripts\activate.bat
  ```
- **macOS / Linux**:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

#### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### 4. Start the Flask Server
```bash
python run.py
```
The Flask API will start on **[http://127.0.0.1:5000](http://127.0.0.1:5000)**. Verify health via:
```bash
curl http://127.0.0.1:5000/api/health
```

---

## 6. Environment Variables

Create an optional `.env.local` file in the project root if you need custom configuration:

```env
# Path to Python interpreter (auto-detected as 'python' on Windows or 'python3' on Unix)
PYTHON_BIN=python

# Next.js Port (Default: 3000)
PORT=3000

# Optional Database URL (Gracefully skipped if omitted; presets & saved maps use localStorage)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/warehouse

# Flask Standalone Server Settings (Used only if running backend/run.py directly)
FLASK_HOST=127.0.0.1
FLASK_PORT=5000
FLASK_DEBUG=false
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

## 7. Application Workflows & Pages

The application is organized into six cohesive destinations accessible via the top navigation bar:

### 1. Welcome Portal & Overview (`/`)
- **Stage 1 (White Screen)**: Displays the minimalist `Team Claude007` welcome screen with large interactive geometric lettering.
- **Stage 2 (Glyph Zoom)**: Clicking **Enter the Warehouse** smoothly drives the scroll camera through the letter's ink geometry using a 2D canvas measurement algorithm.
- **Stage 3 (Green Introduction Stop)**: Settles stably on the deep-green feature screen highlighting Optimal Search, Authoritative Engine, and Explainable AI. **Never auto-redirects**; waits for user engagement.
- **Stage 4 (Workbench Hand-off)**: Clicking **`Launch Warehouse Workbench →`** smoothly unveils the editorial Overview with live AMR radar animations, interactive metrics, and the 6-step AI pipeline.
- *Tip: Force replay or bypass via URL queries `/?welcome=1` or `/?skip=1`.*

### 2. Warehouse Simulator (`/simulator`)
- Top-down visual floor plan generated dynamically from the underlying Python grid.
- **Interactive Toolbar**: Add/remove obstacles, place storage racks, configure shelves, paint terrain weights (cost 1–8), and set start bay `S` / retrieval cell `G`.
- **Multi-Cell Brush**: Paint footprints in 1×1, 2×2, or 3×3 blocks.
- **Mission Control**: Select active search algorithm (`BFS`, `DFS`, `UCS`), inspect live validations, and trigger instant search execution.
- **Presets & Presets Manager**: Load 10 pre-validated benchmarks or duplicate, undo, redo, and export/import maps via JSON.

### 3. Algorithm Visualization & Debugger (`/visualization`)
- Step-by-step search engine debugger with synchronized execution.
- **Playback Controls**: Play, pause, step forward, step backward, jump to goal, reset, or scrub with the step slider at 0.25×, 0.5×, 1×, 2×, or 4× speed.
- **Dual Stage Display**:
  - *Stage A (Search Phase)*: Displays real-time frontier additions, popped states, and explored nodes with cost badges.
  - *Stage B (Robot Execution Phase)*: Animates the AMR driving along the reconstructed path cell by cell once the search completes.
- **Search Tree Inspector**: Interactive node graph with parent-pointer links powered by `@xyflow/react`.
- **Natural Language Explanations**: Plain-English explanations detailing why each state was popped or queued.

### 4. Algorithm Comparison (`/comparison`)
- Runs BFS, DFS, and UCS on the current warehouse layout in a single atomic query.
- Three spotlight algorithm cards reporting:
  - **Path Length** (cell moves)
  - **Total Traversal Cost** (accumulated edge costs)
  - **Nodes Expanded** (frontier pops evaluated)
  - **Nodes Generated** (unique states pushed)
  - **Peak Frontier Size** (maximum container footprint)
  - **Execution Time** (sub-millisecond precision, best of 5 trials)
- Interactive route overlay comparing discovered paths on the warehouse grid.

### 5. Experimental Analysis (`/experiments`)
- Automated scientific benchmarking suite over synthetic grid topologies.
- **6 Benchmark Scenarios**:
  1. *Sparse Obstacles* (~8% blocked, multi-path floor)
  2. *Dense Obstacles* (congested aisles with serpentine detours)
  3. *Variable Movement Costs* (high-traffic zones comparing BFS vs. UCS)
  4. *Multiple Equivalent Routes* (shortest vs. cheapest path trade-offs)
  5. *Unreachable Goal* (verifying completeness and termination under failure)
  6. *Scalability Window* ($8 \times 8$ up to $32 \times 32$)
- Configurable trial repetitions ($\le 50$), random seed, and cost distribution.
- Computes mean, median, standard deviation, and optimality gap metrics (`cost_gap_vs_ucs`, `moves_gap_vs_bfs`).
- Instant download of raw trial data and aggregated statistics in standard **CSV format**.

### 6. AI & Algorithm Explanations (`/explanations`)
- Comprehensive formal AI formulation and theoretical reference.
- Mathematical complexity reference tables for Time and Space complexities.
- Detailed step-by-step pseudocode for FIFO Breadth-First Search, LIFO Depth-First Search, and Priority-Queue Uniform-Cost Search.
- Sticky table-of-contents navigation with smooth anchor scrolling.

---

## 8. Project Structure

```text
warehouse-robot-search-simulator/
├── backend/                             # Authoritative Python Search Engine & Flask API
│   ├── app/
│   │   ├── algorithms/                  # BFS, DFS, UCS implementations & event recorders
│   │   │   ├── bfs.py                   # FIFO queue implementation (collections.deque)
│   │   │   ├── dfs.py                   # LIFO stack implementation (list)
│   │   │   ├── ucs.py                   # Priority queue implementation (heapq)
│   │   │   ├── common.py                # Node, SearchResult, and metric definitions
│   │   │   └── event_recorder.py        # Delta event tracker for step replay
│   │   ├── core/                        # Warehouse model, coordinate math, validation
│   │   │   ├── cost_model.py            # Cell and step cost evaluation
│   │   │   ├── operators.py             # UP, DOWN, LEFT, RIGHT action definitions
│   │   │   ├── path_reconstruction.py   # Backtracking parent pointers to start
│   │   │   └── state.py                 # (row, col) state coordinate representation
│   │   ├── experiments/                 # Procedural map generator & statistical engine
│   │   ├── routes/                      # Flask HTTP endpoints blueprint
│   │   ├── scenarios/                   # 10 pre-validated ASCII warehouse benchmark maps
│   │   ├── schemas/                     # Marshmallow request/response validation
│   │   └── service.py                   # Transport-independent business logic
│   ├── cli.py                           # Next.js IPC subprocess bridge (stdin/stdout)
│   ├── run.py                           # Standalone Flask server entry point
│   ├── pytest.ini                       # Pytest configuration
│   ├── requirements.txt                 # Backend dependencies (Flask, pytest)
│   └── tests/                           # 46 comprehensive pytest test cases
├── src/                                 # Next.js 16 App Router & React 19 Frontend
│   ├── app/                             # Next.js pages & serverless API routes
│   │   ├── api/                         # Backend IPC bridge routes (/api/search, etc.)
│   │   ├── comparison/                  # Algorithm Comparison page
│   │   ├── experiments/                 # Experimental Analysis page
│   │   ├── explanations/                # AI Explanations & Theory page
│   │   ├── simulator/                   # Warehouse Simulator workbench
│   │   ├── visualization/               # Step-by-Step Search Debugger
│   │   ├── globals.css                  # Tailwind v4 theme, fonts, custom scrollbars
│   │   ├── layout.tsx                   # Root HTML layout with Google Anton & Inter
│   │   └── page.tsx                     # Team Claude007 Welcome & Overview entry point
│   ├── components/                      # Reusable UI component library
│   │   ├── common/                      # Card, Button, Stat, Pill, PageHeader primitives
│   │   ├── layout/                      # Shell, 3-region Header, PageTransition wrapper
│   │   ├── ui/                          # shadcn-compatible GlyphPortal primitives
│   │   └── welcome/                     # TeamClaudePortal component & transition logic
│   ├── features/                        # Domain-specific feature modules
│   │   ├── analytics/                   # Recharts graphs, metrics tables, CSV export
│   │   ├── comparison/                  # Side-by-side metric cards & route overlays
│   │   ├── explanations/                # Math complexity tables, pseudocode blocks
│   │   ├── overview/                    # Editorial hero, SVG radar AMR, pipeline
│   │   ├── visualization/               # SimulationControls, FrontierPanel, SearchTree
│   │   └── warehouse/                   # SVG WarehouseView, Robot, EditorToolbar, Presets
│   ├── hooks/                           # Custom React hooks (usePlayback, useWarehouse)
│   ├── lib/                             # Utility modules, theme tokens, IPC client
│   │   ├── api.ts                       # Frontend API client
│   │   ├── engine.ts                    # Subprocess spawn bridge with Windows fallback
│   │   ├── replay.ts                    # Delta event reconstruction & checkpoints
│   │   ├── theme.ts                     # Color tokens (Near-black, Volt, Algorithm tones)
│   │   └── warehouse.ts                 # Layout serialization, validation, and metrics
│   └── store/                           # Global reactive state management via Zustand
├── components.json                      # shadcn CLI project configuration
├── design.md                            # Comprehensive visual design system specification
├── next.config.ts                       # Next.js configuration
├── package.json                         # Node dependencies & project scripts
├── tsconfig.json                        # Strict TypeScript compiler options
└── vitest.config.ts                     # Vitest component & replay test runner
```

---

## 9. REST API Reference

The backend exposes a uniform REST API consumed identically by the Next.js frontend or third-party HTTP clients:

| Method | Endpoint | Request Body | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Service liveness probe. Returns `{ status: "ok" }`. |
| `GET` | `/api/algorithms` | None | Returns metadata, operator rules, and theoretical properties of BFS, DFS, and UCS. |
| `GET` | `/api/warehouses/presets` | None | Lists 10 built-in warehouse benchmarks with dimensions and descriptions. |
| `GET` | `/api/warehouses/presets/<id>` | None | Returns the full validated warehouse model for preset `<id>`. |
| `POST` | `/api/warehouses/validate` | `{ warehouse }` | Validates grid bounds, obstacle overlaps, start/goal accessibility, and returns errors/warnings. |
| `POST` | `/api/search` | `{ algorithm, warehouse }` | Dispatches search. Returns path, metrics, delta `events`, and `search_tree`. |
| `POST` | `/api/search/compare` | `{ warehouse }` | Runs BFS, DFS, and UCS concurrently; returns side-by-side comparative metrics. |
| `GET` | `/api/experiments/definitions`| None | Returns the 6 standardized synthetic experiment specifications. |
| `POST` | `/api/experiments/run` | `{ experiment_id, trials, ... }` | Executes seeded synthetic trials; returns statistical summary and raw CSV strings. |

All error responses adhere to a consistent contract:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Start and goal locations cannot overlap with obstacle cells.",
    "details": []
  }
}
```

---

## 10. Automated Testing & Verification

The project includes multi-tiered automated test suites across both TypeScript and Python:

### 1. Python Algorithm & Backend Tests (Pytest)
Executes 46 unit, integration, and performance tests verifying BFS/UCS optimality, DFS cycle handling, edge relaxation, and API contracts:
```bash
python -m pytest backend/tests
```
*Result: 46 passed in ~3.5s.*

### 2. Frontend Component & Event Replay Tests (Vitest)
Executes 22 component and replay tests verifying that the TypeScript timeline engine reconstructs exact search frames from real Python event logs:
```bash
npx vitest run
```
*Result: 22 passed across 3 test suites.*

### 3. Static Type Verification
Ensures zero type regressions in strict TypeScript mode:
```bash
npm run typecheck
```
*Result: 0 errors.*

### 4. Production Build Verification
Verifies that all 9 dynamic and static App Router routes compile cleanly:
```bash
npm run build
```

---

## 11. Design Tokens & UI Conventions

The visual design system strictly follows `design.md`, inspired by high-contrast industrial interfaces:

- **Background Canvas**: Deep near-black (`--color-bg: #0a0b0c`).
- **Surface Elevation**: Charcoal card surfaces (`--color-surface: #121517`, `--color-raised: #191d20`).
- **Dividers & Borders**: Subtle industrial borders (`--color-line: #2a2e33`).
- **Primary Accent**: Electric lime / volt (`--color-volt: #c8ff2e`).
- **Typography**:
  - **Headings & Display**: Google Font **Anton** (`--font-display`), bold condensed uppercase display styling.
  - **Body & Navigation**: Google Font **Inter** (`--font-sans`), clean, readable sans-serif.
- **Algorithm Identity Tokens**:
  - **BFS (Breadth-First Search)**: Neon Sky Blue (`#4b8cff`)
  - **DFS (Depth-First Search)**: Mint Emerald (`#38c982`)
  - **UCS (Uniform-Cost Search)**: Bright Crimson (`#ff5a63`)
- **Warehouse Visual Coding**:
  - Traversable Floor: Dark grid tile (cost 1)
  - Weighted Terrain: Hatched amber/orange pattern with numeric cost overlay
  - Storage Racks & Pallets: Striped dark obstruction cells (blocked)
  - Dock Bay `S`: Cyan dashed border with directional chevron
  - Target Shelf `G`: High-contrast red target reticle with radar pulse

---

## 12. Troubleshooting & FAQ

#### Q: I get `spawnSync python3 ENOENT` on Windows when running search.
**A**: Windows typically registers the executable as `python` rather than `python3`. The engine bridge (`src/lib/engine.ts`) automatically falls back to `python` on Windows platforms. You can also explicitly set the interpreter path via the `PYTHON_BIN` environment variable:
```powershell
$env:PYTHON_BIN = "python"
npm run dev
```

#### Q: How can I bypass the welcome portal during testing?
**A**: Append `?skip=1` to the URL ([`http://localhost:3000/?skip=1`](http://localhost:3000/?skip=1)) to jump directly to the Overview workbench. To force display of the welcome screen, append `?welcome=1`.

#### Q: Port 3000 is already in use on my machine.
**A**: Start Next.js on an alternate port using the `-p` flag:
```bash
npm run dev -- -p 3001
```

#### Q: Are search results simulated or mocked in JavaScript?
**A**: **No.** Every single search expansion, tree node, frontier count, and robot coordinate path is computed by the authoritative Python search engine in `backend/app/algorithms/` and streamed over standard input/output.

---

## License

This project is licensed under the **MIT License**.
Glyph Portal component © 2026 Christian Katzmann (MIT License).
Lucide Icons licensed under the ISC License.
