/** Утилиты фронтенда CDR Bridge: сеть, форматирование, прокрутка. */

/**
 * fetch + разбор JSON с аккуратными ошибками на русском.
 * Если ответ не 2xx — пытаемся прочитать { error } из тела.
 */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error(
      "Сервер недоступен. Проверьте подключение и попробуйте ещё раз."
    );
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const message = (payload as { error?: string } | null)?.error;
    throw new Error(message ?? `Ошибка сервера (${res.status}).`);
  }

  return payload as T;
}

/** Размер файла в человекочитаемом виде: Б / КБ / МБ (ru-локаль, 1 знак после запятой). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} КБ`;
  const mb = kb / 1024;
  return `${mb.toLocaleString("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} МБ`;
}

/** Плавная прокрутка к секции конвертации (id="convert"). */
export function scrollToConvert(): void {
  document
    .getElementById("convert")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Плавная прокрутка к секции смены версии (id="version-change"). */
export function scrollToVersionChange(): void {
  document
    .getElementById("version-change")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Присоединяет ?inline=1 к downloadUrl (для предпросмотра в <img>). */
export function withInline(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}inline=1`;
}
