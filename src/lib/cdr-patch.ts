/**
 * Прямое изменение версии .cdr-файла без перекодирования содержимого.
 *
 * Как это работает: версия файла «живёт» в заголовке RIFF-потока —
 * в форм-типе "CDR<символ>" (смещение 11). Мы меняем только этот символ,
 * поэтому слои, объекты, текст и эффекты остаются байт-в-байт теми же.
 *
 * Поддерживаются оба контейнера:
 *  1. RIFF (версии 3…X5 и новее без ZIP-обёртки) — патч смещения 11.
 *  2. ZIP (CorelDRAW X6+): внутри лежит content/riffData.cdr — патчим его.
 *     Если целевая версия старше X6 (< 16), отдаём чистый RIFF-файл,
 *     потому что старые CorelDRAW не понимают ZIP-обёртку.
 *
 * Честное ограничение подхода: если макет использует возможности, которых
 * не было в целевой версии, старый CorelDRAW может упростить их или не
 * открыть файл. Поэтому вместе с результатом всегда возвращаются предупреждения.
 */

import { deflateRawSync } from "node:zlib";
import { readZipEntries, type ZipEntry } from "./cdr-container";
import { parseRiffCdrChar } from "./cdr-analyze";
import { charForNumeric } from "./cdr-versions";

/* ------------------------------------------------------------------ */
/* CRC32 (для ZIP-сборщика)                                            */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ */
/* Минимальный ZIP-сборщик (deflate, имена UTF-8)                      */
/* ------------------------------------------------------------------ */

function u16(v: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(v & 0xffff, 0);
  return b;
}

function u32(v: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(v >>> 0, 0);
  return b;
}

const DOS_TIME = 0;
// 1 января 2024, 00:00 (DOS-формат даты)
const DOS_DATE = ((2024 - 1980) << 9) | (1 << 5) | 1;

/** Собирает ZIP-архив из записей (сжатие deflate, если оно даёт выигрыш). */
export function createZip(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const crc = crc32(entry.data);
    const deflated = deflateRawSync(entry.data, { level: 6 });
    const useDeflate = deflated.length < entry.data.length;
    const compBuf = useDeflate ? deflated : entry.data;
    const method = useDeflate ? 8 : 0;

    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20), // версия для распаковки
      u16(0x0800), // флаг: имена в UTF-8
      u16(method),
      u16(DOS_TIME),
      u16(DOS_DATE),
      u32(crc),
      u32(compBuf.length),
      u32(entry.data.length),
      u16(nameBuf.length),
      u16(0), // extra len
      nameBuf,
      compBuf,
    ]);
    locals.push(local);

    const central = Buffer.concat([
      u32(0x02014b50),
      u16(20), // версия, создавшая архив
      u16(20), // версия для распаковки
      u16(0x0800),
      u16(method),
      u16(DOS_TIME),
      u16(DOS_DATE),
      u32(crc),
      u32(compBuf.length),
      u32(entry.data.length),
      u16(nameBuf.length),
      u16(0), // extra len
      u16(0), // comment len
      u16(0), // номер диска
      u16(0), // внутренние атрибуты
      u32(0), // внешние атрибуты
      u32(offset),
      nameBuf,
    ]);
    centrals.push(central);
    offset += local.length;
  }

  const cd = Buffer.concat(centrals);
  const eocd = Buffer.concat([
    u32(0x06054b50),
    u16(0), // номер диска
    u16(0), // диск с каталогом
    u16(entries.length),
    u16(entries.length),
    u32(cd.length),
    u32(offset),
    u16(0), // длина комментария
  ]);

  return Buffer.concat([...locals, cd, eocd]);
}

/* ------------------------------------------------------------------ */
/* Патчер версии                                                       */
/* ------------------------------------------------------------------ */

/** Начиная с этой версии .cdr хранится в ZIP-контейнере (CorelDRAW X6). */
const MIN_ZIP_CONTAINER_VERSION = 16;

export interface VersionPatchOk {
  ok: true;
  buffer: Buffer;
  outContainer: "RIFF" | "ZIP";
  warnings: string[];
}

export interface VersionPatchFail {
  ok: false;
  error: string;
}

export type VersionPatchResult = VersionPatchOk | VersionPatchFail;

function baseWarnings(targetNumeric: number): string[] {
  return [
    `Изменён только заголовок: символ версии заменён на ${targetNumeric} (${charForNumeric(targetNumeric)}). Само содержимое — слои, объекты, текст — не тронуто и не перекодировалось.`,
    "Если в макете использованы возможности новых версий (новые типы заливок, линзы, эффекты), старая версия CorelDRAW может упростить их или не показать.",
    "Сохраните резервную копию исходного файла — на случай, если ваша версия CorelDRAW откажется открывать документ.",
  ];
}

/**
 * Меняет версию .cdr-файла на targetNumeric.
 * Контейнер (RIFF или ZIP) определяется автоматически.
 */
export function patchCdrVersion(
  src: Buffer,
  targetNumeric: number
): VersionPatchResult {
  const targetChar = charForNumeric(targetNumeric);
  const targetByte = targetChar.charCodeAt(0);

  // 1. Классический RIFF-контейнер: достаточно поменять символ версии.
  if (parseRiffCdrChar(src) != null) {
    const out = Buffer.from(src);
    out[11] = targetByte;
    return {
      ok: true,
      buffer: out,
      outContainer: "RIFF",
      warnings: baseWarnings(targetNumeric),
    };
  }

  // 2. ZIP-контейнер (CorelDRAW X6+): патчим content/riffData.cdr внутри.
  if (src.length > 4 && src[0] === 0x50 && src[1] === 0x4B) {
    let entries: ZipEntry[];
    try {
      entries = readZipEntries(src);
    } catch {
      return {
        ok: false,
        error: "ZIP-контейнер повреждён или не читается.",
      };
    }
    if (entries.length === 0) {
      return { ok: false, error: "ZIP-контейнер пуст или не читается." };
    }

    const riffIndex = entries.findIndex(
      (entry) => parseRiffCdrChar(entry.data) != null
    );
    if (riffIndex < 0) {
      return {
        ok: false,
        error:
          "Внутри ZIP-контейнера не найдены данные CorelDRAW (content/riffData.cdr).",
      };
    }

    const inner = Buffer.from(entries[riffIndex].data);
    inner[11] = targetByte;

    // Целевая версия старше X6 — отдаём чистый RIFF без ZIP-обёртки:
    // старые CorelDRAW не понимают ZIP-контейнер.
    if (targetNumeric < MIN_ZIP_CONTAINER_VERSION) {
      return {
        ok: true,
        buffer: inner,
        outContainer: "RIFF",
        warnings: [
          ...baseWarnings(targetNumeric),
          "Файл распакован из ZIP-контейнера в классический формат RIFF — его понимают все версии CorelDRAW, начиная с самых старых.",
        ],
      };
    }

    const newEntries = entries.map((entry, i) =>
      i === riffIndex ? { ...entry, data: inner } : entry
    );
    return {
      ok: true,
      buffer: createZip(newEntries),
      outContainer: "ZIP",
      warnings: baseWarnings(targetNumeric),
    };
  }

  return {
    ok: false,
    error:
      "Сигнатура CorelDRAW не найдена: файл не является .cdr или повреждён.",
  };
}
