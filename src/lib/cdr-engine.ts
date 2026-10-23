/**
 * Движок конвертации: LibreOffice Draw (headless) + фильтр libcdr.
 * soffice читает CDR всех поколений (классические RIFF и ZIP-контейнеры X6+)
 * и экспортирует в SVG / PDF / PNG. Формат .ai создаётся как PDF-совместимый
 * контейнер — Adobe Illustrator открывает его напрямую.
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

export interface EngineInfo {
  available: boolean;
  engine?: string;
  version?: string;
  error?: string;
}

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/** Запуск внешней команды с таймаутом; ошибка запуска не бросает исключение */
export function runCommand(
  cmd: string,
  args: string[],
  timeoutMs: number
): Promise<RunResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    const finish = (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    };

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", () => finish(null));
    child.on("close", (code) => finish(code));
  });
}

const CANDIDATES = ["soffice", "libreoffice"] as const;

let cache: { at: number; info: EngineInfo } | null = null;
const CACHE_MS = 5 * 60 * 1000;

/** Определяет доступность LibreOffice и его версию (кэш 5 минут) */
export async function detectEngine(): Promise<EngineInfo> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.info;

  let lastError: string | undefined;
  for (const bin of CANDIDATES) {
    const res = await runCommand(bin, ["--version"], 15000);
    const m = res.stdout.match(/LibreOffice\s+([\d.]+)/i);
    if (res.code === 0 && m) {
      const info: EngineInfo = { available: true, engine: bin, version: m[1] };
      cache = { at: Date.now(), info };
      return info;
    }
    lastError =
      res.code === null
        ? `не найден (пробовали «${bin}»)`
        : res.stderr.trim() || "не отвечает";
  }

  const info: EngineInfo = {
    available: false,
    error: `LibreOffice недоступен: ${lastError ?? "не найден"}`,
  };
  cache = { at: Date.now(), info };
  return info;
}

export interface ConvertOutcome {
  ok: boolean;
  outFile?: string;
  error?: string;
}

/**
 * Конвертирует документ через LibreOffice Draw.
 * target: "svg" | "pdf" | "png" (для .ai вызывается с "pdf").
 * Каждый запуск использует собственный профиль — запуски не конфликтуют.
 */
export async function convertDocument(
  srcPath: string,
  outDir: string,
  target: "svg" | "pdf" | "png"
): Promise<ConvertOutcome> {
  const engine = await detectEngine();
  if (!engine.available || !engine.engine) {
    return {
      ok: false,
      error: "Движок конвертации LibreOffice недоступен на сервере.",
    };
  }

  const profile = `file:///tmp/cdr-bridge-lo-${randomUUID()}`;
  const res = await runCommand(
    engine.engine,
    [
      `-env:UserInstallation=${profile}`,
      "--headless",
      "--norestore",
      "--convert-to",
      target,
      "--outdir",
      outDir,
      srcPath,
    ],
    120000
  );

  if (res.timedOut) {
    return {
      ok: false,
      error:
        "Превышено время конвертации (120 секунд). Попробуйте файл меньшего размера или упростите документ.",
    };
  }

  // Ищем созданный файл
  const { readdir } = await import("node:fs/promises");
  const path = await import("node:path");
  try {
    const files = await readdir(outDir);
    const base = path.basename(srcPath, path.extname(srcPath));
    const expected = `${base}.${target}`;
    const found =
      files.find((f) => f === expected) ??
      files.find((f) => f.toLowerCase().endsWith(`.${target}`));
    if (found) return { ok: true, outFile: path.join(outDir, found) };
  } catch {
    // каталог мог быть недоступен — обработаем ниже как ошибку
  }

  // LibreOffice часто возвращает код 0 даже при неудачном импорте — смотрим вывод
  const combined = `${res.stdout}\n${res.stderr}`.trim();
  const lines = combined
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((l) => !/javaldx/i.test(l));
  const errLine = lines.find((l) => /error|could not|failed|не удал/i.test(l));

  return {
    ok: false,
    error:
      errLine ??
      "LibreOffice не смог обработать файл — возможно, эта версия CDR не поддерживается движком libcdr или документ повреждён.",
  };
}
