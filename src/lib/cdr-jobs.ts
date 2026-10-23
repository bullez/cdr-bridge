/**
 * Хранилище задач конвертации во временной папке ОС:
 *   os.tmpdir()/cdr-bridge-jobs/<uuid>/original.cdr  — исходный файл
 *   os.tmpdir()/cdr-bridge-jobs/<uuid>/meta.json     — имя и время создания
 *   os.tmpdir()/cdr-bridge-jobs/<uuid>/result.*      — результаты конвертации
 * Старые задачи (> 3 часов) удаляются лениво при загрузке новых файлов.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

export const JOBS_ROOT = path.join(os.tmpdir(), "cdr-bridge-jobs");
const MAX_AGE_MS = 3 * 60 * 60 * 1000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Белый список имён файлов внутри задачи (защита от path traversal) */
export const ALLOWED_JOB_FILES = [
  "original.cdr",
  "result.svg",
  "result.pdf",
  "result.png",
  "result.ai",
  "result.cdr",
] as const;

export type AllowedJobFile = (typeof ALLOWED_JOB_FILES)[number];

export interface JobMeta {
  originalName: string;
  createdAt: number;
}

export async function ensureRoot(): Promise<void> {
  await fs.mkdir(JOBS_ROOT, { recursive: true });
}

export function isValidJobId(id: string): boolean {
  return UUID_RE.test(id);
}

export function jobPath(id: string, name: AllowedJobFile): string {
  return path.join(JOBS_ROOT, id, path.basename(name));
}

/** Создаёт задачу: сохраняет исходный CDR и метаданные, возвращает id */
export async function createJob(
  originalName: string,
  buf: Buffer
): Promise<string> {
  await ensureRoot();
  const id = randomUUID();
  const dir = path.join(JOBS_ROOT, id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(jobPath(id, "original.cdr"), buf);
  const meta: JobMeta = { originalName, createdAt: Date.now() };
  await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta));
  return id;
}

export async function readJobMeta(id: string): Promise<JobMeta | null> {
  try {
    const raw = await fs.readFile(path.join(JOBS_ROOT, id, "meta.json"), "utf8");
    return JSON.parse(raw) as JobMeta;
  } catch {
    return null;
  }
}

export async function saveOutput(
  id: string,
  name: Exclude<AllowedJobFile, "original.cdr">,
  data: Buffer
): Promise<void> {
  await fs.writeFile(jobPath(id, name), data);
}

export async function readOutput(
  id: string,
  name: AllowedJobFile
): Promise<Buffer | null> {
  try {
    return await fs.readFile(jobPath(id, name));
  } catch {
    return null;
  }
}

/** Красивое имя файла для скачивания (без расширения, только безопасные символы) */
export function prettyBaseName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "").trim();
  const cleaned = base
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/[^\p{L}\p{N} _.-]+/gu, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .trim();
  return cleaned || "drawing";
}

/** Ленивая уборка задач старше MAX_AGE_MS */
export async function cleanupOldJobs(): Promise<void> {
  try {
    await ensureRoot();
    const dirs = await fs.readdir(JOBS_ROOT);
    const now = Date.now();
    for (const d of dirs) {
      const dir = path.join(JOBS_ROOT, d);
      try {
        const st = await fs.stat(dir);
        if (now - st.mtimeMs > MAX_AGE_MS) {
          await fs.rm(dir, { recursive: true, force: true });
        }
      } catch {
        // игнорируем отдельные сбои уборки
      }
    }
  } catch {
    // корневой каталог может отсутствовать — это нормально
  }
}
