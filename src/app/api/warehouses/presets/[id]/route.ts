import { engineJson } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return engineJson("preset", id);
}
