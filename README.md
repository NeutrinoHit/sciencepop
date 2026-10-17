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

Короткие лекции по 5–10 минут живут в `in-a-nutshell/`. Каждая лекция —
RevealJS-презентация `NN_slug.qmd` (1600×900) на общем дизайне NeutrinoHit.
Общие настройки, футер и счётчик посещений задаёт `in-a-nutshell/_metadata.yml`;
стили и готовые рисунки (таблица Менделеева, ядро, атом) — `assets/nutshell.css`
и `assets/nutshell.js`. Картинки лекции лежат в `assets/<slug>/`.

Порядок тем и ссылки задаёт `in-a-nutshell/catalog.js`: темы идут от простого
к сложному, каждая опирается на предыдущие. Темы без слайдов показываются
на странице с пометкой «готовится».

### Как добавить следующую лекцию

1. Скопируйте `in-a-nutshell/_template.qmd` в `in-a-nutshell/NN_slug.qmd`,
   где `NN` — номер темы в каталоге.
2. Картинки положите в `in-a-nutshell/assets/<slug>/`. Берите только свои
   рисунки или изображения с известным источником и лицензией; источник
   подпишите в `.nut-credit` на том же слайде.
3. В `catalog.js` найдите тему и заполните `slides: "NN_slug.html"`.
   Поле `pdf` нужно только для готового PDF (его добавьте в
   `project.resources` в `_quarto.yml`).
4. Когда видео опубликовано, вставьте ссылку в поле `youtube`.
5. Перед push выполните `make site` и пролистайте слайды.

Заметки докладчика (`::: {.notes}`) в публикуемые лекции не добавляйте.
Рисунок плотностей атома водорода пересчитывается командой
`python in-a-nutshell/scripts/hydrogen_orbitals.py`.

Исходники Keynote первых четырёх лекций остаются локально в
`in-a-nutshell/slides/`; их PDF сохранены по прежним адресам.
