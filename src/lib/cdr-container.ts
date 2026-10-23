/**
 * Минимальный читатель ZIP-контейнеров без внешних зависимостей (node:zlib).
 * Начиная с CorelDRAW X6 (v16) файлы .cdr представляют собой ZIP-архив:
 *   content/riffData.cdr — основной RIFF-поток с данными рисунка;
 *   metadata/thumbnail.png — миниатюра предпросмотра.
 * Поддерживаются методы хранения 0 (stored) и 8 (deflate) — этого достаточно.
 */

import { inflateRawSync } from "node:zlib";

export interface ZipEntry {
  name: string;
  data: Buffer;
}

const EOCD_SIG = 0x06054b50;
const CDH_SIG = 0x02014b50;
const LFH_SIG = 0x04034b50;

/**
 * Читает выбранные записи ZIP (фильтр wanted по имени файла).
 * Бросает ошибку, если это не ZIP (EOCD не найден).
 */
export function readZipEntries(
  buf: Buffer,
  wanted?: (name: string) => boolean
): ZipEntry[] {
  // Ищем EOCD в последних 64 КБ (учитывая возможный комментарий архива)
  const scanFrom = Math.max(0, buf.length - 66000);
  let eocd = -1;
  for (let i = buf.length - 22; i >= scanFrom; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP: EOCD not found");

  const totalEntries = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (cdOffset === 0xffffffff || totalEntries === 0xffff) {
    throw new Error("ZIP64 is not supported");
  }

  const entries: ZipEntry[] = [];
  let p = cdOffset;
  for (let n = 0; n < totalEntries && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== CDH_SIG) break;

    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;

    if (wanted && !wanted(name)) continue;
    if (localOffset + 30 > buf.length) continue;
    if (buf.readUInt32LE(localOffset) !== LFH_SIG) continue;

    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    if (dataStart + compSize > buf.length) continue;

    const raw = buf.subarray(dataStart, dataStart + compSize);
    let data: Buffer;
    if (method === 0) {
      data = Buffer.from(raw); // stored — копируем, чтобы не держать весь архив
    } else if (method === 8) {
      data = inflateRawSync(raw);
    } else {
      continue; // неизвестный метод — пропускаем
    }
    entries.push({ name, data });
  }
  return entries;
}
