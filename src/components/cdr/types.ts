/**
 * Общие типы фронтенда CDR Bridge — зеркалят контракт API
 * (см. src/app/api/cdr/* и worklog.md, Task 2-a).
 */

/** Формат конвертации */
export type CdrFormat = "svg" | "pdf" | "ai" | "png";

/** Формат конвертации + прямая смена версии (формат "cdr") */
export type CdrTargetFormat = CdrFormat | "cdr";

/** GET /api/cdr/engine */
export interface EngineInfo {
  available: boolean;
  engine?: string;
  version?: string;
  error?: string;
}

/** Версия внутри .cdr-файла */
export interface FileVersion {
  char: string | null;
  numeric: number | null;
  product: string | null;
}

/** POST /api/cdr/analyze — успех */
export interface AnalyzeSuccess {
  ok: true;
  id: string;
  fileName: string;
  fileSize: number;
  container: "RIFF" | "ZIP";
  version: FileVersion;
  thumbnailDataUrl?: string;
  notes: string[];
}

/** POST /api/cdr/analyze — неудача */
export interface AnalyzeFailure {
  ok: false;
  error: string;
  sniffedType?: string;
}

export type AnalyzeResponse = AnalyzeSuccess | AnalyzeFailure;

/** POST /api/cdr/convert — успех (в т.ч. смена версии format="cdr") */
export interface ConvertSuccess {
  ok: true;
  format: CdrTargetFormat;
  fileName: string;
  downloadUrl: string;
  warnings: string[];
  engine: string;
}

/** POST /api/cdr/convert — неудача */
export interface ConvertFailure {
  ok: false;
  error: string;
}

export type ConvertResponse = ConvertSuccess | ConvertFailure;
