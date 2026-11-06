import { engineJson } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  return engineJson("experiment_definitions");
}
