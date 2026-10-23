# CDR Bridge — смена версии файлов CorelDRAW + конвертация в Illustrator

**CDR Bridge** — бесплатный инструмент, который решает классическую проблему CorelDRAW:
у вас стоит, например, CorelDRAW 2017 (v19), а файл прислали из CorelDRAW 2022 (v24) —
программа пишет, что файл более новый, и отказывается его открывать.

CDR Bridge умеет:

1. **Изменять версию .cdr-файла** — например, из версии 24 сделать версию 19.
   Меняется только заголовок файла, поэтому **слои, объекты, текст и эффекты
   остаются нетронутыми** — ничего не перекодируется.
2. **Конвертировать .cdr в SVG, PDF, AI и PNG** — чтобы файл можно было открыть
   в **Adobe Illustrator** или импортировать в любой старый CorelDRAW
   («Файл → Импорт»). Слои и группы переносятся в результат.
3. **Определять версию файла** — просто перетащите .cdr в окно, и вы увидите,
   в какой версии он сохранён (поддерживаются как классические RIFF-файлы,
   так и ZIP-контейнеры CorelDRAW X6…2025).

---

## Как пользоваться

### Вариант 1. Портативная версия (без установки)

Скачайте `CDR-Bridge-Portable.html` из раздела
[Releases](../../releases) и откройте его двойным кликом — работает офлайн,
в любом современном браузере, файл никуда не отправляется.

Портативная версия умеет менять версию .cdr (функция №1).

### Вариант 2. Полная веб-версия

Полная версия (все функции, включая конвертацию в SVG/PDF/AI/PNG) запускается
как веб-приложение:

- **Онлайн** — если автор проекта развернул её (ссылка в описании репозитория);
- **Локально** — см. раздел «Запуск на своём компьютере» ниже.

### Как поменять версию файла (пример)

1. Откройте CDR Bridge и перетащите файл `banner-v24.cdr` в окно.
2. Программа покажет: «Версия 24 · CorelDRAW 2022 · контейнер ZIP».
3. Выберите целевую версию, например «CorelDRAW 2017 (v19)».
4. Нажмите «Изменить версию» и скачайте `banner-v24-v19.cdr`.
5. Откройте скачанный файл в вашей версии CorelDRAW.

---

## Почему это работает

Формат .cdr — это RIFF-контейнер. Версия файла хранится в одном символе
заголовка: `RIFF....CDR**X**` (X — символ версии: `J` = 19 (2017),
`O` = 24 (2022) и т. д.). Начиная с CorelDRAW X6 файл дополнительно завёрнут
в ZIP-контейнер, внутри которого лежит тот же RIFF-поток (`content/riffData.cdr`).

CDR Bridge заменяет символ версии в заголовке — и всё. Содержимое документа
не трогается, поэтому потери слоёв и объектов исключены в принципе.

**Честное ограничение:** если макет использует возможности, которых не было
в целевой версии (новые типы заливок, линзы и т. п.), старая версия CorelDRAW
может их упростить или не показать. Для таких случаев используйте конвертацию
в SVG/PDF с последующим импортом.

### Таблица версий

| Символ | Версия | Продукт | Символ | Версия | Продукт |
|--------|--------|---------|--------|--------|---------|
| CDR3–9 | 3–9 | CorelDRAW 3…9 | CDRG | 16 | CorelDRAW X6 |
| CDRA | 10 | CorelDRAW 10 | CDRH | 17 | CorelDRAW X7 |
| CDRB | 11 | CorelDRAW 11 | CDRI | 18 | CorelDRAW X8 |
| CDRC | 12 | CorelDRAW 12 | CDRJ | 19 | CorelDRAW 2017 |
| CDRD | 13 | CorelDRAW X3 | CDRK | 20 | CorelDRAW 2018 |
| CDRE | 14 | CorelDRAW X4 | CDRL | 21 | CorelDRAW 2019 |
| CDRF | 15 | CorelDRAW X5 | CDRM | 22 | CorelDRAW 2020 |
| | | | CDRN | 23 | CorelDRAW 2021 |
| | | | CDRO | 24 | CorelDRAW 2022 |
| | | | CDRP | 25 | CorelDRAW 2023 |
| | | | CDRQ | 26 | CorelDRAW 2024 |
| | | | CDRR | 27 | CorelDRAW 2025 |

---

## Запуск на своём компьютере

Нужен [Node.js](https://nodejs.org) 20+ (или Bun) и LibreOffice Draw
(движок конвертации; в Linux/Mac — пакет `libreoffice`, в Windows —
[LibreOffice for Windows](https://www.libreoffice.org/download/)).

```bash
npm install
npm run dev
# откройте http://localhost:3000
```

Для продакшена:

```bash
npm run build
npm start
```

> Определение версии и смена версии работают без LibreOffice.
> Конвертация в SVG/PDF/AI/PNG требует установленного LibreOffice Draw
> (используются libcdr-фильтры импорта).

## Развёртывание онлайн (Vercel)

1. Запушьте репозиторий на GitHub.
2. Зайдите на [vercel.com](https://vercel.com) под аккаунтом GitHub.
3. «Add New → Project» → импортируйте репозиторий → «Deploy».
4. Готово — у проекта будет адрес вида `cdr-bridge.vercel.app`.

---

## Технологии

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Собственный ZIP/RIFF-парсер на TypeScript (без внешних зависимостей)
- LibreOffice Draw / libcdr как движок конвертации

## Структура проекта

```
src/
  app/api/cdr/          API: analyze, convert, download, engine
  components/cdr/       Интерфейс (dropzone, версия, конвертация, FAQ)
  lib/
    cdr-versions.ts     Таблица версий CorelDRAW
    cdr-analyze.ts      Определение формата и версии
    cdr-container.ts    ZIP-ридер для контейнеров X6+
    cdr-patch.ts        Смена версии + ZIP-сборщик
    cdr-engine.ts       Движок конвертации (LibreOffice)
    svg-sanitize.ts     Очистка SVG-экспорта LibreOffice
```

## Лицензия

MIT — используйте, изучайте и дорабатывайте свободно.

## Отказ от ответственности

CDR Bridge — независимый инструмент и не связан с компанией Corel
Corporation. CorelDRAW является товарным знаком Corel Corporation.

---

## Автор

**Хайрльварин Булат**  
Senior Graphic Designer · автоматизация

10 лет в дизайне и печати. Помимо макетов пишу скрипты, которые убирают рутину из работы дизайн-отделов.

> **Открыт к предложениям:** Senior Graphic Designer · Communication Designer · Prepress / Print Production · Design Automation.  
> **Локация:** Уфа / Москва · открыт к релокации и разным форматам работы.

<p align="center">
  <img alt="Open to work" src="https://img.shields.io/badge/Open_to_work-Yes-2EA44F?style=for-the-badge">
  <a href="https://t.me/bullez"><img alt="Telegram" src="https://img.shields.io/badge/Telegram-@bullez-26A5E4?style=for-the-badge&logo=telegram&logoColor=white"></a>
  <a href="mailto:bullez@mail.ru"><img alt="Email" src="https://img.shields.io/badge/Email-bullez@mail.ru-EA4335?style=for-the-badge&logo=gmail&logoColor=white"></a>
  <a href="https://bullez.github.io/designer/"><img alt="Портфолио" src="https://img.shields.io/badge/Portfolio-Open-111111?style=for-the-badge&logo=githubpages&logoColor=white"></a>
  <a href="https://www.behance.net/byllez721e"><img alt="Behance" src="https://img.shields.io/badge/Behance-Projects-1769FF?style=for-the-badge&logo=behance&logoColor=white"></a>
  <a href="https://t.me/design_n_code"><img alt="Блог" src="https://img.shields.io/badge/Blog-Design_%26_Code-8A2BE2?style=for-the-badge&logo=telegram&logoColor=white"></a>
</p>

Если бейджи не загрузились: [Telegram](https://t.me/bullez) · [Email](mailto:bullez@mail.ru) · [Портфолио](https://bullez.github.io/designer/) · [Behance](https://www.behance.net/byllez721e) · [Блог](https://t.me/design_n_code)

**Телефон:** [+7 (937) 349-53-08](tel:+79373495308)  
**Резюме:** [PDF на Яндекс.Диске](https://disk.yandex.ru/i/T-DbQzCKZXMzWw)

Если нужен дизайнер, который дружит с препрессом и кодом, — напишите в Telegram. Отвечаю быстро.
