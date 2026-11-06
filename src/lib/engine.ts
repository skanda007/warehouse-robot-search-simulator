import { spawn } from "node:child_process";
import path from "node:path";

/**
 * Bridge to the authoritative Python search engine (backend/cli.py).
 * The Next.js API routes never implement BFS/DFS/UCS themselves: every search,
 * comparison and experiment is computed by the Python engine in /backend.
 */
export interface EngineResponse {
  status: number;
  body: unknown;
}

const PYTHON_BIN = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
const TIMEOUT_MS = 120_000;

function errorBody(code: string, message: string) {
  return { error: { code, message, details: [] as string[] } };
}

export function callEngine(op: string, payload?: unknown): Promise<EngineResponse> {
  return new Promise((resolve) => {
    const cwd = path.join(/* turbopackIgnore: true */ process.cwd(), "backend");
    let settled = false;
    const finish = (r: EngineResponse) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    const child = spawn(PYTHON_BIN, ["cli.py"], { cwd, stdio: ["pipe", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ status: 504, body: errorBody("engine_timeout", "The search engine took too long to respond.") });
    }, TIMEOUT_MS);
    child.stdout.on("data", (d: Buffer) => out.push(d));
    child.stderr.on("data", () => undefined);
    child.on("error", () => {
      clearTimeout(timer);
      finish({ status: 503, body: errorBody("engine_unavailable", "The Python search engine could not be started.") });
    });
    child.on("close", () => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(Buffer.concat(out).toString("utf8")) as EngineResponse;
        finish(parsed);
      } catch {
        finish({ status: 500, body: errorBody("engine_error", "The search engine returned an unreadable response.") });
      }
    });
    child.stdin.on("error", () => undefined);
    child.stdin.end(JSON.stringify({ op, payload }));
  });
}

export async function engineJson(op: string, payload?: unknown): Promise<Response> {
  const { status, body } = await callEngine(op, payload);
  return Response.json(body, { status });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
