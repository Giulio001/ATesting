import { experienceToNextLevel } from './aetheria/progression.js';
// Original frontier story and enemy identities, adapted to a connected 3D region.
export const WORLD_LIMITS = { minX: -24, maxX: 78, minZ: -24, maxZ: 24 } as const;
export const FRONTIER = {
  entrance: { x: 34, z: 0 },
  beacon: { x: 61, z: -5 },
  boss: { x: 71, z: 9 },
  goal: 5,
} as const;
export function isHostile(x: number, z: number) {
  return x >= 42 || (x < 24 && z >= 10);
}
export function regionName(x: number, z: number) {
  return x >= 30
    ? 'Terre Sanguinanti'
    : x >= 24
      ? 'Passo della Frontiera'
      : z >= 10
        ? 'Porta del Vuoto'
        : 'Lumengate';
}
export const FRONTIER_STORY = {
  offer:
    'Le rotte sono corrotte e lo Scudo sopra Lumengate si è assottigliato. Nelle Terre Sanguinanti le creature portano lo stesso segno. Abbatine cinque, poi esamina la bruciatura presso il faro: dobbiamo capire da dove arriva.',
  clue: 'Su artigli, fango e corteccia compare la stessa bruciatura viola. Non segue il taglio di una lama né il verso del vento. Il faro vibra quando la avvicini alla sua luce. Qual è la causa comune?',
  discovery:
    'La stessa corruzione lega le creature alla luce del faro. Un Campione Cavo protegge il segnale: abbattilo e porta la scoperta al Custode.',
  reward: {
    gold: 100,
    xp: Math.ceil(
      Array.from({ length: 5 }, (_, i) => experienceToNextLevel(i + 1)).reduce((a, b) => a + b, 0) *
        0.7,
    ),
    dust: 10,
    potions: 2,
    gel: 2,
  },
} as const;
export const FRONTIER_TITLES = [
  'Risonanza dello Scudo',
  'Le creature corrotte',
  'Una traccia nel mondo',
  'Il Campione del faro',
  'Rapporto dalla Frontiera',
  'La luce resiste',
];
export function frontierObjective(stage: number, kills: number) {
  return (
    [
      'Parla di nuovo con Ser Aurel dopo il primo giuramento.',
      `Sconfiggi creature nelle Terre Sanguinanti: ${kills} / 5.`,
      'Esamina la bruciatura presso il faro e interpreta l’indizio.',
      'Sconfiggi il Campione Cavo nella radura a est del faro.',
      'Torna da Ser Aurel a Lumengate per la ricompensa.',
      'La Frontiera è al sicuro. Il faro conserva la tua scoperta.',
    ][stage] ?? ''
  );
}
export const ENEMY_RULES: Record<
  string,
  {
    name: string;
    hp: number;
    radius: number;
    reach: number;
    windup: number;
    damage: number;
    speed: number;
    xp: number;
    gold: number;
    elite: boolean;
    respawn: number;
  }
> = {
  shard: {
    name: 'Scheggia del Vuoto',
    hp: 96,
    radius: 1.7,
    reach: 1.4,
    windup: 850,
    damage: 12,
    speed: 1.8,
    xp: 40,
    gold: 12,
    elite: false,
    respawn: 20000,
  },
  sentinel: {
    name: 'Custode del Vuoto',
    hp: 260,
    radius: 2.35,
    reach: 2.05,
    windup: 1100,
    damage: 18,
    speed: 1.45,
    xp: 100,
    gold: 40,
    elite: true,
    respawn: 45000,
  },
  slime: {
    name: 'Slime Corrotto',
    hp: 145,
    radius: 1.6,
    reach: 1.3,
    windup: 950,
    damage: 14,
    speed: 1.5,
    xp: 55,
    gold: 8,
    elite: false,
    respawn: 18000,
  },
  voidling: {
    name: 'Creatura del Vuoto',
    hp: 190,
    radius: 1.9,
    reach: 1.65,
    windup: 800,
    damage: 17,
    speed: 2.1,
    xp: 70,
    gold: 8,
    elite: false,
    respawn: 18000,
  },
  spitter: {
    name: 'Sputaschegge',
    hp: 160,
    radius: 1.4,
    reach: 6,
    windup: 1300,
    damage: 19,
    speed: 1.35,
    xp: 65,
    gold: 12,
    elite: false,
    respawn: 18000,
  },
  champion: {
    name: 'Campione Cavo',
    hp: 1450,
    radius: 3,
    reach: 2.6,
    windup: 1400,
    damage: 26,
    speed: 1.65,
    xp: 240,
    gold: 55,
    elite: true,
    respawn: 90000,
  },
};
export function enemyRules(type: string) {
  return ENEMY_RULES[type] ?? ENEMY_RULES.shard;
}
export const FRONTIER_SPAWNS = [
  { id: 'wilds-slime-west', type: 'slime', x: 46, z: -3, hp: 145 },
  { id: 'wilds-slime-south', type: 'slime', x: 48, z: 6, hp: 145 },
  { id: 'wilds-voidling-west', type: 'voidling', x: 52, z: -8, hp: 190 },
  { id: 'wilds-spitter-west', type: 'spitter', x: 55, z: 5, hp: 160 },
  { id: 'wilds-voidling-east', type: 'voidling', x: 63, z: -11, hp: 190 },
  { id: 'wilds-slime-east', type: 'slime', x: 66, z: -2, hp: 145 },
  { id: 'wilds-spitter-east', type: 'spitter', x: 65, z: 13, hp: 160 },
  { id: 'wilds-champion', type: 'champion', x: 71, z: 9, hp: 1450 },
] as const;
