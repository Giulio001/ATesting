/**
 * I materiali della forgia: cosa serve, oltre a polvere e oro, per portare un pezzo da +5 a +9, e
 * il Metallo Magico che chiede la riforgiatura.
 *
 * L'idea e' quella di un mercato: ogni terra lascia i suoi materiali, e un pezzo chiede quelli
 * della terra da cui viene (il suo livello dice quale). Chi caccia nelle Terre Sanguinanti trova
 * gelatina e nuclei di slime; chi scende nell'Abisso fibre runiche e perle. Il pezzo del livello
 * 45 chiede roba della Veglia, e se non ci si va, la si compra da chi ci va.
 *
 * La rarita' del pezzo dice quanto e' rara la roba che chiede: un pezzo comune si alza con i
 * materiali comuni della sua terra (quelli che cadono di continuo), un mitico con quelli
 * favolosi e, per il +9, con uno mitico - che cade da un boss ogni qualche decina.
 *
 * Tutto qui e' condiviso: il server lo usa per far pagare e per far cadere, il client per dire
 * quanto manca prima di premere il bottone.
 */
/** Gli id delle mappe (gli stessi di MAP in index.ts, scritti qui per non importare l'indice
 *  che a sua volta esporta questo file). */
const MAP = {
  wilds: 'FRACTURED_WILDS',
  grove: 'SUNKEN_GROVE',
  void: 'VOID',
  depths: 'SUNDERED_DEPTHS',
  tower: 'TOWER_OF_TEN_FLOORS',
  tutorial: 'TUTORIAL_GROUNDS',
  undercroft: 'LUMENGATE_UNDERCROFT',
  ashen: 'ASHEN_MARCH',
  frost: 'FROSTBOUND_REACH',
  bastion: 'HOLLOW_BASTION',
  rift: 'TEMPEST_RIFT',
  abyss: 'SILENT_ABYSS',
  vigil: 'DEADSTAR_VIGIL',
  voxthrone: 'VOX_THRONE',
  crater: 'STARFALL_CRATER',
} as const;

export type ForgeMaterialRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type ForgeRegion = 'FRONTIER' | 'MIDLANDS' | 'ABYSS' | 'STARFALL';

export interface ForgeMaterial {
  id: string;
  name: string;
  rarity: ForgeMaterialRarity;
  region: ForgeRegion;
}

/** Le quattro terre dei materiali, dal livello da cui cominciano. */
export const FORGE_REGIONS: ReadonlyArray<{ id: ForgeRegion; minLevel: number; name: string }> = [
  { id: 'FRONTIER', minLevel: 1, name: 'Frontiera' },
  { id: 'MIDLANDS', minLevel: 22, name: 'Terre di Mezzo' },
  { id: 'ABYSS', minLevel: 34, name: 'Fenditura e Abisso' },
  { id: 'STARFALL', minLevel: 43, name: 'Veglia, Trono e Cratere' },
];

/**
 * Dove si caccia ogni terra: le mappe che lasciano i suoi materiali. Il Pozzo e le isole
 * non stanno qui: lasciano quelli della terra del livello di chi caccia (vedi forgeRegionForMap).
 * Serve alla forgia per dire dove andare a cercare quello che manca.
 */
export const FORGE_REGION_MAPS: Record<ForgeRegion, readonly string[]> = {
  FRONTIER: [MAP.wilds, MAP.grove, MAP.void, MAP.depths, MAP.tower],
  MIDLANDS: [MAP.ashen, MAP.frost, MAP.bastion],
  ABYSS: [MAP.rift, MAP.abyss],
  STARFALL: [MAP.vigil, MAP.voxthrone, MAP.crater],
};

/** Da dove viene un materiale: la sua terra e la sua rarita' (o il Metallo Magico). */
export function forgeMaterialSource(
  id: string,
):
  | { magic: true }
  | { magic: false; region: ForgeRegion; rarity: ForgeMaterialRarity; minLevel: number }
  | undefined {
  if (id === MAGIC_METAL.id) return { magic: true };
  const material = FORGE_MATERIALS.find((entry) => entry.id === id);
  if (!material) return undefined;
  const minLevel = FORGE_REGIONS.find((entry) => entry.id === material.region)?.minLevel ?? 1;
  return { magic: false, region: material.region, rarity: material.rarity, minLevel };
}

/**
 * Cinque materiali per terra, uno per rarita' (dal comune al mitico). Sono oggetti del catalogo
 * (MATERIAL_CURIOS): stesso nome, stessa icona, stessa voce della wiki.
 */
export const FORGE_MATERIALS: readonly ForgeMaterial[] = [
  { id: 'aether_gel', name: 'Gelatina Eterea', rarity: 'COMMON', region: 'FRONTIER' },
  { id: 'monster_slime_core', name: 'Nucleo di Slime', rarity: 'UNCOMMON', region: 'FRONTIER' },
  { id: 'herb_forest_heart', name: 'Cuore della Foresta', rarity: 'RARE', region: 'FRONTIER' },
  { id: 'rare_nexus_heart', name: 'Cuore del Nexus', rarity: 'EPIC', region: 'FRONTIER' },
  {
    id: 'monster_slime_king_essence',
    name: 'Essenza del Re Slime',
    rarity: 'LEGENDARY',
    region: 'FRONTIER',
  },

  { id: 'monster_fossil_fang', name: 'Zanna Fossile', rarity: 'COMMON', region: 'MIDLANDS' },
  { id: 'aether_spirit_ash', name: 'Cenere Spirituale', rarity: 'UNCOMMON', region: 'MIDLANDS' },
  { id: 'quest_ancient_seal', name: 'Sigillo Antico', rarity: 'RARE', region: 'MIDLANDS' },
  { id: 'ore_titan_core', name: 'Nucleo del Titano', rarity: 'EPIC', region: 'MIDLANDS' },
  {
    id: 'rare_bottled_phoenix',
    name: 'Fenice Imbottigliata',
    rarity: 'LEGENDARY',
    region: 'MIDLANDS',
  },

  { id: 'herb_runic_fiber', name: 'Fibra Runica', rarity: 'COMMON', region: 'ABYSS' },
  { id: 'aether_shadow_essence', name: "Essenza d'Ombra", rarity: 'UNCOMMON', region: 'ABYSS' },
  { id: 'rare_abyssal_pearl', name: 'Perla Abissale', rarity: 'RARE', region: 'ABYSS' },
  { id: 'monster_void_eye', name: 'Occhio del Vuoto', rarity: 'EPIC', region: 'ABYSS' },
  { id: 'rare_dragon_tear', name: 'Lacrima del Drago', rarity: 'LEGENDARY', region: 'ABYSS' },

  { id: 'herb_lunar_pollen', name: 'Polline Lunare', rarity: 'COMMON', region: 'STARFALL' },
  {
    id: 'ore_whispering_stone',
    name: 'Pietra Sussurrante',
    rarity: 'UNCOMMON',
    region: 'STARFALL',
  },
  { id: 'rare_captured_soul', name: 'Anima Incapsulata', rarity: 'RARE', region: 'STARFALL' },
  { id: 'rare_twilight_sphere', name: 'Sfera del Crepuscolo', rarity: 'EPIC', region: 'STARFALL' },
  {
    id: 'rare_eternity_fragment',
    name: "Frammento d'Eternità",
    rarity: 'LEGENDARY',
    region: 'STARFALL',
  },
];

/**
 * Il Metallo Magico: l'unica cosa che riforgia un pezzo. Cade da qualsiasi nemico, ma raramente
 * (MAGIC_METAL_DROP_CHANCE, lo 0,1% a uccisione per ogni viandante che prende la ricompensa):
 * rigirare i bonus di un pezzo diventa una scelta, e il metallo una merce.
 */
export const MAGIC_METAL = {
  id: 'magic_metal',
  name: 'Metallo Magico',
  rarity: 'EPIC' as ForgeMaterialRarity,
  description:
    'Un lingotto che non si raffredda mai. I fabbri di Lumengate lo usano per sciogliere i bonus di un pezzo e rifonderli da capo: senza, non si riforgia.',
};
export const MAGIC_METAL_DROP_CHANCE = 0.001;
/** Quanti Metalli Magici chiede una riforgiatura. */
export const REFORGE_MAGIC_METAL = 1;

/** Quanti pezzi dello stesso materiale stanno in una casella dello zaino. */
export const MATERIAL_STACK_MAX = 999;

/** Il gradino da cui la forgia comincia a chiedere materiali. */
export const FORGE_MATERIAL_FROM_LEVEL = 5;

const RARITY_INDEX: Record<string, number> = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
};
const RARITY_BY_INDEX: ForgeMaterialRarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

/**
 * La ricetta per rarita' del pezzo: il materiale principale (e quanti, da +5 a +9) e quello in
 * piu' che si aggiunge negli ultimi gradini, un grado di rarita' sopra.
 *
 * Un tentativo fallito consuma i materiali come consuma la polvere: e' quello che tiene viva la
 * domanda - e il mercato. Per questo i numeri sono bassi: un +9 comune chiede in media una
 * ventina di materiali comuni fra tentativi e ritentativi, un +9 mitico una dozzina di favolosi
 * e tre o quattro mitici.
 */
const RECIPES: ReadonlyArray<{
  main: number;
  mainQty: number[];
  extra: number;
  extraQty: number[];
}> = [
  /* COMMON    */ { main: 0, mainQty: [1, 1, 2, 2, 3], extra: 1, extraQty: [0, 0, 0, 1, 1] },
  /* UNCOMMON  */ { main: 0, mainQty: [2, 2, 3, 3, 4], extra: 1, extraQty: [0, 0, 1, 1, 1] },
  /* RARE      */ { main: 1, mainQty: [1, 2, 2, 3, 3], extra: 2, extraQty: [0, 0, 1, 1, 1] },
  /* EPIC      */ { main: 2, mainQty: [1, 1, 2, 2, 3], extra: 3, extraQty: [0, 0, 0, 1, 1] },
  /* LEGENDARY */ { main: 3, mainQty: [1, 1, 1, 1, 2], extra: 4, extraQty: [0, 0, 0, 0, 1] },
];

export interface ForgeMaterialRequirement {
  id: string;
  name: string;
  rarity: ForgeMaterialRarity;
  quantity: number;
}

/** La terra dei materiali di un livello (di un pezzo o di una mappa). */
export function forgeRegionForLevel(level: number): ForgeRegion {
  const value = Math.max(1, Math.floor(Number(level) || 1));
  let region: ForgeRegion = 'FRONTIER';
  for (const entry of FORGE_REGIONS) if (value >= entry.minLevel) region = entry.id;
  return region;
}

/**
 * La terra dei materiali di una mappa: quella del livello a cui ci si caccia. `level` serve alle
 * mappe che non hanno un livello solo (la rotta delle isole sale da 5 a 50, il Pozzo segue chi
 * scende): chi chiama passa il livello del posto.
 */
export function forgeRegionForMap(mapId: string, level = 1): ForgeRegion {
  switch (mapId) {
    case MAP.wilds:
    case MAP.grove:
    case MAP.void:
    case MAP.depths:
    case MAP.tower:
    case MAP.tutorial:
    case MAP.undercroft:
      return 'FRONTIER';
    case MAP.ashen:
    case MAP.frost:
    case MAP.bastion:
      return 'MIDLANDS';
    case MAP.rift:
    case MAP.abyss:
      return 'ABYSS';
    case MAP.vigil:
    case MAP.voxthrone:
    case MAP.crater:
      return 'STARFALL';
    default:
      return forgeRegionForLevel(level);
  }
}

export const forgeMaterialFor = (
  region: ForgeRegion,
  rarity: ForgeMaterialRarity | number,
): ForgeMaterial => {
  const tier = typeof rarity === 'number' ? rarity : (RARITY_INDEX[rarity] ?? 0);
  const found = FORGE_MATERIALS.find(
    (material) => material.region === region && RARITY_INDEX[material.rarity] === tier,
  );
  return found ?? FORGE_MATERIALS[0];
};

/** Quello che chiede un tentativo di potenziamento al gradino `targetLevel` (niente sotto +5). */
export function forgeUpgradeMaterials(
  targetLevel: number,
  rarity: string,
  itemLevel: number,
): ForgeMaterialRequirement[] {
  const level = Math.floor(Number(targetLevel) || 0);
  if (level < FORGE_MATERIAL_FROM_LEVEL || level > 9) return [];
  const recipe = RECIPES[RARITY_INDEX[String(rarity ?? '').toUpperCase()] ?? 0];
  const region = forgeRegionForLevel(itemLevel);
  const step = level - FORGE_MATERIAL_FROM_LEVEL;
  const list: ForgeMaterialRequirement[] = [];
  const add = (tier: number, quantity: number) => {
    if (quantity <= 0) return;
    const material = forgeMaterialFor(region, tier);
    list.push({ id: material.id, name: material.name, rarity: RARITY_BY_INDEX[tier], quantity });
  };
  add(recipe.main, recipe.mainQty[step]);
  add(recipe.extra, recipe.extraQty[step]);
  return list;
}

/** Quello che chiede una riforgiatura, oltre a polvere e oro. */
export function forgeReforgeMaterials(): ForgeMaterialRequirement[] {
  return [
    {
      id: MAGIC_METAL.id,
      name: MAGIC_METAL.name,
      rarity: MAGIC_METAL.rarity,
      quantity: REFORGE_MAGIC_METAL,
    },
  ];
}

/** L'icona di un materiale: la stessa strada che il server scrive sugli oggetti veri. */
export const forgeMaterialIcon = (id: string): string =>
  `/assets/aetheria/ui/items/96/${id}_96.png`;

/**
 * Quale materiale e' un oggetto dello zaino: si legge dall'icona, che per i materiali e' il
 * nome del materiale. Cosi' valgono anche quelli trovati prima che la forgia li chiedesse.
 */
export function materialIdOf(item: { kind?: string; icon?: string }): string {
  if (String(item?.kind ?? '') !== 'MATERIAL') return '';
  const match = /\/([a-z0-9_]+)_96\.png$/.exec(String(item?.icon ?? ''));
  return match ? match[1] : /^[a-z0-9_]+$/.test(String(item?.icon ?? '')) ? String(item.icon) : '';
}

/** Quanti ne ha lo zaino, sommando tutte le pile. */
export function countMaterial(
  inventory: Iterable<{ kind?: string; icon?: string; quantity?: number }>,
  id: string,
): number {
  let total = 0;
  for (const item of inventory)
    if (materialIdOf(item) === id) total += Math.max(0, Math.floor(Number(item.quantity) || 0));
  return total;
}

/** Se lo zaino basta per tutta la lista. */
export function hasMaterials(
  inventory: Iterable<{ kind?: string; icon?: string; quantity?: number }>,
  needs: readonly ForgeMaterialRequirement[],
): boolean {
  const items = Array.from(inventory);
  return needs.every((need) => countMaterial(items, need.id) >= need.quantity);
}

/**
 * Cosa lascia un'uccisione in materiali della forgia: la probabilita' che ne cada uno e i pesi
 * delle rarita', per grado del nemico. I boss ne lasciano sempre uno; il
 * moltiplicatore globale riduce gli altri tiri quando il server tira i dadi.
 */
export type ForgeDropGrade = 'TRASH' | 'ELITE' | 'BOSS';
export const FORGE_MATERIAL_DROPS: Record<
  ForgeDropGrade,
  { chance: number; rolls: number[]; weights: Record<ForgeMaterialRarity, number> }
> = {
  TRASH: {
    chance: 0.12,
    rolls: [1],
    weights: { COMMON: 100, UNCOMMON: 40, RARE: 10, EPIC: 2, LEGENDARY: 0.3 },
  },
  ELITE: {
    chance: 0.4,
    rolls: [1],
    weights: { COMMON: 50, UNCOMMON: 50, RARE: 25, EPIC: 6, LEGENDARY: 1 },
  },
  BOSS: {
    chance: 1,
    rolls: [1, 0.5],
    weights: { COMMON: 0, UNCOMMON: 45, RARE: 35, EPIC: 15, LEGENDARY: 3 },
  },
};

/** Tira la rarita' di un materiale per quel grado di nemico (`roll` in [0, 1)). */
export function rollForgeMaterialRarity(grade: ForgeDropGrade, roll: number): ForgeMaterialRarity {
  const weights = FORGE_MATERIAL_DROPS[grade].weights;
  const total = RARITY_BY_INDEX.reduce((sum, rarity) => sum + weights[rarity], 0);
  let left = Math.max(0, Math.min(0.999999, roll)) * total;
  for (const rarity of RARITY_BY_INDEX) {
    left -= weights[rarity];
    if (left < 0) return rarity;
  }
  return 'COMMON';
}

/** Gli id che non devono uscire dal giro dei cimeli qualsiasi: hanno un posto loro. */
export const FORGE_MATERIAL_IDS: ReadonlySet<string> = new Set([
  ...FORGE_MATERIALS.map((material) => material.id),
  MAGIC_METAL.id,
]);
