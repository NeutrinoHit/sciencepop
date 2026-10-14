# sciencepop

Научно-популярные лекции и визуальные материалы NeutrinoHit.

## Сборка

```bash
make site
```

Команда создаёт полный публикуемый сайт в `_site/`.

Для интерактивной работы можно использовать `quarto preview`. Перед push
следует проверить `make site`.

Push в `main` автоматически публикует сайт. `workflow_dispatch` позволяет
повторить публикацию вручную.

## Опубликовано

- [Каталог научпоп-лекций](https://neutrinohit.github.io/sciencepop/)

## Состав сайта

В Git хранятся Quarto-исходники публикуемых RevealJS-лекций, необходимые им
ассеты и готовые PDF-лекции, которые являются публичными материалами сайта.

Исходники Keynote остаются локальными и в Git не хранятся.

`_site/` является результатом сборки и в Git не хранится.

## Добавление материала

Для Quarto-лекции добавьте `.qmd` в `project.render` и необходимые статические
ресурсы в `project.resources`.

Для готовой PDF-лекции добавьте PDF в Git, включите его в
`project.resources` и добавьте ссылку в соответствующий каталог сайта.

Перед push выполните:

```bash
make site
```

После push в `main` сайт публикуется автоматически.

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

1. Добавьте готовый PDF в `in-a-nutshell/`.
2. Добавьте PDF в `project.resources` в `_quarto.yml`.
3. Добавьте запись в `in-a-nutshell/catalog.js`.
4. Укажите ссылку YouTube в поле `youtube`, когда видео будет опубликовано.
5. Перед push выполните `make site`.
