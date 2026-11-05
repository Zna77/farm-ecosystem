# 🌻 Farm Ecosystem

An educational browser game for children aged 7–12. Players run a small farm and learn how
**sunlight, water, soil, plants, bees, pests, predators, decomposers and animals** depend on each other.

Built with **HTML5, CSS3 and vanilla JavaScript** using **Vite**. There is no backend; progress is
saved in `localStorage`.

The game is fully playable in **English, Français and العربية** (Arabic uses a right-to-left layout).

## Run it locally

```bash
npm install
npm run dev        # starts http://localhost:5173
```

Other commands:

```bash
npm test           # run the game-rule unit tests (Vitest)
npm run build      # production build into dist/
npm run preview    # serve the production build
```

## How to play

| Tool | What it does |
|---|---|
| ✋ Helper | Does the obvious thing: plants in empty fields, harvests ripe crops, waters thirsty ones |
| 🌱 Plant | Plants the seed selected in the seed tray |
| 💧 Water | +40 water. Rain and irrigation also water plants |
| 🧺 Harvest | Picks ripe crops (✨) and clears dead plants into the compost bin |
| 🟤 Compost | Spreads compost to restore soil nutrients |
| 🧴 Spray | Kills aphids, but also hurts bees and ladybugs |
| 🔍 Look | Opens a field in the inspector, which explains why it is growing well or badly |

Keyboard: `1`–`7` pick a tool and `Space` pauses the game.

### Ecosystem rules the game teaches

- **Photosynthesis:** growth depends on sunlight. Clouds, rain and night slow it down.
- **Water:** the sun dries the soil. Below 35 water a plant grows at half speed, below 15 it wilts, and after 40 s of wilting it dies.
- **Soil:** every harvest uses up nutrients, and poor soil slows growth. **Beans** add nitrogen back to the soil.
- **Decomposition:** stems, dead plants and animal manure go into the compost bin, where worms turn them into compost.
- **Pollination:** tomatoes, strawberries, sunflowers and pumpkins stop at the flower stage until a bee visits. More hives and sunflowers mean faster pollination. Bees stay home in rain and at night, and moving a hive away slows pollination.
- **Pests and predators:** aphids slow plants down. Ladybugs and chickens eat them. Ladybugs leave if they have no aphids to eat.
- **Food chain:** crops feed animals, and fed animals produce eggs, milk and manure.
- **Difficulty:** higher levels bring more aphids, faster drying and heatwaves (from level 3).

### Progression
- **12 missions**, each ending with a real-world lesson
- **13 badges**
- **22 discoveries**, shown in the Journal's interactive **Ecosystem Web**
- **25 quiz questions** in 3 difficulty tiers. Answer order is shuffled, and first-time correct answers earn extra coins
- **Farm Health score** from soil (30%), water (25%), pests (20%) and biodiversity (25%)
- **10 levels.** Each one unlocks new crops, fields (6 → 9 → 12) and shop items

## Languages (EN · FR · AR)

- **Choosing a language:** use the 🌐 button in the top bar, the first intro screen, or ⚙️ More. You can switch at any time and the farm keeps going. The choice is saved in `localStorage` (`farm-ecosystem-lang`). English is the default.
- **Arabic:** sets `<html lang="ar" dir="rtl">`, mirrors menus, panels and text alignment, and uses the **Noto Sans Arabic** font. Numbers stay in Western digits and are isolated so they read correctly. The farm map and the ecosystem web keep the same layout in every language, so nothing moves under the child's finger. Only their labels change.
- **Agricultural vocabulary:** Soil = Le sol / التربة, Irrigation = L'irrigation / الري, Pollination = La pollinisation / التلقيح, Fertilizer = L'engrais / السماد, Harvest = La récolte / الحصاد, Biodiversity = La biodiversité / التنوع البيولوجي, Ecosystem = L'écosystème / النظام البيئي, Compost = Le compost / السماد العضوي.

### How translations work
```
src/translations/
  index.js   t(), setLanguage(), LANGUAGES, plural rules, localize()
  en.js      English (source of truth: every key lives here)
  fr.js      French
  ar.js      Arabic
```
- `t('barn.sell')` returns the text for the current language, and `t('common.level', { n: 3 })` fills in `{n}`.
- Plurals use the browser's `Intl.PluralRules`. Arabic has six plural forms (`zero, one, two, few, many, other`), e.g. `msg.compostCollected`.
- Data files (crops, missions, quizzes…) hold no text. `localize(obj, 'crops.carrot', ['name', 'fact'])` adds getters, so `crop.name` always returns the active language.
- Switching language rebuilds the screen (`buildUI()` in `main.js`) from the unchanged game state.
- `tests/i18n.test.js` fails if any language is missing a key, has an empty string or wrong `{placeholders}`, or if English text is hardcoded in UI or engine code.

**To add a sentence:** add the key to `en.js`, `fr.js` and `ar.js`, then use `t('your.key')`.
**To add a language:** copy `en.js`, translate it, and add it to `LANGUAGES` and `DICTIONARIES` in `translations/index.js`.

## Project structure

```
src/
  main.js            Entry point: the game object, input handling, engine-event → UI wiring, game loop, autosave
  config.js          ALL tuning numbers (growth, water drain, pest rates, XP per level…)
  data/              Pure content – edit these to add crops, missions, quiz questions…
    crops.js         Crop stats + kid-friendly facts
    missions.js      Missions: goal, check(state), reward, lesson
    achievements.js  Badges with test(state)
    discoveries.js   Ecosystem relationships (arrows in the Ecosystem Web)
    quizzes.js       Quiz questions with explanations
    shop.js          Shop items and animal definitions
  engine/            Game rules – no DOM code, so they are easy to test
    state.js         createState(), loadState(), saveState() (localStorage)
    simulation.js    tick(): weather, water, wilting, growth, pollination, aphids, predators, animals, compost
    actions.js       Player actions: plant, water, harvest, applyCompost, spray, buy, feedAnimal, sell…
    progress.js      XP/levels, discover(), checkMissions(), checkAchievements(), computeHealth()
    bus.js           Tiny event bus: engine emits ('discovery', 'levelUp', …), UI listens
  ui/                Everything the player sees
    art.js           Hand-drawn SVG illustrations generated in code (plants per stage, barn, owl…)
    scene.js         Builds and updates the farm map, plots, bees, weather and day/night
    hud.js           Top bar and bottom toolbar / seed tray
    sidebar.js       Professor Hoot speech queue, mission card, field inspector, ecosystem stats
    modals.js        Journal, Barn & Shop, Quiz, Settings, celebrations, intro
    sound.js         Sound effects synthesised with Web Audio (no audio files)
    dom.js           Small DOM helpers
  translations/      en.js · fr.js · ar.js · index.js (see "Languages" above)
  styles/            base · scene · panels · modals · responsive · i18n (language picker + RTL)
tests/engine.test.js 26 tests covering every ecosystem mechanic
tests/i18n.test.js   11 tests: key completeness, plurals, switching, no hardcoded text
```

### How it fits together

1. All game data lives in one plain object, `state`, so it can be saved to localStorage as JSON.
2. Once per second, `main.js` calls `tick(state)`. Each call advances the world one step.
3. Player clicks call functions in `engine/actions.js`. Each returns `{ ok, msg }`, where `msg` is a child-friendly explanation shown by Professor Hoot or in a toast.
4. When something notable happens, the engine **emits events** (`emit('discovery', …)`). `main.js` turns these into sounds, animations and pop-ups. Game rules never touch the DOM.
5. `render()` redraws the UI from `state`. Plots are only re-rendered when their visible state changes, which keeps animation smooth.

Good places to start reading: `tick()` in `engine/simulation.js`, `growthFactors()` (the rules that set growth speed), `computeHealth()` in `engine/progress.js` and `onPlotClick()` in `main.js`.

### Extending
- **New crop:** add an entry to `data/crops.js` and its `crops.<id>` text to all three translation files. Pick a `shape` that `plantSVG()` already draws, or add a new one.
- **New mission or quiz question:** add an object to `data/missions.js` or `data/quizzes.js`, plus its text in the translation files.
- **Balancing:** change the numbers in `config.js`.
- **Debugging:** `window.__game.state` is available in the browser console.
