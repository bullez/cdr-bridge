/**
 * Анализ буфера файла: определение формата и версии CorelDRAW.
 *
 * Поддерживаемые варианты:
 *  1. Классический CDR: RIFF....CDR<символ версии> (версии 3..X5, а также
 *     внутренний riffData.cdr внутри ZIP-контейнера).
 *  2. ZIP-вариант CDR (X6 и новее): PK-архив с content/riffData.cdr и
 *     metadata/thumbnail.png.
 *
 * Корректно распознаёт и «чужие» форматы (PDF, PNG, SVG и т.п.), чтобы
 * объяснить пользователю, почему файл не принят.
 */

import { readZipEntries, type ZipEntry } from "./cdr-container";
import { numericFromChar, productByNumeric } from "./cdr-versions";

export type CdrContainer = "RIFF" | "ZIP";

export interface CdrAnalyzeSuccess {
  ok: true;
  container: CdrContainer;
  versionChar: string | null;
  versionNumeric: number | null;
  product: string | null;
  thumbnailDataUrl?: string;
  notes: string[];
}

export interface CdrAnalyzeFailure {
  ok: false;
  reason: string;
  sniffedType?: string;
}

export type CdrAnalyzeResult = CdrAnalyzeSuccess | CdrAnalyzeFailure;

const latin = (buf: Buffer, start: number, len: number): string =>
  buf.toString("latin1", start, start + len);

/** Определяет символ версии по RIFF-заголовку: "RIFF....CDR<x>" */
export function parseRiffCdrChar(data: Buffer): string | null {
  if (data.length < 12) return null;
  if (latin(data, 0, 4) !== "RIFF") return null;
  const form = latin(data, 8, 4);
  if (!form.startsWith("CDR")) return null;
  const ch = form[3];
  return numericFromChar(ch) != null ? ch : null;
}

/** Эвристика «чужих» форматов по магическим байтам */
function sniffOther(buf: Buffer): string | undefined {
  const m4 = latin(buf, 0, 4);
  const m2 = latin(buf, 0, 2);
  if (m4 === "%PDF") return "PDF-документ";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "JPEG-изображение";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "PNG-изображение";
  if (m4 === "GIF8") return "GIF-изображение";
  if (m4 === "%!PS") return "PostScript/EPS";
  const head = buf.subarray(0, 512).toString("utf8").trim().toLowerCase();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) return "SVG-документ";
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) return "HTML-страница";
  if (m4 === "RIFF") return `RIFF (${latin(buf, 8, 4)}) — не CorelDRAW`;
  if (m2 === "BM") return "BMP-изображение";
  if (m2 === "PK") return "ZIP-архив";
  return undefined;
}

function buildSuccess(
  container: CdrContainer,
  ch: string,
  thumbnailDataUrl?: string
): CdrAnalyzeSuccess {
  const numeric = numericFromChar(ch);
  const notes: string[] = [];
  if (numeric == null) {
    notes.push(
      "Неизвестный символ версии — возможно, файл создан очень новой версией CorelDRAW."
    );
  } else if (numeric >= 19) {
    notes.push(
      "Файлы CorelDRAW 2017+ поддерживаются движком конвертации экспериментально. Если конвертация не удастся, пересохраните файл в CorelDRAW X7–2024 в формате CDR (версия X7)."
    );
  } else if (numeric <= 6) {
    notes.push("Очень старая версия CDR — конвертация полностью поддерживается.");
  }
  return {
    ok: true,
    container,
    versionChar: ch,
    versionNumeric: numeric,
    product: numeric != null ? productByNumeric(numeric) : null,
    thumbnailDataUrl: thumbnailDataUrl,
    notes,
  };
}

/** Главная точка входа: анализ буфера файла */
export function analyzeCdrBuffer(buf: Buffer): CdrAnalyzeResult {
  if (buf.length < 12) {
    return { ok: false, reason: "Файл слишком маленький или повреждён." };
  }

  const head4 = latin(buf, 0, 4);
  const form4 = latin(buf, 8, 4);

  // CMX (Corel Presentation Exchange) — другой формат Corel
  if (head4 === "INST" || form4.startsWith("CMX")) {
    return {
      ok: false,
      reason:
        "Это файл Corel CMX (.cmx). Конвертер работает только с .cdr — при необходимости сохраните документ как CDR.",
      sniffedType: "CMX",
    };
  }

  // 1. Классический CDR (RIFF-контейнер)
  const riffChar = parseRiffCdrChar(buf);
  if (riffChar) return buildSuccess("RIFF", riffChar);

  // 2. ZIP-вариант CDR (CorelDRAW X6+)
  if (head4.startsWith("PK")) {
    let entries: ZipEntry[];
    try {
      entries = readZipEntries(
        buf,
        (name) =>
          name === "content/riffData.cdr" ||
          name === "metadata/thumbnail.png" ||
          name.toLowerCase().endsWith(".cdr")
      );
    } catch {
      return {
        ok: false,
        reason:
          "Файл представляет собой ZIP-архив, но внутри нет структуры CorelDRAW (возможно, это .docx, .odp или обычный .zip).",
        sniffedType: "ZIP",
      };
    }

    let thumbnailDataUrl: string | undefined;
    for (const entry of entries) {
      if (
        entry.name === "metadata/thumbnail.png" &&
        !thumbnailDataUrl &&
        entry.data.length <= 3 * 1024 * 1024
      ) {
        thumbnailDataUrl = `data:image/png;base64,${entry.data.toString("base64")}`;
      }
      const inner = parseRiffCdrChar(entry.data);
      if (inner) return buildSuccess("ZIP", inner, thumbnailDataUrl);
    }
    return {
      ok: false,
      reason:
        "ZIP-контейнер распознан, но данные CorelDRAW (content/riffData.cdr) внутри не найдены.",
      sniffedType: "ZIP",
    };
  }

  // 3. Неизвестный формат
  const other = sniffOther(buf);
  return {
    ok: false,
    reason: other
      ? `Это не файл CorelDRAW: похоже на ${other}.`
      : "Сигнатура CorelDRAW не найдена: файл не является .cdr или повреждён.",
    sniffedType: other,
  };
}
