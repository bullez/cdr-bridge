"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  FileDown,
  HelpCircle,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_COREL_OPTIONS, productByNumeric } from "@/lib/cdr-versions";
import { scrollToConvert, scrollToVersionChange } from "./helpers";
import type { FileVersion } from "./types";

interface CompatibilityCardProps {
  version: FileVersion;
  userVersion: number | null;
  onUserVersionChange: (numeric: number) => void;
}

export function CompatibilityCard({
  version,
  userVersion,
  onUserVersionChange,
}: CompatibilityCardProps) {
  const fileProduct = version.product ?? productByNumeric(version.numeric) ?? "файл";
  const selectedLabel =
    USER_COREL_OPTIONS.find((o) => o.numeric === userVersion)?.label ?? "";

  let verdict: ReactNode;
  if (userVersion == null) {
    verdict = (
      <p className="text-sm text-muted-foreground">
        Выберите вашу версию, чтобы проверить совместимость.
      </p>
    );
  } else if (version.numeric == null) {
    verdict = (
      <Alert className="border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
        <HelpCircle />
        <AlertTitle>Версию файла определить не удалось</AlertTitle>
        <AlertDescription>
          Проверить совместимость автоматически нельзя. Попробуйте открыть файл
          в вашей версии CorelDRAW через Файл → Импорт.
        </AlertDescription>
      </Alert>
    );
  } else if (version.numeric <= userVersion) {
    verdict = (
      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-600">
        <CheckCircle2 />
        <AlertTitle>Совместимо!</AlertTitle>
        <AlertDescription>
          {fileProduct} откроется в {selectedLabel} напрямую.
        </AlertDescription>
      </Alert>
    );
  } else {
    verdict = (
      <Alert className="border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
        <AlertTriangle />
        <AlertTitle>Несовместимо</AlertTitle>
        <AlertDescription>
          <p>
            Файл версии {version.numeric} ({fileProduct}) НЕ откроется в{" "}
            {selectedLabel} — программа старше файла.
          </p>
          <p>
            Или понизьте версию самого .cdr — файл будет пересохранён под вашу
            версию CorelDRAW без перекодирования.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={scrollToVersionChange}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <FileDown className="size-4" aria-hidden="true" />
              Понизить версию файла
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={scrollToConvert}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <ArrowDown className="size-4" aria-hidden="true" />
              Конвертировать в SVG/PDF
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Проверка совместимости</CardTitle>
        <CardDescription>
          Укажите версию CorelDRAW, установленную у вас, — сравним её с версией
          файла.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="user-corel-version">Ваша версия CorelDRAW</Label>
          <Select
            value={userVersion != null ? String(userVersion) : ""}
            onValueChange={(value) => onUserVersionChange(Number(value))}
          >
            <SelectTrigger
              id="user-corel-version"
              aria-label="Ваша версия CorelDRAW"
              className="w-full sm:w-80"
            >
              <SelectValue placeholder="Выберите вашу версию" />
            </SelectTrigger>
            <SelectContent>
              {USER_COREL_OPTIONS.map((option) => (
                <SelectItem key={option.numeric} value={String(option.numeric)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div aria-live="polite">{verdict}</div>
      </CardContent>
    </Card>
  );
}
