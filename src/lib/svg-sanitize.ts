/**
 * Санитайзер SVG-экспорта LibreOffice.
 *
 * LibreOffice (25.x) при экспорте в SVG оборачивает страницы в
 * <g visibility="hidden"> и добавляет встроенный скрипт (~450 КБ), который
 * показывает их только при открытии файла как документа. Такие SVG выглядят
 * ПУСТЫМИ в контексте <img>, а также в редакторах, которые игнорируют скрипты
 * (Adobe Illustrator, Inkscape, импорт в CorelDRAW).
 *
 * Этот модуль пересобирает экспорт в «плоский» статичный SVG:
 *   - убирает DOCTYPE и все <script>;
 *   - убирает служебные группы (ooo:meta, DummySlide, master-страницы);
 *   - вытаскивает реальные страницы (g.Slide) из скрытых обёрток;
 *   - сохраняет все <defs> (клипы, градиенты, маркеры).
 * Если структура не распознана, возвращается null — вызывающий код оставит
 * исходный файл как есть.
 */

export interface SanitizeResult {
  ok: boolean;
  reason?: string;
  svg?: Buffer;
}

interface Token {
  kind: "open" | "close" | "self";
  tag: string;
  raw: string;
  start: number;
  end: number;
}

/** Сканирует теги с учётом кавычек в атрибутах */
function tokenize(xml: string, from: number, to: number): Token[] {
  const tokens: Token[] = [];
  let i = from;
  while (i < to) {
    const lt = xml.indexOf("<", i);
    if (lt < 0 || lt >= to) break;
    if (xml.startsWith("<!--", lt)) {
      const end = xml.indexOf("-->", lt);
      i = end < 0 ? to : end + 3;
      continue;
    }
    // Ищем '>' вне кавычек
    let j = lt + 1;
    let quote: string | null = null;
    while (j < to) {
      const ch = xml[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ">") {
        break;
      }
      j++;
    }
    if (j >= to) break;
    const raw = xml.slice(lt, j + 1);
    const inner = raw.slice(1, -1).trim();
    if (inner.startsWith("?")) {
      i = j + 1;
      continue; // XML-декларация
    }
    const self = inner.endsWith("/");
    const closed = inner.startsWith("/");
    const nameMatch = inner.match(/^\/?\s*([a-zA-Z][\w.:-]*)/);
    if (!nameMatch) {
      i = j + 1;
      continue;
    }
    tokens.push({
      kind: closed ? "close" : self ? "self" : "open",
      tag: nameMatch[1],
      raw,
      start: lt,
      end: j + 1,
    });
    i = j + 1;
  }
  return tokens;
}

/** Возвращает индекс токена, закрывающего subtree, открытый токеном start */
function findCloseToken(tokens: Token[], start: number): number {
  let depth = 0;
  for (let k = start; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.kind === "open") depth++;
    else if (t.kind === "close") {
      depth--;
      if (depth === 0) return k;
    }
  }
  return -1;
}

function attr(raw: string, name: string): string | null {
  const m = raw.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}

/** Обрезает subtree до конца текста закрывающего токена */
function sliceSubtree(xml: string, tokens: Token[], openIdx: number): string {
  const closeIdx = findCloseToken(tokens, openIdx);
  const end = closeIdx < 0 ? tokens[openIdx].end : tokens[closeIdx].end;
  return xml.slice(tokens[openIdx].start, end);
}

export function sanitizeLibreOfficeSvg(buf: Buffer): SanitizeResult {
  const xml = buf.toString("utf8");

  // Похоже ли это на экспорт LibreOffice со скрытыми страницами?
  const isLoExport = xml.includes("xmlns:ooo=") || xml.includes('class="SlideGroup"');
  if (!isLoExport) {
    return { ok: false, reason: "не похоже на экспорт LibreOffice" };
  }
  // Если скрытых обёрток нет — файл уже статичный
  if (!xml.includes('class="SlideGroup"')) {
    return { ok: false, reason: "обёртки SlideGroup отсутствуют" };
  }

  // Корневой тег <svg ...>
  const rootMatch = xml.match(/<svg\b[^>]*>/);
  if (!rootMatch) return { ok: false, reason: "корневой <svg> не найден" };
  const viewBox = attr(rootMatch[0], "viewBox") ?? "";

  // Тело между корневым тегом и закрывающим </svg>
  const bodyStart = (rootMatch.index ?? 0) + rootMatch[0].length;
  const bodyEnd = xml.lastIndexOf("</svg>");
  if (bodyEnd <= bodyStart) return { ok: false, reason: "не найден </svg>" };

  const tokens = tokenize(xml, bodyStart, bodyEnd);

  const parts: string[] = [];
  let slides = 0;

  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.kind !== "open") continue;

    if (t.tag === "defs") {
      parts.push(sliceSubtree(xml, tokens, k));
      const closeIdx = findCloseToken(tokens, k);
      if (closeIdx > 0) k = closeIdx; // продолжаем после subtree
    } else if (t.tag === "g" && (attr(t.raw, "class") ?? "").includes("SlideGroup")) {
      // Внутри SlideGroup ищем первую страницу g.Slide
      const closeIdx = findCloseToken(tokens, k);
      const stop = closeIdx < 0 ? tokens.length : closeIdx;
      for (let m = k + 1; m < stop; m++) {
        const inner = tokens[m];
        if (
          inner.kind === "open" &&
          inner.tag === "g" &&
          (attr(inner.raw, "class") ?? "").split(/\s+/).includes("Slide")
        ) {
          parts.push(sliceSubtree(xml, tokens, m));
          slides++;
          const innerClose = findCloseToken(tokens, m);
          if (innerClose > 0) m = innerClose;
          break; // по одной странице на SlideGroup
        }
      }
      if (closeIdx > 0) k = closeIdx;
    }
    // Остальное (script, DummySlide, meta) пропускаем
  }

  if (slides === 0) return { ok: false, reason: "страницы Slide не найдены" };

  // Берём исходный корневой тег как есть: в нём все объявления пространств имён
  // (ooo:, anim:, presentation: …), которые используются внутри страниц.
  // Убираем только version="1.2" (не влияет) — атрибуты width/height у LO
  // отсутствуют, размер задаётся viewBox.
  const rootTag = rootMatch[0].replace(/\sversion="[^"]*"/, "");

  const out = `<?xml version="1.0" encoding="UTF-8"?>\n${rootTag}\n${parts.join(
    "\n"
  )}\n</svg>\n`;

  return { ok: true, svg: Buffer.from(out, "utf8") };
}
