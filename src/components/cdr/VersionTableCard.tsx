"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CDR_VERSION_TABLE } from "@/lib/cdr-versions";

/** Тонкий скроллбар для контейнера таблицы (локальные стили, globals.css не затрагиваем). */
const SCROLLBAR_CSS = `
.cdr-slim-scroll { scrollbar-width: thin; scrollbar-color: rgba(16, 185, 129, 0.45) transparent; }
.cdr-slim-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
.cdr-slim-scroll::-webkit-scrollbar-track { background: transparent; }
.cdr-slim-scroll::-webkit-scrollbar-thumb { background-color: rgba(16, 185, 129, 0.45); border-radius: 9999px; }
`;

interface VersionTableCardProps {
  /** Числовой номер версии загруженного файла — строка подсвечивается */
  currentNumeric: number | null;
}

export function VersionTableCard({ currentNumeric }: VersionTableCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Справочник версий CorelDRAW</CardTitle>
        <CardDescription>
          Символ версии хранится в самом файле: RIFF-форма «CDR» + один символ
          (например,{" "}
          <span className="font-mono">CDRO</span> — версия 24). Начиная с X6
          файлы представляют собой ZIP-контейнер.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <style>{SCROLLBAR_CSS}</style>
        <div className="cdr-slim-scroll max-h-96 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_var(--border)]">
              <TableRow className="hover:bg-transparent">
                <TableHead>Символ в файле</TableHead>
                <TableHead>Версия</TableHead>
                <TableHead>Продукт</TableHead>
                <TableHead>Год</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CDR_VERSION_TABLE.map((row) => {
                const isCurrent = currentNumeric === row.numeric;
                return (
                  <TableRow
                    key={row.numeric}
                    className={
                      isCurrent ? "bg-emerald-50 hover:bg-emerald-100" : undefined
                    }
                  >
                    <TableCell className="font-mono">{row.char}</TableCell>
                    <TableCell>v{row.numeric}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        {row.product}
                        {isCurrent && (
                          <Badge className="bg-emerald-600 text-white">
                            этот файл
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.year ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
