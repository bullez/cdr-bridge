"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Loader2,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatFileSize } from "./helpers";

interface DropzoneCardProps {
  uploading: boolean;
  /** Текст ошибки анализа (inline Alert поверх зоны загрузки) */
  error: string | null;
  /** Успешно загруженный файл — компактная строка результата */
  loaded: { fileName: string; fileSize: number } | null;
  onFile: (file: File) => void;
  onReset: () => void;
}

export function DropzoneCard({
  uploading,
  error,
  loaded,
  onFile,
  onReset,
}: DropzoneCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const openPicker = useCallback(() => {
    if (!uploading) inputRef.current?.click();
  }, [uploading]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Загрузите .cdr-файл</CardTitle>
        <CardDescription>
          Файл анализируется на сервере: определим версию CorelDRAW, контейнер и
          покажем превью, если оно есть внутри документа.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Ошибка анализа</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".cdr"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />

        {loaded ? (
          <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-start gap-3 text-emerald-900">
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="break-all font-medium">
                  Файл загружен: {loaded.fileName}
                </p>
                <p className="text-sm text-emerald-800">
                  Размер: {formatFileSize(loaded.fileSize)} — подробности в
                  карточке ниже
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onReset}
              className="shrink-0 border-emerald-300 hover:bg-emerald-100"
            >
              Загрузить другой файл
            </Button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label="Перетащите .cdr-файл сюда или нажмите для выбора"
            aria-disabled={uploading}
            onClick={openPicker}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openPicker();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!uploading) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (uploading) return;
              const file = e.dataTransfer.files[0];
              if (file) onFile(file);
            }}
            className={cn(
              "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
              dragActive
                ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-500"
                : "border-border hover:border-emerald-400 hover:bg-emerald-50/40",
              uploading && "cursor-default pointer-events-none opacity-70"
            )}
          >
            {uploading ? (
              <>
                <Loader2
                  className="size-10 animate-spin text-emerald-600"
                  aria-hidden="true"
                />
                <p className="font-medium">Определяем версию…</p>
                <p className="text-sm text-muted-foreground">
                  Обычно это занимает несколько секунд
                </p>
              </>
            ) : (
              <>
                <span
                  aria-hidden="true"
                  className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                >
                  <FileUp className="size-7" />
                </span>
                <p className="font-medium">
                  Перетащите .cdr сюда или нажмите для выбора
                </p>
                <p className="text-sm text-muted-foreground">
                  Поддерживаются CDR 3–27: RIFF- и ZIP-контейнеры
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
