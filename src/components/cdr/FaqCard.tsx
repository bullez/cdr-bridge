"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FAQ: { question: string; answer: string }[] = [
  {
    question: "Почему нельзя просто пересохранить CDR в старую версию?",
    answer:
      "Формат CDR закрытый: записывать файлы старых версий умеет только сам CorelDRAW. Поэтому инструмент идёт универсальным путём: конвертирует документ в открытые векторные форматы (SVG/PDF), которые старые CorelDRAW и Illustrator импортируют напрямую.",
  },
  {
    question: "Сохранятся ли слои и группы?",
    answer:
      "В SVG слои и группы переносятся как именованные группы; в Illustrator они видны как группы/слои. В PDF слои превращаются в порядок наложения объектов.",
  },
  {
    question: "Что будет с текстом и эффектами?",
    answer:
      "Если на сервере нет нужного шрифта, текст заменяется стандартным или переводится в кривые. Линзы, тени и режимы наложения могут быть упрощены или растрированы. Для 100% совпадения цветов и шрифтов пересохраняйте файл в самом CorelDRAW.",
  },
  {
    question: "Как открыть результат в старом CorelDRAW?",
    answer:
      "Скачайте SVG или PDF, затем в CorelDRAW: Файл → Импорт (или просто перетащите файл в окно документа).",
  },
  {
    question: "Как открыть файл в Adobe Illustrator?",
    answer:
      "Скачайте AI (или SVG/PDF) и откройте двойным кликом. Векторные объекты редактируются, группы сохраняются.",
  },
];

export function FaqCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Частые вопросы</CardTitle>
        <CardDescription>
          Коротко о том, как устроен формат CDR и что происходит при
          конвертации.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
