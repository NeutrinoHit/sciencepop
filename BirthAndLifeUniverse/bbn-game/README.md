# BBN-игра для Quarto reveal.js / OJS

Интерактивный слайд использует только заранее посчитанную сетку PRyMordial. В браузере нет toy-модели и нет fallback на приближённые формулы: если `data/bbn_grid.json` не готов или не помечен как `backend: "PRyMordial"`, UI показывает ошибку.

## Окружение

В этом репозитории используется существующее окружение `neutrinohit`; отдельный `.venv` для игры создавать не нужно.

```bash
pyenv activate neutrinohit
python -m pip install numpy scipy matplotlib tqdm
```

Опционально можно поставить Numba и запускать препроцессор с `--numba`:

```bash
python -m pip install "numba>=0.64"
```

На локальном бенчмарке `numba_flag=True` почти не ускорил PRyMordial для этой сетки: основное время уходит не в те функции, которые PRyMordial помечает `@njit`.

Репозиторий PRyMordial сейчас не устанавливается командой `pip install git+https://github.com/vallima/PRyMordial.git`, потому что в нём нет `pyproject.toml` или `setup.py`. Его нужно клонировать как source checkout и передать путь скрипту:

```bash
git clone https://github.com/vallima/PRyMordial.git external/PRyMordial
```

## Расчёт сетки

Smoke-test без большого расчёта:

```bash
cd sciencepop/BirthAndLifeUniverse/bbn-game
PRYMORDIAL_PATH=../../../external/PRyMordial python tools/precompute_prymordial_grid.py --smoke-only
```

Smoke-test с Numba:

```bash
PRYMORDIAL_PATH=../../../external/PRyMordial python tools/precompute_prymordial_grid.py --smoke-only --numba
```

Полная сетка из ТЗ:

```bash
cd sciencepop/BirthAndLifeUniverse/bbn-game
PRYMORDIAL_PATH=../../../external/PRyMordial python tools/precompute_prymordial_grid.py
```

Расширенная пробная сетка для игры:

```bash
cd sciencepop/BirthAndLifeUniverse/bbn-game
PRYMORDIAL_PATH=../../../external/PRyMordial python tools/precompute_prymordial_grid.py \
  --eta10-values 2 4 6.1 8 10 \
  --s-values 0.1 0.75 1 1.5 2 \
  --tau-n-values 500 625 750 880 1000 \
  --include-standard-point \
  --output-json data/bbn_grid.json \
  --output-npz data/bbn_grid.npz
```

Ось `S` для этой пробной сетки неравномерная: она покрывает диапазон `0.1–2`,
но также содержит точное значение нашей Вселенной `S = 1`. Равномерная
5-точечная ось с `S = 0.575` оказалась численно неудачной для PRyMordial в этом
режиме.

Скрипт сначала считает точку `eta10 = 6.1`, `DeltaNeff = 0`, `tau_n = 880 s` и проверяет порядок `Yp ~ 0.247`, `D/H ~ 2.5e-5`. Если smoke-test грубо не совпадает, большой расчёт останавливается.

Выходы:

- `data/bbn_grid.json`
- `data/bbn_grid.npz`
- `data/sanity_plots/sanity_yp_vs_s.png`
- `data/sanity_plots/sanity_dh_vs_eta10.png`
- `data/sanity_plots/sanity_targets.png`

Текущая пробная сетка содержит `5 x 5 x 5 = 125` точек и на локальном запуске
считалась `328.5 s` без учёта smoke-test. Полная сетка из ТЗ содержит
`61 x 41 x 41 = 102541` точку. На текущем Python без numba это долгий
офлайн-расчёт.

## Запуск слайда

```bash
cd sciencepop/BirthAndLifeUniverse/bbn-game
quarto preview bbn_game.qmd
```

## Физические параметры

`eta10 = 10^10 eta` задаёт барион-фотонное отношение. В полной сетке из ТЗ
диапазон `4.5–7.5`, стандарт `6.1`. В текущей расширенной пробной сетке:
`2, 4, 6.1, 8, 10`.

`S = H/H_std` показывает пользователю скорость расширения. В PRyMordial она реализована через `DeltaNeff`:

```text
S = sqrt(1 + 7 DeltaNeff / 43)
DeltaNeff = (S^2 - 1) * 43 / 7
```

`tau_n` — время жизни нейтрона в секундах. В полной сетке из ТЗ диапазон
`870–890 s`, стандарт `880 s`. В текущей расширенной пробной сетке:
`500, 625, 750, 880, 1000 s`.

`D/H` показывается как численное отношение дейтерия к водороду. `He4/H` показывается как массовое отношение

```text
R_He = M(He4)/M(H) = Yp / (1 - Yp)
```

Целевые полосы в UI:

- `R_He = 0.30–0.36`
- `D/H = 2.2e-5–2.8e-5`
