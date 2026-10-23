import type { NextRequest } from "next/server";
import { isValidJobId, readOutput, type AllowedJobFile } from "@/lib/cdr-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<AllowedJobFile, string> = {
  "original.cdr": "application/octet-stream",
  "result.svg": "image/svg+xml",
  "result.pdf": "application/pdf",
  "result.png": "image/png",
  "result.ai": "application/postscript",
  "result.cdr": "application/octet-stream",
};

function isAllowedName(name: string): name is AllowedJobFile {
  return name in TYPES;
}

/**
 * GET /api/cdr/download/[id]/[name] — отдаёт файл задачи.
 *   ?inline=1  — отдать для встраивания (предпросмотр);
 *   ?as=Имя    — красивое имя файла при скачивании.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; name: string }> }
) {
  const { id, name } = await ctx.params;

  if (!isValidJobId(id) || !isAllowedName(name)) {
    return Response.json({ ok: false, error: "Файл не найден." }, { status: 404 });
  }

  const data = await readOutput(id, name);
  if (!data) {
    return Response.json(
      { ok: false, error: "Файл не найден. Сначала выполните конвертацию." },
      { status: 404 }
    );
  }

  const asRaw = req.nextUrl.searchParams.get("as") ?? name;
  const safeAs =
    (asRaw.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80) || name).trim() || name;
  const inline = req.nextUrl.searchParams.get("inline") === "1";

  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": TYPES[name],
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${safeAs.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(safeAs)}`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
