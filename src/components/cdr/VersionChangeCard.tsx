"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileDown,
  History,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_COREL_OPTIONS, productByNumeric } from "@/lib/cdr-versions";
import { fetchJson } from "./helpers";
import type { ConvertSuccess, FileVersion } from "./types";

interface VersionChangeCardProps {
  jobId: string;
  version: FileVersion;
  container: "RIFF" | "ZIP";
  userVersion: number | null;
}

/**
 * Прямое изменение версии .cdr-файла: меняем заголовок, содержимое
 * (слои, объекты, текст) остаётся байт-в-байт тем же.
 */
export function VersionChangeCard({
  jobId,
  version,
  container,
  userVersion,
}: VersionChangeCardProps) {
  const [targetNumeric, setTargetNumeric] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<ConvertSuccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () =>
      USER_COREL_OPTIONS.filter(
        (option) =>
          version.numeric == null || option.numeric < version.numeric
      ),
    [version.numeric]
  );

  /** Дефолт цели: версия пользователя, если она ниже версии файла. */
  useEffect(() => {
    setResult(null);
    setError(null);
    if (version.numeric == null) {
      setTargetNumeric(null);
      return;
    }
    if (userVersion != null && userVersion < version.numeric) {
      setTargetNumeric(userVersion);
      return;
    }
    setTargetNumeric(
      options.length > 0 ? options[options.length - 1].numeric : null
    );
  }, [jobId, version.numeric, userVersion, options]);

  const convert = async () => {
    if (targetNumeric == null || converting) return;
    setConverting(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchJson<ConvertSuccess>("/api/cdr/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: jobId,
          format: "cdr",
          targetNumeric,
        }),
      });
      if (data.ok) {
        setResult(data);
      } else {
        setError(data.error);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Не удалось изменить версию файла.";
      setError(message);
    } finally {
      setConverting(false);
    }
  };

  const fileProduct =
    version.product ?? productByNumeric(version.numeric) ?? "файл";
  const compatible =
    userVersion != null &&
    version.numeric != null &&
    version.numeric <= userVersion;
  const targetLabel =
    options.find((option) => option.numeric === targetNumeric)?.label ?? "";

  return (
    <Card id="version-change" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <History className="size-5 text-emerald-600" aria-hidden="true" />
          Смена версии файла — без конвертации
        </CardTitle>
        <CardDescription>
          Меняем только заголовок .cdr, чтобы файл объявлял себя более старой
          версией. Слои, объекты и текст остаются нетронутыми — ничего не
          перекодируется.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Текущая версия файла:</span>
          <Badge
            variant="outline"
            className="border-emerald-300 bg-emerald-50 text-emerald-800"
          >
            {version.numeric != null
              ? `${fileProduct} (v${version.numeric})`
              : "не определена"}
          </Badge>
          <Badge variant="secondary">
            контейнер {container}
          </Badge>
        </div>

        {version.numeric == null ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
            <AlertTriangle />
            <AlertTitle>Версию определить не удалось</AlertTitle>
            <AlertDescription>
              Прямая смена версии недоступна. Используйте конвертацию в SVG/PDF
              ниже — она не зависит от версии файла.
            </AlertDescription>
          </Alert>
        ) : options.length === 0 ? (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-600">
            <CheckCircle2 />
            <AlertTitle>Понижать нечего</AlertTitle>
            <AlertDescription>
              Файл уже сохранён в одной из самых старых версий CorelDRAW —
              более ранних просто нет.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {compatible && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-600">
                <CheckCircle2 />
                <AlertTitle>Файл совместим с вашей версией</AlertTitle>
                <AlertDescription>
                  Понижение не требуется — но вы всё равно можете сохранить файл
                  в любой из более старых версий, если это нужно.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="target-cdr-version">
                Целевая версия CorelDRAW
              </Label>
              <Select
                value={targetNumeric != null ? String(targetNumeric) : ""}
                onValueChange={(value) => {
                  setTargetNumeric(Number(value));
                  setResult(null);
                  setError(null);
                }}
              >
                <SelectTrigger
                  id="target-cdr-version"
                  aria-label="Целевая версия CorelDRAW"
                  className="w-full sm:w-80"
                >
                  <SelectValue placeholder="Выберите версию" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem
                      key={option.numeric}
                      value={String(option.numeric)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Alert className="border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
              <AlertTriangle />
              <AlertTitle>Как это работает</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    Меняется только символ версии в заголовке — содержимое
                    остаётся тем же.
                  </li>
                  <li>
                    Если макет использует эффекты новых версий, старый CorelDRAW
                    может их упростить или не показать.
                  </li>
                  <li>Держите резервную копию исходного файла.</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <Button
                type="button"
                size="lg"
                onClick={convert}
                disabled={converting || targetNumeric == null}
                className="min-h-11 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {converting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Меняю версию…
                  </>
                ) : (
                  <>
                    <FileDown className="size-4" aria-hidden="true" />
                    Изменить версию
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                {targetNumeric != null
                  ? `Файл будет пересохранён как версия ${targetNumeric} — ${targetLabel}.`
                  : "Выберите целевую версию."}
              </p>
            </div>
          </>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Не удалось изменить версию</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && result.ok && (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-2 text-emerald-900">
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="break-all font-semibold">
                  Готово: {result.fileName}
                </p>
                <p className="text-sm text-emerald-800">{result.engine}</p>
              </div>
            </div>

            <ul className="list-disc space-y-1 pl-5 text-sm text-emerald-900">
              {result.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>

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
      </CardContent>
    </Card>
  );
}
