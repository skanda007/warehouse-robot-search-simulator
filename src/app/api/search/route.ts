import { engineJson, readJson } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return engineJson("search", await readJson(req));
}
