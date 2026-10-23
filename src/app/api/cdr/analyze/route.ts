import type { NextRequest } from "next/server";
import { analyzeCdrBuffer } from "@/lib/cdr-analyze";
import { createJob, cleanupOldJobs } from "@/lib/cdr-jobs";

export const runtime = "nodejs";

const MAX_SIZE = 250 * 1024 * 1024; // 250 МБ

/**
 * POST /api/cdr/analyze — multipart/form-data, поле «file» (.cdr).
 * Определяет версию файла, сохраняет задачу и возвращает метаданные.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json(
        {
          ok: false,
          error:
            "Файл не получен. Ожидается multipart/form-data с полем «file».",
        },
        { status: 400 }
      );
    }
    if (file.size === 0) {
      return Response.json(
        { ok: false, error: "Файл пустой." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return Response.json(
        { ok: false, error: "Файл больше 250 МБ — такой размер не поддерживается." },
        { status: 413 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const result = analyzeCdrBuffer(buf);
    if (!result.ok) {
      return Response.json({
        ok: false,
        error: result.reason,
        sniffedType: result.sniffedType,
      });
    }

    const id = await createJob(file.name || "drawing.cdr", buf);
    cleanupOldJobs().catch(() => {
      // уборка не критична
    });

    return Response.json({
      ok: true,
      id,
      fileName: file.name,
      fileSize: file.size,
      container: result.container,
      version: {
        char: result.versionChar,
        numeric: result.versionNumeric,
        product: result.product,
      },
      thumbnailDataUrl: result.thumbnailDataUrl,
      notes: result.notes,
    });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: `Не удалось обработать файл: ${
          e instanceof Error ? e.message : "неизвестная ошибка"
        }`,
      },
      { status: 500 }
    );
  }
}
