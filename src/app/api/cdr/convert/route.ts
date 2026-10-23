import { promises as fs } from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { convertDocument, detectEngine } from "@/lib/cdr-engine";
import { sanitizeLibreOfficeSvg } from "@/lib/svg-sanitize";
import { patchCdrVersion } from "@/lib/cdr-patch";
import { analyzeCdrBuffer } from "@/lib/cdr-analyze";
import {
  isValidJobId,
  jobPath,
  prettyBaseName,
  readJobMeta,
  saveOutput,
} from "@/lib/cdr-jobs";

export const runtime = "nodejs";

const FORMATS = ["svg", "pdf", "ai", "png", "cdr"] as const;
type Format = (typeof FORMATS)[number];

const FORMAT_WARNINGS: Record<Exclude<Format, "cdr">, string[]> = {
  svg: [
    "Слои и группы из CDR переносятся в SVG как именованные группы — структура документа сохраняется.",
    "Шрифты на сервере ограничены: часть текста может быть заменена стандартным шрифтом или переведена в кривые.",
    "Сложные эффекты (линзы, тени, режимы наложения) могут быть упрощены или растрированы.",
  ],
  pdf: [
    "PDF — универсальный векторный формат: его напрямую открывают Adobe Illustrator, Acrobat и любые версии CorelDRAW (через «Файл → Импорт»).",
    "Слои переносятся как порядок наложения объектов; отдельная панель слоёв в PDF не сохраняется.",
    "Шрифты на сервере ограничены: текст может быть заменён стандартным шрифтом.",
  ],
  ai: [
    "Файл .ai создан в PDF-совместимом виде — Adobe Illustrator открывает его напрямую (двойной клик или «Файл → Открыть»).",
    "Illustrator покажет документ как PDF-содержимое: векторные объекты редактируются, группы и структура сохраняются.",
  ],
  png: ["PNG — растровое изображение: векторная структура и слои не сохраняются."],
};

function badRequest(error: string, status = 400) {
  return Response.json({ ok: false, error }, { status });
}

/** Смена версии CDR: патч заголовка без движка LibreOffice. */
async function handleVersionChange(
  id: string,
  originalName: string,
  rawTarget: unknown
) {
  const targetNumeric = Number(rawTarget);
  if (!Number.isInteger(targetNumeric) || targetNumeric < 3 || targetNumeric > 27) {
    return badRequest(
      "Некорректная целевая версия. Укажите номер версии CorelDRAW от 3 до 27."
    );
  }

  let src: Buffer;
  try {
    src = await fs.readFile(jobPath(id, "original.cdr"));
  } catch {
    return badRequest("Исходный файл задачи не найден — загрузите файл заново.", 404);
  }

  const analysis = analyzeCdrBuffer(src);
  if (!analysis.ok) {
    return badRequest(
      "Файл не распознан как документ CorelDRAW — сменить версию нельзя.",
      422
    );
  }
  if (analysis.versionNumeric == null) {
    return badRequest(
      "Версию этого файла определить не удалось — сменить версию нельзя. Попробуйте конвертацию в SVG/PDF.",
      422
    );
  }
  if (targetNumeric === analysis.versionNumeric) {
    return badRequest(
      `Файл уже сохранён в версии ${targetNumeric} — выберите другую целевую версию.`,
      400
    );
  }
  if (targetNumeric > analysis.versionNumeric) {
    return badRequest(
      `Целевая версия (${targetNumeric}) старше текущей версии файла (${analysis.versionNumeric}) быть не может: инструмент понижает версию файла, а не повышает её.`,
      400
    );
  }

  const patched = patchCdrVersion(src, targetNumeric);
  if (!patched.ok) {
    return badRequest(patched.error, 422);
  }

  try {
    await saveOutput(id, "result.cdr", patched.buffer);
  } catch {
    return badRequest("Результат не удалось сохранить.", 500);
  }

  const base = prettyBaseName(originalName);
  const pretty = `${base}-v${targetNumeric}.cdr`;

  return Response.json({
    ok: true,
    format: "cdr",
    fileName: pretty,
    downloadUrl: `/api/cdr/download/${id}/result.cdr?as=${encodeURIComponent(pretty)}`,
    warnings: patched.warnings,
    engine: "Встроенный инструмент (патч заголовка, без перекодирования)",
  });
}

/**
 * POST /api/cdr/convert — JSON { id, format, targetNumeric? }.
 * format "cdr" — прямая смена версии (targetNumeric обязателен),
 * остальные форматы — конвертация через LibreOffice Draw.
 */
export async function POST(req: NextRequest) {
  let body: { id?: unknown; format?: unknown; targetNumeric?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest("Некорректный JSON в теле запроса.");
  }

  const id = typeof body.id === "string" ? body.id : "";
  const format = typeof body.format === "string" ? (body.format as Format) : "";

  if (!isValidJobId(id)) return badRequest("Некорректный идентификатор задачи.");
  if (!FORMATS.includes(format)) {
    return badRequest(
      "Неизвестный формат. Доступно: cdr (смена версии), svg, pdf, ai, png."
    );
  }

  const meta = await readJobMeta(id);
  if (!meta) {
    return badRequest(
      "Задача не найдена или устарела — загрузите файл заново.",
      404
    );
  }

  if (format === "cdr") {
    return handleVersionChange(id, meta.originalName, body.targetNumeric);
  }

  const engine = await detectEngine();
  if (!engine.available) {
    return badRequest(engine.error ?? "Движок конвертации недоступен.", 503);
  }

  // .ai создаётся на базе PDF-контейнера
  const target: "svg" | "pdf" | "png" = format === "ai" ? "pdf" : format;
  const srcPath = jobPath(id, "original.cdr");
  const outDir = path.dirname(srcPath);

  const outcome = await convertDocument(srcPath, outDir, target);
  if (!outcome.ok || !outcome.outFile) {
    return badRequest(outcome.error ?? "Конвертация не удалась.", 422);
  }

  try {
    let data = await fs.readFile(outcome.outFile);
    // Экспорт SVG LibreOffice содержит скрытые страницы и 450 КБ скрипта —
    // пересобираем в плоский статичный SVG (иначе <img> и Illustrator видят пустоту).
    if (format === "svg") {
      const sanitized = sanitizeLibreOfficeSvg(data);
      if (sanitized.ok && sanitized.svg) data = sanitized.svg;
    }
    const outName =
      format === "ai"
        ? ("result.ai" as const)
        : (`result.${format}` as "result.svg" | "result.pdf" | "result.png");
    await saveOutput(id, outName, data);

    const base = prettyBaseName(meta.originalName);
    const pretty = `${base}.${format}`;
    const engineLabel = engine.version
      ? `LibreOffice ${engine.version}`
      : "LibreOffice";

    return Response.json({
      ok: true,
      format,
      fileName: pretty,
      downloadUrl: `/api/cdr/download/${id}/${outName}?as=${encodeURIComponent(pretty)}`,
      warnings: [...FORMAT_WARNINGS[format]],
      engine: engineLabel,
    });
  } catch {
    return badRequest("Результат конвертации не удалось сохранить.", 500);
  }
}
