import { STARTER_GEAR_OFFERS, MATERIAL_CURIOS, itemIconUrl } from './aetheria/itemCatalog.js';
import { intrinsicGearStats } from './aetheria/gearStats.js';
import { forgeUpgradedValue } from './aetheria/gearStats.js';
export { FORGE_MAX_UPGRADE, forgeUpgradedValue } from './aetheria/gearStats.js';
export { forgeUpgradeCost, forgeSalvageValue } from './aetheria/forge.js';
export * from './aetheria/forgeMaterials.js';
export { STARTER_GEAR_OFFERS, MATERIAL_CURIOS, itemIconUrl, intrinsicGearStats };
export { equipRefusal } from './aetheria/equipment.js';
export const EQUIPMENT_SLOTS = [
  'HEAD',
  'NECK',
  'ARMOR',
  'WEAPON',
  'OFFHAND',
  'ACCESSORY',
  'FEET',
  'PET',
] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];
export const SLOT_NAMES: Record<EquipmentSlot, string> = {
  HEAD: 'Testa',
  NECK: 'Collo',
  ARMOR: 'Corpo',
  WEAPON: 'Arma',
  OFFHAND: 'Scudo',
  ACCESSORY: 'Anello',
  FEET: 'Piedi',
  PET: 'Compagno',
};
export const BAG_PAGE_SIZE = 24,
  BAG_CAPACITY = 72;
export const CLAN_CREATION_COST = 100;
export const NPCS = [
  {
    id: 'gatewarden',
    name: 'Ser Aurel',
    role: 'Custode della porta',
    x: -2,
    z: 1,
    service: 'quest',
  },
  {
    id: 'quartermaster',
    name: 'Quartiermastro',
    role: 'Equipaggiamento e provviste',
    x: -6,
    z: 3.4,
    service: 'shop',
  },
  { id: 'herald', name: 'Araldo dei Clan', role: 'Registro dei clan', x: 6, z: 1, service: 'clan' },
  {
    id: 'blacksmith',
    name: 'Fabbro',
    role: 'Potenziamento e riciclo',
    x: -6,
    z: -1.5,
    service: 'forge',
  },
] as const;
export type NpcId = (typeof NPCS)[number]['id'];
export function nearbyNpc(x: number, z: number) {
  return NPCS.find((n) => Math.hypot(x - n.x, z - n.z) <= 2.4);
}
export interface Item {
  id: string;
  kind: string;
  name: string;
  icon: string;
  rarity: string;
  quantity: number;
  level: number;
  description: string;
  stats: Record<string, number>;
  price: number;
  upgradeLevel?: number;
}
// Stored stats remain at +0; both the sheet and combat calculate the same upgrade gains.
export function itemStats(item: Item): Record<string, number> {
  return Object.fromEntries(
    Object.entries(item.stats).map(([key, value]) => [key, forgeUpgradedValue(item, key, value)]),
  );
}
export function protectedStarterItem(item: Item): boolean {
  return STARTER_GEAR_OFFERS.some(
    (offer) => item.id === offer.itemId || item.id.startsWith(`${offer.itemId}-daily-`),
  );
}
export interface ClanSummary {
  id: string;
  name: string;
  motto: string;
  members: number;
  treasury: number;
}
export interface ClanView extends ClanSummary {
  founderId: string;
  roster: { id: string; name: string; role: string; online: boolean }[];
  requests: { id: string; name: string }[];
}
export interface RPGSnapshot {
  profileId: string;
  aetherDust: number;
  heroClass: HeroClass;
  items: Item[];
  equipment: Partial<Record<EquipmentSlot, string>>;
  stats: Record<string, number>;
  clan: ClanView | null;
  clans: ClanSummary[];
}
export interface ChatMessage {
  name: string;
  text: string;
  channel: 'GLOBAL' | 'GUILD';
  at: number;
}
export const ABILITIES = {
  SLASH: {
    name: 'Taglio d’Aether',
    key: 'Q / 2',
    cost: 18,
    cooldown: 2600,
    damage: 132,
    range: 2.5,
    icon: 'sword_aether',
    description: 'Un fendente in un cono davanti a te.',
  },
  GUARD: {
    name: 'Scudo d’Aether',
    key: 'R / 3',
    cost: 12,
    cooldown: 6500,
    damage: 0,
    range: 0,
    icon: 'shield_aether',
    description: 'Consuma 30 vigore. Riduce del 60% i danni per 2,5 secondi.',
  },
  BURST: {
    name: 'Impulso Void',
    key: 'F / 4',
    cost: 52,
    cooldown: 7000,
    damage: 175,
    range: 3.8,
    icon: 'aether_crystal',
    description: 'Un’onda radiale che danneggia e stordisce i nemici.',
  },
} as const;
export type AbilityId = keyof typeof ABILITIES;
export const HERO_CLASSES = ['GUARDIAN', 'AETHER_BLADE', 'VOID_KNIGHT'] as const;
export type HeroClass = (typeof HERO_CLASSES)[number];
export const CLASS_NAMES: Record<HeroClass, string> = {
  GUARDIAN: 'Guerriero',
  AETHER_BLADE: 'Arciere',
  VOID_KNIGHT: 'Mago',
};
export function heroClass(value: unknown): HeroClass {
  return HERO_CLASSES.includes(value as HeroClass) ? (value as HeroClass) : 'GUARDIAN';
}
// Original spell dimensions converted from pixels to the 3D world's units (50 px/m).
export const MAGE_SPELL = {
  beamLength: 7.6,
  beamHalfWidth: 0.76,
  novaAhead: 4.2,
  barrierMana: 22,
} as const;
export function classAbilities(value: unknown) {
  const cls = heroClass(value);
  if (cls === 'AETHER_BLADE')
    return {
      SLASH: {
        ...ABILITIES.SLASH,
        name: 'Freccia d’Aether',
        icon: 'bow_reinforced',
        description: 'Una freccia potenziata che viaggia verso il bersaglio.',
      },
      GUARD: { ...ABILITIES.GUARD, name: 'Guardia del Ranger' },
      BURST: {
        ...ABILITIES.BURST,
        name: 'Raffica d’Aether',
        icon: 'bow_reinforced',
        description: 'Tre frecce a ventaglio, ognuna con il 55% del danno base.',
      },
    };
  if (cls === 'VOID_KNIGHT')
    return {
      SLASH: {
        ...ABILITIES.SLASH,
        name: 'Raggio Arcano',
        range: MAGE_SPELL.beamLength,
        icon: 'scepter_oak',
        description: 'Un raggio che trapassa i nemici in linea retta.',
      },
      GUARD: {
        ...ABILITIES.GUARD,
        name: 'Barriera Arcana',
        cost: MAGE_SPELL.barrierMana,
        description: 'Riduce del 60% i danni per 2,5 secondi. Consuma solo mana.',
      },
      BURST: {
        ...ABILITIES.BURST,
        name: 'Nova del Vuoto',
        description: 'Una nova che esplode nel punto mirato, davanti al Mago.',
      },
    };
  return ABILITIES;
}
export function starterKit(value: unknown = 'GUARDIAN'): Item[] {
  const cls = heroClass(value);
  const weapon =
    cls === 'AETHER_BLADE'
      ? 'STARTER_BOW'
      : cls === 'VOID_KNIGHT'
        ? 'STARTER_CATALYST'
        : 'STARTER_WEAPON';
  return STARTER_GEAR_OFFERS.filter((x) =>
    [
      weapon,
      'STARTER_ARMOR',
      'STARTER_HEAD',
      ...(cls === 'GUARDIAN' ? ['STARTER_OFFHAND'] : []),
    ].includes(x.shopId),
  ).map((o) => ({
    id: o.itemId,
    kind: o.kind,
    name: o.name,
    icon: o.icon,
    rarity: o.rarity,
    quantity: 1,
    level: 1,
    description: 'Equipaggiamento da recluta di Lumengate.',
    stats: intrinsicGearStats({
      id: o.itemId,
      kind: o.kind,
      name: o.name,
      icon: o.icon,
      rarity: o.rarity,
    }),
    price: 100,
  }));
}
export const SHOP_ITEMS: Item[] = [
  {
    id: 'shop-bow',
    kind: 'WEAPON',
    name: 'Reinforced Bow',
    icon: 'bow_reinforced',
    rarity: 'COMMON',
    quantity: 1,
    level: 1,
    description: 'Arco rinforzato per il cammino dell’Arciere.',
    stats: intrinsicGearStats({
      kind: 'WEAPON',
      name: 'Reinforced Bow',
      icon: 'bow_reinforced',
      rarity: 'COMMON',
    }),
    price: 45,
  },
  {
    id: 'shop-scepter',
    kind: 'WEAPON',
    name: 'Oak Staff',
    icon: 'scepter_oak',
    rarity: 'COMMON',
    quantity: 1,
    level: 1,
    description: 'Bastone di quercia per il cammino del Mago.',
    stats: intrinsicGearStats({
      kind: 'WEAPON',
      name: 'Oak Staff',
      icon: 'scepter_oak',
      rarity: 'COMMON',
    }),
    price: 45,
  },
  {
    id: 'health-potion',
    kind: 'CONSUMABLE',
    name: 'Pozione di salute',
    icon: 'potion_health',
    rarity: 'COMMON',
    quantity: 1,
    level: 1,
    description: 'Ripristina 45 HP. Ricarica 3 secondi.',
    stats: {},
    price: 8,
  },
  {
    id: 'mana-potion',
    kind: 'CONSUMABLE',
    name: 'Pozione di mana',
    icon: 'potion_mana',
    rarity: 'COMMON',
    quantity: 1,
    level: 1,
    description: 'Ripristina 50 mana. Ricarica 3 secondi.',
    stats: {},
    price: 10,
  },
  {
    id: 'shop-sword',
    kind: 'WEAPON',
    name: 'Iron Sword',
    icon: 'sword_iron',
    rarity: 'COMMON',
    quantity: 1,
    level: 1,
    description: 'Una lama di ferro della guarnigione.',
    stats: intrinsicGearStats({
      kind: 'WEAPON',
      name: 'Iron Sword',
      icon: 'sword_iron',
      rarity: 'COMMON',
    }),
    price: 45,
  },
  {
    id: 'shop-feet',
    kind: 'FEET',
    name: 'Leather Boots',
    icon: 'boots_leather',
    rarity: 'COMMON',
    quantity: 1,
    level: 1,
    description: 'Stivali rinforzati per le strade di Aetheria.',
    stats: intrinsicGearStats({
      kind: 'FEET',
      name: 'Leather Boots',
      icon: 'boots_leather',
      rarity: 'COMMON',
    }),
    price: 30,
  },
];
