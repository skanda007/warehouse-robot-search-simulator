// Browser-level end-to-end check of the complete evaluator workflow.
// Usage: BASE_URL=http://localhost:3000 node e2e/workflow.mjs   (server must be running)
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR || "/tmp/shots";
fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!ok) failures++;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const txt = async (sel) => (await page.locator(sel).first().innerText()).trim();
const phase = () => page.locator('[data-testid="phase"]').first().textContent();

async function clickCell(r, c) {
  const svg = page.locator('[data-testid="warehouse-view"]').first();
  const label = await svg.getAttribute("aria-label");
  const [, rows, cols] = label.match(/Warehouse (\d+) by (\d+)/).map(Number);
  const box = await svg.boundingBox();
  const vbW = cols * 40 + 44;
  const vbH = rows * 40 + 44;
  await page.mouse.click(box.x + ((22 + c * 40 + 20) / vbW) * box.width, box.y + ((22 + r * 40 + 20) / vbH) * box.height);
}

// 1. open + preset loading ------------------------------------------------------------
await page.goto(`${BASE}/simulator`);
await page.waitForSelector('[data-testid="warehouse-view"]');
check("simulator renders warehouse svg", await page.locator('[data-testid="warehouse-view"]').isVisible());
check("six sidebar sections", (await page.locator('nav[aria-label="Main navigation"] a').count()) === 6);

await page.click('[data-testid="preset-weighted"]');
await page.waitForFunction(() => document.body.innerText.includes("Loaded \"Weighted Terrain\""));
check("preset 'Weighted Terrain' loaded (9x14)", (await page.locator('[data-testid="warehouse-view"]').first().getAttribute("aria-label")) === "Warehouse 9 by 14");
await page.screenshot({ path: `${SHOTS}/01-simulator.png`, fullPage: false });

// every preset loads individually and updates dimensions
const expected = { simple: [8, 12], sparse: [12, 16], dense: [13, 16], multi_route: [9, 15], weighted: [9, 14], narrow: [9, 15], unreachable: [8, 12], large: [24, 36], complex: [18, 28], open: [10, 14] };
let allPresets = true;
for (const [id, [r, c]] of Object.entries(expected)) {
  await page.click(`[data-testid="preset-${id}"]`);
  try {
    await page.waitForFunction(([r, c]) => document.querySelector('[data-testid="warehouse-view"]')?.getAttribute("aria-label") === `Warehouse ${r} by ${c}`, [r, c], { timeout: 8000 });
  } catch {
    allPresets = false;
    console.log("   preset failed:", id);
  }
}
check("all 10 presets load with correct dimensions", allPresets);
await page.click('[data-testid="preset-weighted"]');
await page.waitForFunction(() => document.querySelector('[data-testid="warehouse-view"]')?.getAttribute("aria-label") === "Warehouse 9 by 14");

// 2. editing ------------------------------------------------------------------------
await page.click('[data-testid="tool-obstacle"]');
const blockedBefore = await page.locator("dt:has-text('Blocked cells') + dd").innerText();
await clickCell(0, 6);
const blockedAfter = await page.locator("dt:has-text('Blocked cells') + dd").innerText();
check("add obstacle increases blocked count", Number(blockedAfter) === Number(blockedBefore) + 1, `${blockedBefore} → ${blockedAfter}`);
await page.click('[data-testid="map-undo"]');
check("undo restores blocked count", (await page.locator("dt:has-text('Blocked cells') + dd").innerText()) === blockedBefore);
await page.click('[data-testid="tool-obstacle"]');
await clickCell(4, 0); // start cell is protected
check("obstacle on start is refused", (await page.locator('[role="alert"]').count()) > 0);
await page.click('[data-testid="tool-start"]');
await clickCell(5, 1);
check("move start to (5, 1)", (await page.locator("dt:has-text('Start (robot)') + dd").innerText()).includes("(5, 1)"));
await page.click('[data-testid="tool-start"]');
await clickCell(4, 0);
await page.click('[data-testid="tool-terrain"]');
await page.click('[data-testid="cost-5"]');
await clickCell(8, 5);
check("weighted terrain applied", Number(await page.locator("dt:has-text('Weighted cells') + dd").innerText()) > 0);
await page.click('[data-testid="view-grid"]');
await page.screenshot({ path: `${SHOTS}/02-grid-debug.png` });
await page.click('[data-testid="view-warehouse"]');
await page.click('[data-testid="preset-weighted"]');
await page.waitForFunction(() => document.body.innerText.includes("Loaded \"Weighted Terrain\""));

// 3. run UCS, observe stage A then stage B ---------------------------------------------------
await page.click('[data-testid="algo-UCS"]');
await page.click('[data-testid="run-search"]');
await page.waitForSelector('[data-testid="timeline-label"]:has-text("Search event")');
check("stage A: search events play first", true);
await page.click("button:has-text('4x')");
await page.waitForFunction(() => document.querySelector('[data-testid="phase"]')?.textContent === "goal_found", null, { timeout: 60000 });
await page.screenshot({ path: `${SHOTS}/03-goal-found.png` });
const label1 = await txt('[data-testid="timeline-label"]');
await page.waitForFunction(() => document.querySelector('[data-testid="timeline-label"]')?.textContent?.startsWith("Robot route"), null, { timeout: 30000 });
check("stage B: robot route execution starts after goal found", true);
const seen = new Set();
const t0 = Date.now();
while ((await phase()) !== "completed" && Date.now() - t0 < 60000) {
  seen.add(await txt('[data-testid="timeline-label"]'));
  await page.waitForTimeout(60);
}
await page.screenshot({ path: `${SHOTS}/04-mission-complete.png` });
check("mission completed", (await phase()) === "completed");
const last = await txt('[data-testid="timeline-label"]');
check("robot reached final cell (21 moves → 22 cells)", /cell 22 of 22/.test(last), last);
const steps = [...seen].map((s) => Number(s.match(/cell (\d+)/)?.[1])).filter(Boolean);
check("robot visited consecutive cells (no teleport)", steps.every((v, i) => i === 0 || v - steps[i - 1] <= 2), steps.join(","));

// 4. visualization page --------------------------------------------------------------------
await page.click('a[href="/visualization"]');
await page.waitForSelector('[data-testid="frontier-list"]');
await page.click('[data-testid="ctl-reset"]');
await page.click('[data-testid="ctl-next"]');
await page.click('[data-testid="ctl-next"]');
check("next advances event", /Search event 3 of/.test(await txt('[data-testid="timeline-label"]')));
check("frontier rows shown (priority queue)", (await page.locator('[data-testid="frontier-row"]').count()) > 0);
await page.click('[data-testid="ctl-prev"]');
check("previous goes back", /Search event 2 of/.test(await txt('[data-testid="timeline-label"]')));
await page.locator('[data-testid="timeline-slider"]').fill("40");
check("slider jumps to step 41", /Search event 41 of/.test(await txt('[data-testid="timeline-label"]')));
check("event explanation present", (await txt('[data-testid="event-text"]')).length > 20, await txt('[data-testid="event-text"]'));
await page.waitForSelector(".react-flow__node");
check("search tree renders nodes", (await page.locator(".react-flow__node").count()) > 3, `${await page.locator(".react-flow__node").count()} nodes`);
await page.screenshot({ path: `${SHOTS}/05-visualization.png`, fullPage: true });
await page.click('[data-testid="ctl-final"]');
check("final → mission completed", (await phase()) === "completed");

// DFS and BFS
for (const a of ["DFS", "BFS"]) {
  await page.click(`[data-testid="algo-${a}"]`);
  await page.click('[data-testid="viz-run"]');
  await page.waitForFunction(() => document.querySelector('[data-testid="timeline-label"]')?.textContent?.includes("Search event"), null, { timeout: 20000 });
  await page.click("button:has-text('4x')");
  await page.click('[data-testid="ctl-final"]');
  check(`${a} run completes with a route`, (await phase()) === "completed");
  if (a === "DFS") {
    await page.click('[data-testid="ctl-reset"]');
    for (let i = 0; i < 5; i++) await page.click('[data-testid="ctl-next"]');
    check("DFS frontier tagged TOP", (await page.locator('[data-testid="frontier-list"]').innerText()).includes("TOP"));
  }
}

// 5. comparison ---------------------------------------------------------------------------
await page.click('a[href="/comparison"]');
await page.waitForSelector('[data-testid="card-UCS"]', { timeout: 30000 });
check("comparison cards for BFS/DFS/UCS", (await page.locator('[data-testid^="card-"]').count()) === 3);
check("interpretation text generated", (await page.locator('[data-testid="interpretation"] li').count()) >= 3);
await page.waitForTimeout(800);
await page.screenshot({ path: `${SHOTS}/06-comparison.png`, fullPage: true });

// 6. unreachable ------------------------------------------------------------------------------
await page.click('a[href="/simulator"]');
await page.click('[data-testid="preset-unreachable"]');
await page.waitForFunction(() => document.querySelector('[data-testid="warehouse-view"]')?.getAttribute("aria-label") === "Warehouse 8 by 12");
await page.click('[data-testid="run-search"]');
await page.click("button:has-text('4x')");
await page.waitForFunction(() => document.querySelector('[data-testid="phase"]')?.textContent === "unreachable", null, { timeout: 40000 });
check("unreachable goal: Destination Unreachable, no robot movement", !(await txt('[data-testid="timeline-label"]')).startsWith("Robot route"));
await page.screenshot({ path: `${SHOTS}/07-unreachable.png` });

// 7. experiments + CSV ----------------------------------------------------------------------------
await page.click('a[href="/experiments"]');
await page.waitForSelector('[data-testid="summary-table"]', { timeout: 60000 });
check("experiment summary table (3 algorithms)", (await page.locator('[data-testid="summary-table"] tbody tr').count()) === 3);
const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-testid="csv-raw"]')]);
const csv = fs.readFileSync(await dl.path(), "utf8");
check("CSV export downloads raw trials", csv.startsWith("experiment,trial") && csv.trim().split("\n").length === 61, `${csv.trim().split("\n").length} lines`);
await page.click('[data-testid="exp-grid_sizes"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="summary-table"] tbody tr').length === 12, null, { timeout: 90000 });
check("grid-size experiment: 4 sizes × 3 algorithms", true);
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOTS}/08-experiments.png`, fullPage: true });

await page.goto(`${BASE}/`);
await page.waitForSelector('[data-testid="overview-preview"]');
await page.screenshot({ path: `${SHOTS}/09-overview.png`, fullPage: true });
await page.goto(`${BASE}/explanations`);
check("explanations page renders", await page.locator("text=Uniform-Cost Search (UCS)").first().isVisible());

const real = errors.filter((e) => !/favicon|Failed to load resource/.test(e));
check("no console / page errors", real.length === 0, real.slice(0, 3).join(" | "));
await browser.close();
console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll end-to-end checks passed");
process.exit(failures ? 1 : 0);
