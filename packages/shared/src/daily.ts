/**
 * Daily missions: a fixed pool rotated deterministically per UTC day, so every
 * player in the same world sees the same three tasks and the server can rebuild
 * the rotation without storing it. Progress is packed in a single number
 * (one byte per slot) to keep the Colyseus schema compact.
 */
export type DailyKind = 'kill' | 'elite' | 'boss' | 'any';

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  kind: DailyKind;
  /** Enemy types counted by a `kill` task. */
  targets?: readonly string[];
  goal: number;
  gold: number;
  xp: number;
  dust: number;
  potions?: number;
}

export const DAILY_POOL: readonly DailyQuest[] = [
  {
    id: 'void-purge',
    title: 'Bonifica della fenditura',
    description: 'Sconfiggi 10 creature del Vuoto fra Schegge e Custodi.',
    kind: 'kill',
    targets: ['shard', 'sentinel'],
    goal: 10,
    gold: 70,
    xp: 160,
    dust: 3,
  },
  {
    id: 'wilds-patrol',
    title: 'Pattuglia delle Terre Sanguinanti',
    description: 'Abbatti 8 creature corrotte della Frontiera.',
    kind: 'kill',
    targets: ['slime', 'voidling', 'spitter'],
    goal: 8,
    gold: 90,
    xp: 200,
    dust: 4,
  },
  {
    id: 'drowned-tide',
    title: 'La marea annegata',
    description: 'Libera 6 Creature Annegate nel Bosco Sommerso.',
    kind: 'kill',
    targets: ['drowned'],
    goal: 6,
    gold: 110,
    xp: 240,
    dust: 5,
  },
  {
    id: 'elite-hunt',
    title: 'Cacciatore di élite',
    description: 'Sconfiggi 2 creature d’élite in qualsiasi regione.',
    kind: 'elite',
    goal: 2,
    gold: 120,
    xp: 260,
    dust: 6,
    potions: 1,
  },
  {
    id: 'boss-slayer',
    title: 'Il Campione e il Guardiano',
    description: 'Abbatti un boss: il Campione Cavo o il Guardiano Annegato.',
    kind: 'boss',
    goal: 1,
    gold: 200,
    xp: 420,
    dust: 10,
    potions: 2,
  },
  {
    id: 'city-watch',
    title: 'Ronda di Lumengate',
    description: 'Sconfiggi 15 creature di qualsiasi tipo.',
    kind: 'any',
    goal: 15,
    gold: 80,
    xp: 180,
    dust: 3,
  },
];

export const DAILY_SLOTS = 3;
/** The daily set rolls over at 05:00 UTC, matching the original game's night reset. */
export const DAILY_RESET_HOUR_UTC = 5;
const DAY_MS = 86_400_000;

export function dayIndex(timeMs: number, resetHour = DAILY_RESET_HOUR_UTC) {
  return Math.floor((timeMs - resetHour * 3_600_000) / DAY_MS);
}

/** Milliseconds until the next rotation, used by the UI countdown. */
export function nextDailyReset(timeMs: number, resetHour = DAILY_RESET_HOUR_UTC) {
  const day = dayIndex(timeMs, resetHour);
  return (day + 1) * DAY_MS + resetHour * 3_600_000;
}

/** Deterministic seeded shuffle: same day, same three missions for everyone. */
export function dailyRotation(day: number): DailyQuest[] {
  const pool = [...DAILY_POOL];
  let state = Math.imul(day + 1, 2654435761) >>> 0 || 1;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, DAILY_SLOTS);
}

const byte = (slot: number) => (slot % 4) * 8;

export function slotProgress(packed: number, slot: number) {
  return (packed >>> byte(slot)) & 0xff;
}

export function withSlotProgress(packed: number, slot: number, value: number) {
  const shift = byte(slot);
  const cleared = packed & ~(0xff << shift);
  return (cleared | ((Math.max(0, Math.min(255, value)) & 0xff) << shift)) >>> 0;
}

export function slotDone(mask: number, slot: number) {
  return (mask & (1 << slot)) !== 0;
}

export function markSlotDone(mask: number, slot: number) {
  return (mask | (1 << slot)) >>> 0;
}

/** True when a kill counts for the given task. */
export function dailyCounts(quest: DailyQuest, type: string, elite: boolean, boss: boolean) {
  if (quest.kind === 'any') return true;
  if (quest.kind === 'boss') return boss;
  if (quest.kind === 'elite') return elite && !boss;
  return (quest.targets ?? []).includes(type);
}
