import { experienceToNextLevel } from './aetheria/progression.js';

/**
 * Third connected region, adapted from the original Sunken Grove expedition:
 * a flooded basin of ruined shrines guarded by the Drowned Guardian.
 */
export const GROVE = {
  entrance: { x: 84, z: 0 },
  altar: { x: 108, z: -12 },
  boss: { x: 132, z: 6 },
  goal: 6,
} as const;

export function inGrove(x: number) {
  return x >= 86;
}

export const GROVE_STORY = {
  offer:
    'Oltre la Frontiera l’acqua ha sommerso un antico bosco. Le creature annegate portano la stessa bruciatura, ma più antica. Liberane sei e tocca l’altare sommerso: il Guardiano Annegato custodisce l’ultima reliquia.',
  clue: 'L’altare risponde a chi ha liberato le creature. Una luce verde percorre i canali: il Guardiano Annegato veglia sulla reliquia del bosco.',
  discovery:
    'Il Guardiano è caduto. La reliquia del bosco sommerso è al sicuro e la corruzione non risale più il fiume.',
  reward: {
    gold: 180,
    xp: Math.ceil(
      Array.from({ length: 8 }, (_, i) => experienceToNextLevel(i + 1)).reduce((a, b) => a + b, 0) *
        0.6,
    ),
    dust: 14,
    potions: 3,
    gel: 3,
  },
} as const;

export const GROVE_TITLES = [
  'La reliquia del bosco',
  'Le creature annegate',
  'L’altare sommerso',
  'Il Guardiano Annegato',
  'Rapporto dal Bosco',
  'Il bosco sommerso tace',
];

export function groveObjective(stage: number, kills: number) {
  return (
    [
      'Parla con il Custode del Bosco oltre la Frontiera.',
      `Sconfiggi le creature annegate: ${kills} / 6.`,
      'Tocca l’altare sommerso per risvegliare il Guardiano.',
      'Sconfiggi il Guardiano Annegato presso l’altare.',
      'Torna dal Custode del Bosco per la ricompensa.',
      'La reliquia è al sicuro. Il bosco sommerso tace.',
    ][stage] ?? ''
  );
}

export const GROVE_SPAWNS = [
  { id: 'grove-drowned-west', type: 'drowned', x: 92, z: -6, hp: 210 },
  { id: 'grove-drowned-south', type: 'drowned', x: 96, z: 9, hp: 210 },
  { id: 'grove-drowned-mid', type: 'drowned', x: 103, z: 0, hp: 210 },
  { id: 'grove-drowned-north', type: 'drowned', x: 110, z: 13, hp: 210 },
  { id: 'grove-drowned-east', type: 'drowned', x: 118, z: -5, hp: 210 },
  { id: 'grove-drowned-deep', type: 'drowned', x: 122, z: 9, hp: 210 },
  { id: 'grove-guardian', type: 'guardian', x: 132, z: 6, hp: 2200 },
] as const;
