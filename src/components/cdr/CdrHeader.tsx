"use client";

import { Github, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { EngineInfo } from "./types";

interface CdrHeaderProps {
  /** null = статус ещё загружается */
  engine: EngineInfo | null;
}

function engineStatus(engine: EngineInfo | null): {
  label: string;
  available: boolean | null;
} {
  if (engine === null) {
    return { label: "Проверяем движок…", available: null };
  }
  if (engine.available) {
    const shortVersion = engine.version
      ? engine.version.split(".").slice(0, 2).join(".")
      : null;
    const bin = engine.engine ?? "";
    const name = /soffice|libreoffice/i.test(bin)
      ? "LibreOffice"
      : bin || "Движок";
    return { label: [name, shortVersion].filter(Boolean).join(" ") + " — готов", available: true };
  }
  return { label: "Движок недоступен", available: false };
}

export function CdrHeader({ engine }: CdrHeaderProps) {
  const status = engineStatus(engine);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm"
          >
            <Layers className="size-5" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-semibold tracking-tight">CDR Bridge</p>
            <p className="truncate text-xs text-muted-foreground">
              конвертер файлов CorelDRAW
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Компактный индикатор статуса для мобильных */}
          <span className="inline-flex sm:hidden" role="status">
            {status.available === null ? (
              <Skeleton className="size-3 rounded-full" />
            ) : (
              <span
                aria-hidden="true"
                className={`size-3 rounded-full ${
                  status.available ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            )}
            <span className="sr-only">{status.label}</span>
          </span>

          {/* Полный бейдж для планшетов и десктопа */}
          <span className="hidden sm:inline-flex" role="status">
            {status.available === null ? (
              <Skeleton className="h-6 w-44 rounded-md" />
            ) : status.available ? (
              <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                {status.label}
              </Badge>
            ) : (
              <Badge className="border-amber-200 bg-amber-100 text-amber-800">
                {status.label}
              </Badge>
            )}
          </span>

          <Button variant="ghost" size="icon" asChild>
            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              aria-label="Исходный код проекта на GitHub"
            >
              <Github className="size-5" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
