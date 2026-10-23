"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCode2,
  FileText,
  Image,
  Loader2,
  PenTool,
  type LucideIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { withInline } from "./helpers";
import type { ConvertSuccess, CdrFormat } from "./types";

const FORMATS: {
  value: CdrFormat;
  label: string;
  icon: LucideIcon;
  description: string;
}[] = [
  {
    value: "svg",
    label: "SVG",
    icon: FileCode2,
    description:
      "Слои и группы сохраняются. Лучший вариант для импорта в старый CorelDRAW и в Illustrator.",
  },
  {
    value: "pdf",
    label: "PDF",
    icon: FileText,
    description:
      "Универсальный векторный формат. Открывается в Illustrator, Acrobat и CorelDRAW (импорт).",
  },
  {
    value: "ai",
    label: "AI",
    icon: PenTool,
    description:
      "Adobe Illustrator (PDF-совместимый .ai). Открывается напрямую в Illustrator.",
  },
  {
    value: "png",
    label: "PNG",
    icon: Image,
    description: "Растровое превью для быстрого просмотра.",
  },
];

interface ConvertCardProps {
  selectedFormat: CdrFormat;
  onFormatChange: (format: CdrFormat) => void;
  converting: boolean;
  onConvert: () => void;
  result: ConvertSuccess | null;
  error: string | null;
}

export function ConvertCard({
  selectedFormat,
  onFormatChange,
  converting,
  onConvert,
  result,
  error,
}: ConvertCardProps) {
  return (
    <Card id="convert" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Конвертация</CardTitle>
        <CardDescription>
          Выберите целевой формат — конвертация выполняется на сервере, слои и
          группы переносятся в результат.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          role="radiogroup"
          aria-label="Целевой формат конвертации"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FORMATS.map((format) => {
            const selected = format.value === selectedFormat;
            const Icon = format.icon;
            return (
              <button
                key={format.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={converting}
                onClick={() => onFormatChange(format.value)}
                className={cn(
                  "flex h-full flex-col items-start gap-2 rounded-xl border p-4 text-left outline-none transition-all",
                  "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                  selected
                    ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-500"
                    : "border-border hover:border-emerald-300 hover:bg-emerald-50/40",
                  converting && "cursor-default opacity-70"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg transition-colors",
                    selected
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="font-semibold">{format.label}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {format.description}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Ошибка конвертации</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-2 text-emerald-900">
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="break-all font-semibold">
                  Готово: {result.fileName}
                </p>
                <p className="text-sm text-emerald-800">
                  Выполнено: {result.engine}
                </p>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
                <AlertTriangle />
                <AlertTitle>Важные ограничения</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4">
                    {result.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {result.format === "svg" && (
              <div>
                <img
                  src={withInline(result.downloadUrl)}
                  className="max-h-96 w-full rounded border bg-white object-contain"
                  alt="Предпросмотр SVG"
                />
              </div>
            )}

            <Button
              asChild
              size="lg"
              className="min-h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
            >
              <a href={result.downloadUrl}>
                <Download className="size-4" aria-hidden="true" />
                Скачать {result.fileName}
              </a>
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Button
            type="button"
            size="lg"
            onClick={onConvert}
            disabled={converting}
            className="min-h-11 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {converting ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Конвертирую…
              </>
            ) : (
              "Конвертировать"
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            {converting
              ? "Документ проходит через LibreOffice Draw — не закрывайте страницу."
              : "Конвертация обычно занимает несколько секунд."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
