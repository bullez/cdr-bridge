"use client";

import {
  Archive,
  BadgeCheck,
  Fingerprint,
  HardDrive,
  HelpCircle,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { productByNumeric } from "@/lib/cdr-versions";
import { formatFileSize } from "./helpers";
import type { AnalyzeSuccess } from "./types";

interface FileInfoCardProps {
  analysis: AnalyzeSuccess;
}

export function FileInfoCard({ analysis }: FileInfoCardProps) {
  const { version, container, fileSize, thumbnailDataUrl, notes, fileName } =
    analysis;
  const product = version.product ?? productByNumeric(version.numeric);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Информация о файле</CardTitle>
        <CardDescription className="break-all">{fileName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {version.numeric != null ? (
            <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
              <BadgeCheck className="size-4" aria-hidden="true" />
              Версия {version.numeric}
              {product ? ` · ${product}` : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-900">
              <HelpCircle className="size-4" aria-hidden="true" />
              Неизвестная версия
            </span>
          )}

          <Badge
            variant="outline"
            className="gap-1.5 py-1 text-muted-foreground"
          >
            <Archive className="size-3.5" aria-hidden="true" />
            {container === "ZIP" ? "ZIP-контейнер" : "RIFF-контейнер"}
          </Badge>

          <Badge
            variant="outline"
            className="gap-1.5 py-1 text-muted-foreground"
          >
            <HardDrive className="size-3.5" aria-hidden="true" />
            {formatFileSize(fileSize)}
          </Badge>

          {version.char && (
            <Badge
              variant="outline"
              className="gap-1.5 py-1 font-mono text-muted-foreground"
            >
              <Fingerprint className="size-3.5" aria-hidden="true" />
              CDR{version.char}
            </Badge>
          )}
        </div>

        {thumbnailDataUrl && (
          <div>
            <img
              src={thumbnailDataUrl}
              className="max-h-40 rounded border bg-white object-contain"
              alt="Предпросмотр документа"
            />
          </div>
        )}

        {notes.length > 0 && (
          <ul className="space-y-1.5">
            {notes.map((note, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
