// ─────────────────────────────────────────────────────────────
// Game tuning constants.
// Change numbers here to make the game easier or harder.
// One "tick" = one simulated second.
// ─────────────────────────────────────────────────────────────

export const SAVE_KEY = 'farm-ecosystem-save-v1';
export const SAVE_VERSION = 1;

export const TICK_MS = 1000; // real milliseconds per tick at 1× speed
export const DAY_LENGTH = 150; // ticks for a full day + night
export const NIGHT_START = 0.78; // fraction of the day when night begins

export const GRID_COLS = 4;
export const GRID_ROWS = 3;
export const PLOT_COUNT = GRID_COLS * GRID_ROWS;

/** How many plots are open at each level (index = level). */
export const PLOTS_BY_LEVEL = [0, 6, 9, 12, 12, 12, 12, 12, 12, 12, 12];

/** XP needed to reach each level (index = level). */
export const LEVEL_XP = [0, 0, 50, 130, 250, 420, 650, 950, 1300, 1750, 2300];
export const MAX_LEVEL = LEVEL_XP.length - 1;

export const START_COINS = 60;
export const START_WATER = 60;
export const START_FERTILITY = 70;

// Water
export const WILT_WATER = 15; // below this the plant wilts
export const THIRSTY_WATER = 35; // below this the plant grows slowly
export const WATER_AMOUNT = 40; // one splash of the watering can
export const WILT_DEATH_TICKS = 40; // wilted this long → plant dies
export const BASE_DRAIN = 0.7;
export const EMPTY_DRAIN = 0.25;
export const IRRIGATION_RATE = 0.9; // water per tick added by irrigation (when below 65)

// Soil
export const COMPOST_FERTILITY = 35;

// Pests
export const PEST_GRACE_TICKS = 60; // no aphids during the first minute
export const APHID_SPAWN = 0.004; // chance per plant per tick
export const APHID_GROWTH = 0.8;
export const LADYBUG_APPETITE = 0.5; // aphids eaten per ladybug per tick
export const CHICKEN_APPETITE = 0.3;
export const SPRAY_COST = 2;

// Bees
export const MAX_HIVES = 3;
export const WILD_POLLINATION = 0.01; // chance per tick without hives
export const HIVE_POLLINATION = 0.07; // extra chance per hive

// Compost
export const COMPOST_RATE = 0.08; // bags per tick while there is organic matter
export const MAX_ORGANIC = 20;

/** Weather types and their effect on sunlight and water. Names: translations → weather.<id> */
export const WEATHER = {
  sunny: { icon: '☀️', sun: 1.0, drain: 1.3 },
  cloudy: { icon: '⛅', sun: 0.7, drain: 0.7 },
  rainy: { icon: '🌧️', sun: 0.5, drain: -2.5 },
  heatwave: { icon: '🥵', sun: 1.1, drain: 2.0 },
};

/** Growth progress (0-100) at which each stage begins. */
export const STAGE_AT = [0, 12, 35, 65, 100];
export const POLLINATION_GATE = 85; // flowers wait here until pollinated
// Stage names are translated: translations → stages[]
