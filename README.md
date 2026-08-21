# sciencepop

Научно-популярные лекции и визуальные материалы NeutrinoHit.

## Сборка

```bash
make site
```

Команда собирает Quarto-лекции и включает в `_site/` существующие статические
HTML-экспорты вместе с их ассетами.

## Опубликовано

- [Каталог научпоп-лекций](https://neutrinohit.github.io/sciencepop/)

## Состав сайта

В `main` хранятся статические HTML-лекции, Quarto-исходники новых reveal.js
лекций и необходимые ассеты. Quarto собирает новые лекции и переносит
статический архив в итоговый `_site/`.
Исходники Keynote остаются локальными и исключены из git. Каталог
`ModernPhysics/slides` и локальный архив `WaveOrParticle/obsolete` также не
публикуются.

## Добавление материала

1. Для статической лекции поместите HTML-экспорт и ассеты в отдельную папку.
2. Для Quarto-лекции добавьте `.qmd` в `project.render` в `_quarto.yml` и
   нужные ассеты в `project.resources`.
3. Добавьте ссылку в корневой `index.html` или в основную карту NeutrinoHit.
4. Исходник Keynote храните локально: файлы `.key` исключены из git.
5. Выполните обычные `git add`, `git commit` и `git push`.

## Общий footer с логотипом и ссылками

RevealJS-лекции подключают общий footer через
`shared/reveal/neutrinohit-reveal-footer.js`. Канонический источник footer,
логотипа и ссылок на сайт, Telegram и YouTube живет в:

```text
../neutrinohit-map/assets/reveal/
```

Локальная копия в `sciencepop/shared/reveal/` нужна для локального preview и
сборки сайта. После изменения канонического footer или логотипа
синхронизируйте копии командой из `neutrinohit-map`:

```bash
python scripts/sync_reveal_assets.py
```

## Общие стили викторин

Крупные clicker-friendly слайды-викторины используют общие классы
`.quiz-slide`, `.quiz-prompt`, `.quiz-options`, `.quiz-option`,
`.quiz-option.correct`, `.quiz-option.wrong` и `.quiz-note`.

Канонический источник:

```text
../neutrinohit-map/assets/reveal/neutrinohit-reveal-quiz.css
```

Локальная копия для научпоп-лекций:

```text
shared/reveal/neutrinohit-reveal-quiz.css
```

После изменения канонического CSS синхронизируйте копии той же командой:

```bash
python scripts/sync_reveal_assets.py
```

## Библиотечка «Простыми словами»

Короткие модули живут в `in-a-nutshell/`. Для добавления нового модуля:

1. Поместите HTML-экспорт в отдельную подпапку `in-a-nutshell/`.
2. Добавьте одну запись в `in-a-nutshell/catalog.js`.
3. Укажите ссылку YouTube в поле `youtube`, когда видео будет опубликовано.
