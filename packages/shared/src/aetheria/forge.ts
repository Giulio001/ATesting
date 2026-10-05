/** Costs and salvage rules ported from RoundWorld packages/shared/src/index.ts. */
import { FORGE_MAX_UPGRADE } from './gearStats.js';
const ITEM_RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const;
type ItemRarity = (typeof ITEM_RARITIES)[number];
export const FORGE_COST_BY_RARITY: Record<ItemRarity, number> = {
  COMMON: 0.45,
  UNCOMMON: 0.55,
  RARE: 0.7,
  EPIC: 0.85,
  LEGENDARY: 1,
};
/** Il costo dei quattro gradini che contano, dal sesto al nono. */
const FORGE_TAIL_COST = [
  { dust: 90, gold: 700 },
  { dust: 790, gold: 1_100 },
  { dust: 960, gold: 1_700 },
  { dust: 1_140, gold: 2_600 },
];
/** Le probabilita': fino al quinto e' una certezza, poi si comincia a rischiare. */
const FORGE_CHANCES = [1, 1, 1, 1, 1, 0.85, 0.55, 0.4, 0.3];

export const forgeUpgradeCost = (
  targetLevel: number,
  rarity: string = 'COMMON',
): { dustCost: number; goldCost: number; chance: number } => {
  const level = Math.max(1, Math.min(FORGE_MAX_UPGRADE, Math.floor(Number(targetLevel) || 1)));
  const scale = FORGE_COST_BY_RARITY[ITEM_RARITIES[forgeRarityTier(rarity)]];
  const tail = FORGE_TAIL_COST[level - 6];
  const dust = tail ? tail.dust : 10 + level * 4;
  const gold = tail ? tail.gold : 70 + level * 35;
  return {
    dustCost: Math.round(dust * scale),
    goldCost: Math.round(gold * scale),
    chance: FORGE_CHANCES[level - 1],
  };
};
/**
 * Il gradino di una rarita' **per la forgia**: 0 il piu' comune.
 *
 * La lista non si riscrive qui: e' `ITEM_RARITIES`, la stessa che decidono i drop. Prima era una
 * seconda copia scritta a mano, e una seconda copia e' una promessa che prima o poi si rompe -
 * aggiungi una rarita' alla scala vera e la forgia continua a conoscerne cinque, senza dire
 * niente. Una rarita' che non esiste (o scritta male) vale come comune, ed e' scritto.
 */
export const forgeRarityTier = (rarity: string): number => {
  const index = (ITEM_RARITIES as readonly string[]).indexOf(
    String(rarity ?? '')
      .trim()
      .toUpperCase(),
  );
  return index < 0 ? 0 : index;
};
export const FORGE_SALVAGE_REFUND = 0.4;
export const forgeSalvageValue = (rarity: string, upgradeLevel = 0): number => {
  const steps = Math.max(0, Math.min(FORGE_MAX_UPGRADE, Math.floor(Number(upgradeLevel) || 0)));
  let invested = 0;
  for (let level = 1; level <= steps; level += 1)
    invested += forgeUpgradeCost(level, rarity).dustCost;
  return [2, 5, 10, 20, 40][forgeRarityTier(rarity)] + Math.round(invested * FORGE_SALVAGE_REFUND);
};
