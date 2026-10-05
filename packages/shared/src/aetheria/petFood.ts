/** Each species eats its own material when the Beastkeeper raises its bond level. */
export const PET_FOODS = [
  {
    species: 'Fox',
    id: 'pet_food_fox',
    name: "Zuccherini d'Etere",
    rarity: 'COMMON',
    price: 600,
    description:
      "Zuccherini d'Etere per la Volpe. Il Custode delle Bestie li usa per far evolvere la Volpe.",
  },
  {
    species: 'Lynx',
    id: 'pet_food_lynx',
    name: 'Carne affumicata',
    rarity: 'UNCOMMON',
    price: 900,
    description:
      'Carne affumicata per la Lince. Il Custode delle Bestie la usa per far evolvere la Lince.',
  },
  {
    species: 'Turtle',
    id: 'pet_food_turtle',
    name: 'Erbe di stagno',
    rarity: 'UNCOMMON',
    price: 900,
    description:
      'Erbe fresche per la Tartaruga. Il Custode delle Bestie le usa per far evolvere la Tartaruga.',
  },
  {
    species: 'Boar',
    id: 'pet_food_boar',
    name: 'Tartufo selvatico',
    rarity: 'UNCOMMON',
    price: 900,
    description:
      'Un tartufo per il Cinghiale. Il Custode delle Bestie lo usa per far evolvere il Cinghiale.',
  },
  {
    species: 'Toad',
    id: 'pet_food_toad',
    name: 'Lucciole di palude',
    rarity: 'RARE',
    price: 1300,
    description: 'Lucciole per il Rospo. Il Custode delle Bestie le usa per far evolvere il Rospo.',
  },
  {
    species: 'Raven',
    id: 'pet_food_raven',
    name: 'Bacche del crepuscolo',
    rarity: 'RARE',
    price: 1800,
    description: 'Bacche per il Corvo. Il Custode delle Bestie le usa per far evolvere il Corvo.',
  },
  {
    species: 'Whelp',
    id: 'pet_food_whelp',
    name: 'Bocconi di brace',
    rarity: 'EPIC',
    price: 2500,
    description:
      'Bocconi incandescenti per il Draghetto. Il Custode delle Bestie li usa per far evolvere il Draghetto.',
  },
] as const;

export function petFoodForName(name: string): (typeof PET_FOODS)[number] | undefined {
  return PET_FOODS.find((food) => name.includes(food.species));
}

/** Level 1 is +0. Costs for the nine subsequent evolutions rise steeply. */
export function petEvolutionCost(level: number): { gold: number; food: number } {
  const step = Math.max(1, Math.min(9, Math.floor(level)));
  const foodByStep = [1, 2, 3, 5, 8, 13, 21, 34, 55];
  return { gold: 500 * step * step, food: foodByStep[step - 1] };
}

/** Nine upgrades need at least eight elapsed days, even for players with stored wealth. */
export const PET_EVOLUTION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Extra gate on a PET equipment roll. Failed rolls become ordinary accessories. */
export const PET_DROP_KEEP_CHANCE = {
  COMMON: 1,
  UNCOMMON: 0.7,
  RARE: 0.36,
  EPIC: 0.12,
  LEGENDARY: 0.025,
} as const;

/** Species are also weighted, rather than all being equally common in a map's pool. */
export const PET_SPECIES_WEIGHT: Record<string, number> = {
  Fox: 45,
  Boar: 28,
  Lynx: 20,
  Turtle: 19,
  Toad: 16,
  Raven: 7,
  Whelp: 3,
};

export function pickPetFamily<T extends { name: string }>(
  families: readonly T[],
  roll: number,
): T | undefined {
  const total = families.reduce((sum, family) => sum + (PET_SPECIES_WEIGHT[family.name] ?? 1), 0);
  if (!total) return undefined;
  let value = Math.max(0, Math.min(0.999999999, roll)) * total;
  for (const family of families) {
    value -= PET_SPECIES_WEIGHT[family.name] ?? 1;
    if (value < 0) return family;
  }
  return families[families.length - 1];
}
