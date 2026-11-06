import { engineJson, readJson } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return engineJson("experiment_run", await readJson(req));
}
