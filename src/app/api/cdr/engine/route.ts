import { detectEngine } from "@/lib/cdr-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/cdr/engine — статус движка конвертации для бейджа в интерфейсе */
export async function GET() {
  const info = await detectEngine();
  return Response.json(info);
}
