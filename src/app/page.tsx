"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CdrHeader } from "@/components/cdr/CdrHeader";
import { DropzoneCard } from "@/components/cdr/DropzoneCard";
import { FileInfoCard } from "@/components/cdr/FileInfoCard";
import { CompatibilityCard } from "@/components/cdr/CompatibilityCard";
import { VersionChangeCard } from "@/components/cdr/VersionChangeCard";
import { ConvertCard } from "@/components/cdr/ConvertCard";
import { VersionTableCard } from "@/components/cdr/VersionTableCard";
import { FaqCard } from "@/components/cdr/FaqCard";
import { fetchJson } from "@/components/cdr/helpers";
import type {
  AnalyzeResponse,
  AnalyzeSuccess,
  ConvertResponse,
  ConvertSuccess,
  CdrFormat,
  EngineInfo,
} from "@/components/cdr/types";

export default function Home() {
  const [engine, setEngine] = useState<EngineInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeSuccess | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [userVersion, setUserVersion] = useState<number | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<CdrFormat>("svg");
  const [converting, setConverting] = useState(false);
  const [conversion, setConversion] = useState<ConvertSuccess | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);

  /** Статус движка конвертации — один запрос при монтировании. */
  useEffect(() => {
    let cancelled = false;
    fetchJson<EngineInfo>("/api/cdr/engine")
      .then((info) => {
        if (!cancelled) setEngine(info);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Движок недоступен.";
          setEngine({ available: false, error: message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetFile = useCallback(() => {
    setAnalysis(null);
    setAnalysisError(null);
    setConversion(null);
    setConversionError(null);
  }, []);

  /** Анализ загруженного .cdr-файла. */
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".cdr")) {
      toast.warning(
        "Расширение файла — не .cdr. Попробуем разобрать его, но результат не гарантирован."
      );
    }

    setUploading(true);
    setAnalysisError(null);
    setAnalysis(null);
    setConversion(null);
    setConversionError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const data = await fetchJson<AnalyzeResponse>("/api/cdr/analyze", {
        method: "POST",
        body: form,
      });

      if (data.ok) {
        setAnalysis(data);
        toast.success("Версия файла определена");
      } else {
        setAnalysisError(data.error);
        toast.error(data.error);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Не удалось загрузить файл.";
      setAnalysisError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }, []);

  /** Конвертация текущего файла в выбранный формат. */
  const handleConvert = useCallback(async () => {
    if (!analysis || converting) return;

    setConverting(true);
    setConversionError(null);
    setConversion(null);

    try {
      const data = await fetchJson<ConvertResponse>("/api/cdr/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: analysis.id, format: selectedFormat }),
      });

      if (data.ok) {
        setConversion(data);
        toast.success(`Конвертация в ${data.format.toUpperCase()} завершена`);
      } else {
        setConversionError(data.error);
        toast.error(data.error);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Не удалось выполнить конвертацию.";
      setConversionError(message);
      toast.error(message);
    } finally {
      setConverting(false);
    }
  }, [analysis, converting, selectedFormat]);

  const handleFormatChange = useCallback((format: CdrFormat) => {
    setSelectedFormat(format);
    setConversion(null);
    setConversionError(null);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CdrHeader engine={engine} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6">
        {/* Hero */}
        <section
          aria-labelledby="hero-title"
          className="py-10 text-center sm:py-14"
        >
          <h1
            id="hero-title"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Изменяйте версию файлов CorelDRAW
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Файл версии 24, а у вас CorelDRAW 19? Определим версию .cdr, понизим
            её без потери слоёв, а при необходимости конвертируем файл в SVG,
            PDF или AI для Adobe Illustrator — со слоями и группами.
          </p>
        </section>

        <div className="space-y-6 pb-16">
          {engine !== null && !engine.available && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
              <AlertTriangle />
              <AlertTitle>Движок конвертации недоступен</AlertTitle>
              <AlertDescription>
                {engine.error ??
                  "Определение версии файла работает, но конвертация может завершиться ошибкой."}
              </AlertDescription>
            </Alert>
          )}

          {/* Загрузка файла */}
          <section aria-label="Загрузка .cdr-файла">
            <DropzoneCard
              uploading={uploading}
              error={analysisError}
              loaded={
                analysis
                  ? { fileName: analysis.fileName, fileSize: analysis.fileSize }
                  : null
              }
              onFile={handleFile}
              onReset={resetFile}
            />
          </section>

          {analysis && (
            <section aria-label="Информация о файле">
              <FileInfoCard analysis={analysis} />
            </section>
          )}

          {analysis && (
            <section aria-label="Проверка совместимости с вашей версией CorelDRAW">
              <CompatibilityCard
                version={analysis.version}
                userVersion={userVersion}
                onUserVersionChange={setUserVersion}
              />
            </section>
          )}

          {analysis && (
            <section aria-label="Смена версии CDR">
              <VersionChangeCard
                jobId={analysis.id}
                version={analysis.version}
                container={analysis.container}
                userVersion={userVersion}
              />
            </section>
          )}

          {analysis && (
            <section aria-label="Конвертация файла">
              <ConvertCard
                selectedFormat={selectedFormat}
                onFormatChange={handleFormatChange}
                converting={converting}
                onConvert={handleConvert}
                result={conversion}
                error={conversionError}
              />
            </section>
          )}

          <section aria-label="Справочник версий CorelDRAW">
            <VersionTableCard
              currentNumeric={analysis?.version.numeric ?? null}
            />
          </section>

          <section aria-label="Частые вопросы">
            <FaqCard />
          </section>
        </div>
      </main>

      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left">
          <p className="text-sm text-muted-foreground">
            CDR Bridge — открытый инструмент для работы с файлами CorelDRAW
          </p>
          <div className="text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} CDR Bridge</p>
            <p className="text-muted-foreground/70">
              Работает на LibreOffice Draw / libcdr
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
