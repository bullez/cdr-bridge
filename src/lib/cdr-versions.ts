/**
 * Общие метаданные о версиях CorelDRAW.
 * Файл используется и на клиенте, и на сервере — только чистый TypeScript.
 *
 * Сигнатура CDR: RIFF-контейнер с форм-типом "CDR" + символ версии:
 *   '3'..'9' → версии 3..9 (CorelDRAW 3..9)
 *   'A'..'R' → версии 10..27 (CorelDRAW 10 … CorelDRAW 2025)
 * Начиная с X6 (v16) .cdr — это ZIP-контейнер с content/riffData.cdr внутри.
 */

export interface CdrVersionRow {
  /** Символ версии в файле ("CDR" + символ) */
  char: string;
  /** Числовой номер версии */
  numeric: number;
  /** Название продукта */
  product: string;
  /** Год выпуска (если известен) */
  year?: string;
}

const PRODUCTS: Record<number, { product: string; year?: string }> = {
  3: { product: "CorelDRAW 3", year: "1992" },
  4: { product: "CorelDRAW 4", year: "1994" },
  5: { product: "CorelDRAW 5", year: "1995" },
  6: { product: "CorelDRAW 6", year: "1996" },
  7: { product: "CorelDRAW 7", year: "1997" },
  8: { product: "CorelDRAW 8", year: "1998" },
  9: { product: "CorelDRAW 9", year: "2000" },
  10: { product: "CorelDRAW 10", year: "2001" },
  11: { product: "CorelDRAW 11", year: "2002" },
  12: { product: "CorelDRAW 12", year: "2003" },
  13: { product: "CorelDRAW X3", year: "2006" },
  14: { product: "CorelDRAW X4", year: "2008" },
  15: { product: "CorelDRAW X5", year: "2010" },
  16: { product: "CorelDRAW X6", year: "2012" },
  17: { product: "CorelDRAW X7", year: "2014" },
  18: { product: "CorelDRAW X8", year: "2016" },
  19: { product: "CorelDRAW 2017", year: "2017" },
  20: { product: "CorelDRAW 2018", year: "2018" },
  21: { product: "CorelDRAW 2019", year: "2019" },
  22: { product: "CorelDRAW 2020", year: "2020" },
  23: { product: "CorelDRAW 2021", year: "2021" },
  24: { product: "CorelDRAW 2022", year: "2022" },
  25: { product: "CorelDRAW 2023", year: "2023" },
  26: { product: "CorelDRAW 2024", year: "2024" },
  27: { product: "CorelDRAW 2025", year: "2025" },
};

/** Числовой номер → символ версии в файле */
export function charForNumeric(numeric: number): string {
  if (numeric < 10) return String(numeric);
  return String.fromCharCode(65 + numeric - 10);
}

/**
 * Символ версии → числовой номер.
 * 'A' → 10, 'O' → 24 (CorelDRAW 2022), 'R' → 27 (CorelDRAW 2025).
 */
export function numericFromChar(ch: string): number | null {
  if (ch.length !== 1) return null;
  if (ch >= "3" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch >= "A" && ch <= "Z") return 10 + (ch.charCodeAt(0) - 65);
  return null;
}

/** Числовой номер → название продукта */
export function productByNumeric(numeric: number | null): string | null {
  if (numeric == null) return null;
  const found = PRODUCTS[numeric];
  return found ? found.product : `CorelDRAW v${numeric}`;
}

/** Полная таблица версий (3..27) для справочника в интерфейсе */
export const CDR_VERSION_TABLE: CdrVersionRow[] = (() => {
  const rows: CdrVersionRow[] = [];
  for (let n = 3; n <= 27; n++) {
    rows.push({
      char: charForNumeric(n),
      numeric: n,
      product: productByNumeric(n) as string,
      year: PRODUCTS[n]?.year,
    });
  }
  return rows;
})();

/** Варианты для селектора «Ваша версия CorelDRAW» (7..27) */
export const USER_COREL_OPTIONS: { numeric: number; label: string }[] =
  CDR_VERSION_TABLE.filter((r) => r.numeric >= 7).map((r) => ({
    numeric: r.numeric,
    label: `${r.product} (v${r.numeric})`,
  }));
