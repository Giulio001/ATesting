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
export type NpcService =
  'quest' | 'shop' | 'clan' | 'forge' | 'frontier' | 'grove' | 'daily' | 'resident';

export interface NpcDefinition {
  id: string;
  name: string;
  role: string;
  x: number;
  z: number;
  service: NpcService;
  /** Asset-manifest key for the rigged GLB the client should dress the NPC with. */
  model?: string;
  /** Clothing tint blended over the model's own materials. */
  tint?: number;
  /** Patrol waypoints: an NPC with a route walks between them. */
  route?: readonly (readonly [number, number])[];
  /** Walking speed in m/s while patrolling. */
  speed?: number;
  /** Seconds spent idling at each waypoint. */
  pause?: number;
  /** Ambient chatter the client shows as speech bubbles. */
  lines?: readonly string[];
}

/** Service NPCs: the client labels them and the server validates their proximity. */
export const NPCS: NpcDefinition[] = [
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
  {
    id: 'bounty-board',
    name: 'Banditore delle Taglie',
    role: 'Missioni giornaliere',
    x: 6.2,
    z: 4.4,
    service: 'daily',
    model: 'man_hooded',
    tint: 0x8c5f3f,
    lines: [
      'Taglie nuove ogni mattina, avventuriero.',
      'La Bacheca paga in oro e Polvere d’Aether.',
      'Le missioni del giorno si rinnovano all’alba.',
    ],
  },
  {
    id: 'frontier-beacon',
    name: 'Faro d’Aether',
    role: 'Esamina la bruciatura',
    x: 61,
    z: -5,
    service: 'frontier',
  },
  {
    id: 'frontier-scout',
    name: 'Esploratore della Frontiera',
    role: 'Avamposto delle Terre Sanguinanti',
    x: 36,
    z: 2,
    service: 'frontier',
  },
  {
    id: 'grove-keeper',
    name: 'Custode del Bosco',
    role: 'Guardiano del Bosco Sommerso',
    x: 88,
    z: 2,
    service: 'grove',
  },
  {
    id: 'grove-altar',
    name: 'Altare Sommerso',
    role: 'Tocca la reliquia',
    x: 108,
    z: -12,
    service: 'grove',
  },
];

/** Shorthands used by the manifest-free NPC definitions below. */
const idle = (x: number, z: number, ...lines: string[]) =>
  ({
    route: [
      [x, z],
      [x, z],
    ],
    lines,
  }) as const;

/**
 * Ambient residents: many, mobile, each with its own rigged GLB, tint and
 * chatter. Their position is a pure function of time (see {@link residentPose}),
 * so the client and the server always agree on where they are standing.
 */
export const RESIDENTS: NpcDefinition[] = [
  {
    id: 'watchman-orson',
    name: 'Orson',
    role: 'Guardia della piazza',
    x: -3,
    z: 6.5,
    service: 'resident',
    model: 'man_worker',
    tint: 0x5d6f8c,
    route: [
      [-4, 6.5],
      [4.5, 6.5],
    ],
    speed: 1.15,
    pause: 3,
    lines: ['Passo di ronda, tutto tranquillo.', 'La porta è sorvegliata giorno e notte.'],
  },
  {
    id: 'watchman-bram',
    name: 'Bram',
    role: 'Guardia della porta',
    x: 4.5,
    z: 6.5,
    service: 'resident',
    model: 'man_adventurer',
    tint: 0x6b4a3a,
    route: [
      [4.5, 5],
      [4.5, 9.5],
    ],
    speed: 1.05,
    pause: 4,
    lines: ['Al mio turno nessuna scheggia entra.', 'Tieni la lama vicina, viandante.'],
  },
  {
    id: 'farmer-elia',
    name: 'Elia',
    role: 'Contadino',
    x: 11,
    z: 13,
    service: 'resident',
    model: 'man_farmer',
    tint: 0x9f8a52,
    route: [
      [10, 12],
      [14, 14.5],
    ],
    speed: 0.85,
    pause: 5,
    lines: [
      'Il raccolto regge, nonostante la corruzione.',
      'Le zucche crescono grosse quest’anno.',
    ],
  },
  {
    id: 'herbalist-mira',
    name: 'Mira',
    role: 'Erborista',
    x: -9,
    z: 13,
    service: 'resident',
    model: 'woman_witch',
    tint: 0x6ea86a,
    route: [
      [-10, 13],
      [-6.5, 15],
    ],
    speed: 0.8,
    pause: 5,
    lines: [
      'Foglie di luna, raccolte a mezzanotte.',
      'Il Bosco Sommerso ha erbe che non conosciamo.',
    ],
  },
  {
    id: 'trader-dafne',
    name: 'Dafne',
    role: 'Mercante',
    x: 3.4,
    z: 2.6,
    service: 'resident',
    model: 'woman_medieval',
    tint: 0xa8506a,
    route: [
      [3.4, 2.6],
      [2.2, -2.2],
    ],
    speed: 0.95,
    pause: 4,
    lines: [
      'Mercanzie oneste, prezzi quasi onesti.',
      'Cerchi qualcosa? Il Quartiermastro è più fornito.',
    ],
  },
  {
    id: 'apprentice-luca',
    name: 'Luca',
    role: 'Apprendista fabbro',
    x: -4,
    z: -3.4,
    service: 'resident',
    model: 'man_worker',
    tint: 0x7a5a44,
    route: [
      [-4, -3.4],
      [-3.4, 0.4],
    ],
    speed: 1.2,
    pause: 2.5,
    lines: ['Il mantice non si ferma mai.', 'Ho quasi finito la lama del capitano.'],
  },
  {
    id: 'acolyte-sister',
    name: 'Suor Agnese',
    role: 'Accolita del santuario',
    x: -1.8,
    z: -9.4,
    service: 'resident',
    model: 'woman_medieval',
    tint: 0xd8d2c0,
    ...idle(-1.8, -9.4, 'L’Aether ci osserva.', 'Prega, e la luce risponderà.'),
  },
  {
    id: 'wanderer-cassio',
    name: 'Cassio',
    role: 'Viandante',
    x: -5,
    z: -15,
    service: 'resident',
    model: 'man_hooded',
    tint: 0x4f5a6b,
    route: [
      [-5, -15],
      [4, -15],
    ],
    speed: 1.35,
    pause: 2,
    lines: ['Vengo da oltre la Frontiera.', 'Ho visto cose che non auguro a nessuno.'],
  },
  {
    id: 'runner-nive',
    name: 'Nive',
    role: 'Messaggera',
    x: -3,
    z: 8.5,
    service: 'resident',
    model: 'woman_casual',
    tint: 0xd07a3c,
    route: [
      [-3, 8.5],
      [3, 8.5],
    ],
    speed: 1.6,
    pause: 1.2,
    lines: ['Ordini dal Consiglio, urgenti!', 'Corro, ci vediamo alla fontana!'],
  },
  {
    id: 'fisher-tomas',
    name: 'Tomas',
    role: 'Pescatore',
    x: 17,
    z: 2,
    service: 'resident',
    model: 'man_adventurer',
    tint: 0x3f7a86,
    route: [
      [17, 2],
      [18.5, 7],
    ],
    speed: 0.9,
    pause: 5,
    lines: ['Il canale porta pesci grossi.', 'Un giorno pescherò qualcosa dal Bosco Sommerso.'],
  },
  {
    id: 'gossip-rosa',
    name: 'Rosa',
    role: 'Comare',
    x: 5.6,
    z: -4.6,
    service: 'resident',
    model: 'woman_casual',
    tint: 0xb8863f,
    ...idle(
      5.6,
      -4.6,
      'Avete sentito del Campione Cavo?',
      'Dicono che il faro parli ai prescelti.',
    ),
  },
  {
    id: 'gossip-pia',
    name: 'Pia',
    role: 'Comare',
    x: 7.2,
    z: -5.4,
    service: 'resident',
    model: 'woman_worker',
    tint: 0x8f6f9f,
    ...idle(7.2, -5.4, 'Rosa esagera sempre.', 'Ma il fabbro ha davvero lavoro fino a notte.'),
  },
  {
    id: 'veteran-marco',
    name: 'Marco',
    role: 'Veterano',
    x: -15.5,
    z: -3,
    service: 'resident',
    model: 'man_adventurer',
    tint: 0x8c6b4a,
    route: [
      [-15.5, -3],
      [-16.5, -7],
    ],
    speed: 0.75,
    pause: 6,
    lines: ['Le cicatrici insegnano più dei maestri.', 'Ho combattuto alla fenditura, anni fa.'],
  },
  {
    id: 'stonecutter-gil',
    name: 'Gil',
    role: 'Tagliapietre',
    x: 15,
    z: -8,
    service: 'resident',
    model: 'man_farmer',
    tint: 0x9a9a8a,
    route: [
      [15, -8],
      [17, -12],
    ],
    speed: 0.8,
    pause: 5,
    lines: ['Le mura tengono.', 'Pietra di Lumengate, la migliore.'],
  },
  {
    id: 'harper-sela',
    name: 'Sela',
    role: 'Cantastorie',
    x: -8,
    z: 4.6,
    service: 'resident',
    model: 'woman_witch',
    tint: 0xc47a9f,
    ...idle(-8, 4.6, 'Vi canterò del Guardiano Annegato.', 'Una moneta, e la storia continua.'),
  },
  {
    id: 'scout-ivar',
    name: 'Ivar',
    role: 'Esploratore',
    x: 36,
    z: 5,
    service: 'resident',
    model: 'man_hooded',
    tint: 0x5c7a4a,
    route: [
      [34.5, 4.5],
      [38.5, 6.5],
    ],
    speed: 1.1,
    pause: 4,
    lines: ['Tracce fresche oltre il ponte.', 'Non bere l’acqua delle pozze.'],
  },
  {
    id: 'warden-noor',
    name: 'Noor',
    role: 'Custode del bosco',
    x: 87,
    z: 0,
    service: 'resident',
    model: 'woman_adventurer',
    tint: 0x3f8c6a,
    route: [
      [86.5, 0],
      [90, 4],
    ],
    speed: 0.95,
    pause: 5,
    lines: ['Il bosco respira ancora.', 'Non calpestare le radici sommerse.'],
  },
  {
    id: 'smith-juna',
    name: 'Juna',
    role: 'Armaiola',
    x: -6.5,
    z: 6.2,
    service: 'resident',
    model: 'woman_worker',
    tint: 0x6b6f7a,
    route: [
      [-7, 6],
      [-4.5, 8.5],
    ],
    speed: 1,
    pause: 4,
    lines: ['Le lame del fabbro passano da me.', 'Vuoi affilare quel ferro?'],
  },
];

export const ALL_NPCS: NpcDefinition[] = [...NPCS, ...RESIDENTS];

export function nearbyNpc(x: number, z: number, range = 2.4) {
  return NPCS.find((n) => Math.hypot(x - n.x, z - n.z) <= range);
}

export function nearbyResident(x: number, z: number, range = 3, timeMs = Date.now()) {
  return RESIDENTS.find((n) => {
    const pose = residentPose(n, timeMs / 1000);
    return Math.hypot(x - pose.x, z - pose.z) <= range;
  });
}

export function npcById(id: string) {
  return ALL_NPCS.find((n) => n.id === id);
}

export interface ResidentPose {
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
}

interface PatrolLeg {
  ax: number;
  az: number;
  dx: number;
  dz: number;
  length: number;
  travel: number;
}

const patrolCache = new Map<string, { legs: PatrolLeg[]; cycle: number; pause: number }>();

function patrol(npc: NpcDefinition) {
  const cached = patrolCache.get(npc.id);
  if (cached) return cached;
  const route = npc.route ?? [];
  const pause = npc.pause ?? 3;
  const legs: PatrolLeg[] = [];
  let cycle = 0;
  if (route.length >= 2) {
    const points = [...route, ...route.slice(0, -1).reverse()];
    const speed = Math.max(0.2, npc.speed ?? 1);
    for (let i = 0; i < points.length; i++) {
      const [ax, az] = points[i];
      const [bx, bz] = points[(i + 1) % points.length];
      const length = Math.hypot(bx - ax, bz - az);
      if (length < 1e-4) continue;
      const travel = length / speed;
      legs.push({ ax, az, dx: (bx - ax) / length, dz: (bz - az) / length, length, travel });
      cycle += travel + pause;
    }
  }
  const entry = { legs, cycle, pause };
  patrolCache.set(npc.id, entry);
  return entry;
}

/** Deterministic patrol position: client and server derive the same spot. */
export function residentPose(npc: NpcDefinition, seconds: number): ResidentPose {
  const { legs, cycle, pause } = patrol(npc);
  if (!legs.length || cycle <= 0) return { x: npc.x, z: npc.z, yaw: 0, moving: false };
  let time = ((seconds % cycle) + cycle) % cycle;
  for (const leg of legs) {
    if (time < leg.travel) {
      const along = time * (leg.length / leg.travel);
      return {
        x: leg.ax + leg.dx * along,
        z: leg.az + leg.dz * along,
        yaw: Math.atan2(leg.dx, leg.dz),
        moving: true,
      };
    }
    time -= leg.travel;
    if (time < pause) {
      const endX = leg.ax + leg.dx * leg.length;
      const endZ = leg.az + leg.dz * leg.length;
      return { x: endX, z: endZ, yaw: Math.atan2(leg.dx, leg.dz), moving: false };
    }
    time -= pause;
  }
  const first = legs[0];
  return { x: first.ax, z: first.az, yaw: Math.atan2(first.dx, first.dz), moving: false };
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
/** Player-to-player trade: both must stay within this distance for the session to survive. */
export const TRADE_RANGE = 4.5;
export interface TradeItemView {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  quantity: number;
  upgradeLevel?: number;
}
export interface TradeView {
  id: string;
  partnerName: string;
  partnerClass: HeroClass;
  myOffer: TradeItemView[];
  theirOffer: TradeItemView[];
  myGold: number;
  theirGold: number;
  myReady: boolean;
  theirReady: boolean;
}
export interface TradeRequestView {
  id: string;
  fromName: string;
  fromClass: HeroClass;
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
