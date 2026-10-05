import { PET_FOODS } from './petFood.js';
import {
  ARMOR_PIECES,
  BOW_PIECES,
  DAGGER_PIECES,
  HELM_PIECES,
  NECK_PIECES,
  RING_PIECES,
  SCEPTER_PIECES,
  SHIELD_PIECES,
  SWORD_PIECES,
  laddersFromPieces,
} from './gearPieces.js';

/**
 * Il catalogo degli oggetti: cosa esiste, che aspetto ha, e dove lo si trova.
 *
 * Questa roba viveva nel server (apps/server/src/content/gear.ts, e i materiali in loot.ts),
 * perche' finora la leggeva solo lui, quando decide cosa far cadere. Adesso la legge anche la
 * wiki del sito, che e' una pagina statica: se restasse di la' servirebbe un endpoint pubblico
 * e una cache per una lista che cambia quando cambia il gioco, non di minuto in minuto. Qui la
 * leggono tutti e due dalla stessa riga, e la pagina funziona anche a regno spento.
 *
 * Quello che NON sta qui e' deliberato: i pesi con cui una rarita' viene sorteggiata, le
 * probabilita' di caduta e le formule dei bonus restano nel server (LOOT_SOURCES). La wiki dice
 * cosa esiste e dove si trova - non quanto e' probabile e quanto fa danno: quella meta' e' il
 * gioco, e si scopre giocando. ITEM_SOURCES piu' sotto e' proprio quella meta' pubblicabile,
 * e un test del server controlla che resti allineata alla tabella vera.
 */

/** The kit the instructor hands out. Neither the Forge nor the Quartermaster will take it:
 *  turning it into dust or pocket change leaves a new player standing there unarmed. */
export const STARTER_GEAR_PRICE = 100;
/* `icon` e' il disegno del pezzo, scritto qui invece che dedotto dal nome: il kit non e' un
   drop, ha un'immagine sola e sempre quella. Senza, la wiki avrebbe dovuto rifare a mano il
   giro che il server fa per indovinarla (iconFor), e due indovinelli danno due risposte. */
export const STARTER_GEAR_OFFERS = [
  {
    shopId: 'STARTER_DAGGERS',
    itemId: 'starter-daggers',
    kind: 'WEAPON',
    name: 'Aether Iron Daggers',
    rarity: 'COMMON',
    icon: 'dagger_rough_iron',
  },
  {
    shopId: 'STARTER_WEAPON',
    itemId: 'starter-sword',
    kind: 'WEAPON',
    name: 'Aether Iron Sword',
    rarity: 'COMMON',
    icon: 'sword_rough_iron',
  },
  // Le armi degli altri due cammini: un arciere non puo' impugnare una lama, e dargliela lo
  // stesso voleva dire consegnargli un pezzo che non avrebbe mai potuto usare.
  {
    shopId: 'STARTER_BOW',
    itemId: 'starter-bow',
    kind: 'WEAPON',
    name: 'Aether Iron Bow',
    rarity: 'COMMON',
    icon: 'bow_reinforced',
  },
  {
    shopId: 'STARTER_CATALYST',
    itemId: 'starter-catalyst',
    kind: 'WEAPON',
    name: 'Aether Iron Scepter',
    rarity: 'COMMON',
    icon: 'scepter_oak',
  },
  {
    shopId: 'STARTER_ARMOR',
    itemId: 'recruit-armor',
    kind: 'ARMOR',
    name: 'Recruit Armor',
    rarity: 'COMMON',
    icon: 'armor_leather_jerkin',
  },
  {
    shopId: 'STARTER_HEAD',
    itemId: 'traveller-cap',
    kind: 'HEAD',
    name: 'Traveller Cap',
    rarity: 'COMMON',
    icon: 'helm_hood',
  },
  // Il compagno non si regala piu' all'inizio: la volpe e' la ricompensa del Custode delle
  // Bestie, e un cucciolo nel primo zaino toglieva senso alla sua quest (vedi beastQuest).
  {
    shopId: 'STARTER_OFFHAND',
    itemId: 'wood-shield',
    kind: 'OFFHAND',
    name: 'Ashwood Shield',
    rarity: 'COMMON',
    icon: 'shield_oak_buckler',
  },
] as const;
export const PROTECTED_STARTER_ITEMS = STARTER_GEAR_OFFERS.map((offer) => offer.itemId);
/** WEAPON/ACCESSORY drops roll a random family so gear actually looks different from piece to
 *  piece, not just the same silhouette recolored by rarity. Each family's ladder is indexed by
 *  rarity tier (0=COMMON..4=LEGENDARY); families with fewer distinct art pieces than tiers just
 *  repeat their top/bottom icon across the gap until more art exists. */
export const WEAPON_FAMILIES: Array<{ name: string; ladder: string[] }> = [
  {
    name: 'Blade',
    ladder: ['sword_iron', 'sword_iron', 'sword_steel', 'sword_ceremonial', 'sword_aether'],
  },
  {
    name: 'Cleaver',
    ladder: ['axe_woodcutter', 'axe_woodcutter', 'axe_iron', 'axe_iron', 'axe_battle'],
  },
  {
    name: 'Warhammer',
    ladder: ['mace_stone', 'mace_stone', 'mace_stone', 'mace_stone', 'mace_stone'],
  },
  {
    name: 'Fang',
    ladder: ['dagger_iron', 'dagger_iron', 'dagger_iron', 'dagger_aether', 'dagger_aether'],
  },
  {
    name: 'Lance',
    ladder: ['spear_wood', 'spear_wood', 'spear_wood', 'spear_aether', 'spear_aether'],
  },
  {
    name: 'Longbow',
    ladder: ['bow_ashwood', 'bow_thornvine', 'bow_grove', 'bow_magma', 'bow_storm'],
  },
];
/** Le spade del Guardiano: venti disegni in quattro scale (vedi gearPieces). I nomi delle scale
 *  contengono "Sword" o "Blade" perche' il nome decide chi impugna l'arma (weaponFamilyOf). */
export const SWORD_FAMILIES = laddersFromPieces(SWORD_PIECES, [
  'Sword',
  'Longsword',
  'Broadsword',
  'Greatsword',
]);
/** Venti archi, quattro per grado: tutti i nuovi drop del Ranger sono armi da tiro. */
export const BOW_FAMILIES = laddersFromPieces(BOW_PIECES, [
  'Shortbow',
  'Longbow',
  'Recurve Bow',
  'Warbow',
]);
/** Gli scettri del Mago, allo stesso modo. */
export const SCEPTER_FAMILIES = laddersFromPieces(SCEPTER_PIECES, [
  'Staff',
  'Scepter',
  'Warstaff',
  'Wand',
]);
export const DAGGER_FAMILIES = laddersFromPieces(DAGGER_PIECES, [
  'Dagger',
  'Dirk Dagger',
  'Kris Dagger',
  'Stiletto Dagger',
]);
export const WEAPON_FAMILIES_BY_SPECIALIZATION: Record<
  string,
  Array<{ name: string; ladder: string[] }>
> = {
  // Il Guardiano combatte con le venti spade disegnate: asce, martelli e lance avevano solo la
  // grafica vecchia, e non ne cadono piu' (quelle gia' trovate si impugnano come prima).
  GUARDIAN: SWORD_FAMILIES,
  AETHER_BLADE: BOW_FAMILIES,
  // Il Mago impugna i venti scettri disegnati apposta (tools/items/fogli.py).
  VOID_KNIGHT: SCEPTER_FAMILIES,
  SHADOW_ROGUE: DAGGER_FAMILIES,
};
/** L'accessorio e' l'anello: venti disegni in quattro scale. Le collane hanno uno slot loro
 *  (NECK); gli amuleti gia' trovati restano accessori, col disegno di un anello. */
export const ACCESSORY_FAMILIES: Array<{ name: string; ladder: string[] }> = laddersFromPieces(
  RING_PIECES,
  ['Ring', 'Band', 'Signet', 'Loop'],
);
/** Le collane: venti disegni in quattro scale. */
export const NECK_FAMILIES = laddersFromPieces(NECK_PIECES, [
  'Necklace',
  'Pendant',
  'Torc',
  'Collar',
]);
/** The other four slots used to have one hard-coded name each - every chest piece in the game
 *  was a "Cuirass", every helm a "Cowl" - which is why a run of drops all read alike however
 *  they rolled. They roll a family now, exactly like weapons and trinkets. */
export const ARMOR_FAMILIES: Array<{ name: string; ladder: string[] }> = laddersFromPieces(
  ARMOR_PIECES,
  ['Cuirass', 'Brigandine', 'Scalemail', 'Hauberk'],
);
/** Gli elmi, per tutti i cammini: venti disegni in quattro scale. */
export const HEAD_FAMILIES: Array<{ name: string; ladder: string[] }> = laddersFromPieces(
  HELM_PIECES,
  ['Helm', 'Greathelm', 'Warhelm', 'Crownhelm'],
);
/** Gli scudi: venti disegni in quattro scale, tutti col nome di uno scudo (isShieldItem). */
export const OFFHAND_FAMILIES: Array<{ name: string; ladder: string[] }> = laddersFromPieces(
  SHIELD_PIECES,
  ['Aegis', 'Bulwark', 'Buckler', 'Shield'],
);
/**
 * Le scarpe. Danno sempre passo (velocita' di movimento) e difesa; la famiglia aggiunge il suo
 * carattere (vedi FEET_FAMILY_BONUS nel server). Ogni scala va dal pezzo piu' semplice al piu'
 * bello, perche' il gradino e' la rarita': le icone vengono da tools/items/scarpe.py.
 */
export const FEET_FAMILIES: Array<{ name: string; ladder: string[] }> = [
  // Cuoio e ali: le piu' leggere, le piu' veloci.
  {
    name: 'Treads',
    ladder: ['boots_leather', 'boots_buckled', 'boots_winged', 'boots_skywing', 'boots_seraph'],
  },
  // Piastre: le piu' pesanti, la difesa piu' alta.
  {
    name: 'Greaves',
    ladder: [
      'boots_steeltoe',
      'boots_black',
      'boots_silver',
      'boots_silver_gold',
      'boots_bloodspike',
    ],
  },
  // Pelliccia, rampicanti, ossa: la vita e la rigenerazione.
  {
    name: 'Wildwalkers',
    ladder: ['boots_furcuff', 'boots_fur', 'boots_vine', 'boots_flower', 'boots_bone'],
  },
  // Il Void e l'alchimia: il mana.
  {
    name: 'Voidsteps',
    ladder: [
      'boots_alchemist',
      'boots_raven',
      'boots_amethyst',
      'boots_void_flame',
      'boots_void_swirl',
    ],
  },
  // Gli elementi: un po' d'attacco.
  {
    name: 'Emberstriders',
    ladder: ['boots_leaf', 'boots_leaf', 'boots_gold_ruby', 'boots_ice', 'boots_magma'],
  },
];
/** A companion's family is its species, and its name carries it: the client reads the species
 *  out of the name (see recalculateStats' petStyle) to know which sprite to walk beside the
 *  player, so these words are load-bearing and must stay in sync with PET_SPECIES there. */
const petFamily = (name: string, icon: string) => ({
  name,
  ladder: [icon, icon, icon, icon, icon],
});
export const PET_FAMILIES: Array<{ name: string; ladder: string[] }> = [
  petFamily('Fox', 'pet_fox'),
  petFamily('Lynx', 'pet_lynx'),
  petFamily('Turtle', 'pet_turtle'),
  petFamily('Boar', 'pet_boar'),
  petFamily('Toad', 'pet_toad'),
  petFamily('Raven', 'pet_raven'),
  petFamily('Whelp', 'pet_whelp'),
];
/** Which companions each expedition can send home with you. Every species is findable, but
 *  where it is found says something about it - toads come out of the flooded basin, ravens
 *  out of the Crown, and the little basalt whelp only ever out of the Depths. */
export const PET_POOLS: Record<string, string[]> = {
  WILDS: ['Fox', 'Boar', 'Lynx'],
  GROVE: ['Toad', 'Turtle', 'Fox'],
  VOID: ['Raven', 'Lynx', 'Whelp'],
  DEPTHS: ['Whelp', 'Turtle', 'Raven'],
};
export const ITEM_FAMILIES: Record<string, Array<{ name: string; ladder: string[] }>> = {
  WEAPON: WEAPON_FAMILIES,
  ACCESSORY: ACCESSORY_FAMILIES,
  ARMOR: ARMOR_FAMILIES,
  HEAD: HEAD_FAMILIES,
  OFFHAND: OFFHAND_FAMILIES,
  FEET: FEET_FAMILIES,
  NECK: NECK_FAMILIES,
  PET: PET_FAMILIES,
};

/** Una terra, come la racconta la wiki: fin dove arriva il livello dei pezzi che lascia, e
 *  quali gradi di rarita' ci si possono trovare. */
export interface ItemSource {
  /** La chiave della zona, la stessa di LOOT_SOURCES nel server. */
  id: string;
  /** Il grado della fonte: il mondo aperto, i suoi elitari, il suo boss. */
  tier: 'COMMON' | 'ELITE' | 'BOSS';
  /** La fascia di livello dei pezzi che lascia, estremi compresi. */
  levelFrom: number;
  levelTo: number;
  /** I gradi che ci si possono trovare, dal piu' comune al piu' raro. Niente probabilita': che
   *  una leggendaria sia rara si vede, quanto sia rara e' un'altra cosa. */
  rarities: string[];
}

/**
 * Dove cade cosa.
 *
 * Le quattro spedizioni iniziali hanno una fascia per una (1-2, 3-4, 5-6, 7-8), la Torre sta
 * a parte perche' il livello sale con il piano, e da li' in giu' ogni mondo della storia ha la
 * sua fascia di due livelli. Gli elitari e i boss stanno in cima alla fascia della loro terra:
 * sono il posto dove il pezzo buono si trova.
 */
export const ITEM_SOURCES: ItemSource[] = [
  {
    id: 'WILDS',
    tier: 'COMMON',
    levelFrom: 1,
    levelTo: 5,
    rarities: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'WILDS_ELITE',
    tier: 'ELITE',
    levelFrom: 3,
    levelTo: 6,
    rarities: ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'GROVE',
    tier: 'COMMON',
    levelFrom: 6,
    levelTo: 9,
    rarities: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'GROVE_ELITE',
    tier: 'ELITE',
    levelFrom: 8,
    levelTo: 10,
    rarities: ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'GROVE_BOSS',
    tier: 'BOSS',
    levelFrom: 8,
    levelTo: 10,
    rarities: ['RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'VOID',
    tier: 'COMMON',
    levelFrom: 10,
    levelTo: 13,
    rarities: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'VOID_ELITE',
    tier: 'ELITE',
    levelFrom: 12,
    levelTo: 14,
    rarities: ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'VOID_BOSS',
    tier: 'BOSS',
    levelFrom: 12,
    levelTo: 14,
    rarities: ['RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'DEPTHS',
    tier: 'COMMON',
    levelFrom: 14,
    levelTo: 17,
    rarities: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'DEPTHS_ELITE',
    tier: 'ELITE',
    levelFrom: 16,
    levelTo: 18,
    rarities: ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'DEPTHS_BOSS',
    tier: 'BOSS',
    levelFrom: 16,
    levelTo: 18,
    rarities: ['RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'TOWER',
    tier: 'COMMON',
    levelFrom: 18,
    levelTo: 19,
    rarities: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'TOWER_ELITE',
    tier: 'ELITE',
    levelFrom: 19,
    levelTo: 20,
    rarities: ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'ASHEN',
    tier: 'COMMON',
    levelFrom: 22,
    levelTo: 25,
    rarities: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'ASHEN_ELITE',
    tier: 'ELITE',
    levelFrom: 24,
    levelTo: 26,
    rarities: ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'ASHEN_BOSS',
    tier: 'BOSS',
    levelFrom: 24,
    levelTo: 26,
    rarities: ['RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'FROST',
    tier: 'COMMON',
    levelFrom: 26,
    levelTo: 29,
    rarities: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'FROST_ELITE',
    tier: 'ELITE',
    levelFrom: 28,
    levelTo: 30,
    rarities: ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'FROST_BOSS',
    tier: 'BOSS',
    levelFrom: 28,
    levelTo: 30,
    rarities: ['RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'BASTION',
    tier: 'COMMON',
    levelFrom: 30,
    levelTo: 33,
    rarities: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'BASTION_ELITE',
    tier: 'ELITE',
    levelFrom: 32,
    levelTo: 34,
    rarities: ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'BASTION_BOSS',
    tier: 'BOSS',
    levelFrom: 32,
    levelTo: 34,
    rarities: ['RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'RIFT',
    tier: 'COMMON',
    levelFrom: 34,
    levelTo: 37,
    rarities: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'RIFT_ELITE',
    tier: 'ELITE',
    levelFrom: 36,
    levelTo: 38,
    rarities: ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'RIFT_BOSS',
    tier: 'BOSS',
    levelFrom: 36,
    levelTo: 38,
    rarities: ['RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'ABYSS',
    tier: 'COMMON',
    levelFrom: 38,
    levelTo: 42,
    rarities: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'ABYSS_ELITE',
    tier: 'ELITE',
    levelFrom: 40,
    levelTo: 42,
    rarities: ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'ABYSS_BOSS',
    tier: 'BOSS',
    levelFrom: 40,
    levelTo: 42,
    rarities: ['RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'VIGIL',
    tier: 'COMMON',
    levelFrom: 43,
    levelTo: 48,
    rarities: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'VIGIL_ELITE',
    tier: 'ELITE',
    levelFrom: 46,
    levelTo: 49,
    rarities: ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'VIGIL_BOSS',
    tier: 'BOSS',
    levelFrom: 46,
    levelTo: 49,
    rarities: ['RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'VOXTHRONE',
    tier: 'COMMON',
    levelFrom: 50,
    levelTo: 51,
    rarities: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'VOXTHRONE_ELITE',
    tier: 'ELITE',
    levelFrom: 51,
    levelTo: 52,
    rarities: ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'VOXTHRONE_BOSS',
    tier: 'BOSS',
    levelFrom: 51,
    levelTo: 52,
    rarities: ['RARE', 'EPIC', 'LEGENDARY'],
  },
  // Il Cratere non e' una fascia di due livelli: e' la caccia dal cinquanta al sessanta, e i suoi
  // pezzi coprono tutta la salita.
  {
    id: 'CRATER',
    tier: 'COMMON',
    levelFrom: 52,
    levelTo: 58,
    rarities: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'CRATER_ELITE',
    tier: 'ELITE',
    levelFrom: 55,
    levelTo: 59,
    rarities: ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  },
  {
    id: 'CRATER_BOSS',
    tier: 'BOSS',
    levelFrom: 57,
    levelTo: 60,
    rarities: ['RARE', 'EPIC', 'LEGENDARY'],
  },
];

/** I gradi, dal primo all'ultimo: l'ordine in cui si mostrano e in cui sale una scala. */
export const ITEM_RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const;

/** L'icona di un pezzo: la stessa immagine che il server attacca agli oggetti veri. */
export const itemIconUrl = (key: string): string => `/assets/aetheria/ui/items/96/${key}_96.png`;

/**
 * I materiali e le curiosita': le cose che hanno un nome proprio e non si indossano.
 *
 * Stavano in loot.ts col resto del bottino. Il nome e' quello che il giocatore legge nello
 * zaino, e l'id e' anche il nome della sua icona.
 */
export type MaterialCurioRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface MaterialCurio {
  id: string;
  name: string;
  /** Grado mostrato nello zaino. Assente sui materiali storici per compatibilita'. */
  rarity?: MaterialCurioRarity;
  /** Testo narrativo mostrato nei dettagli dell'oggetto. */
  description?: string;
}

export const MATERIAL_CURIOS: MaterialCurio[] = [
  ...PET_FOODS.map(({ id, name, rarity, description }) => ({ id, name, rarity, description })),
  { id: 'aether_crystal', name: "Cristallo d'Aether" },
  { id: 'aether_shard', name: "Scheggia d'Aether" },
  { id: 'forge_coal', name: 'Carbone da Forgia' },
  { id: 'forge_flux', name: 'Flusso da Forgia' },
  { id: 'forge_ingot', name: 'Lingotto da Forgia' },
  { id: 'herb_common', name: 'Erba Comune' },
  { id: 'herb_corrupted', name: 'Erba Corrotta' },
  { id: 'herb_rare', name: 'Erba Rara' },
  { id: 'key_iron', name: 'Chiave di Ferro' },
  { id: 'key_ornate', name: 'Chiave Ornata' },
  { id: 'key_void', name: 'Chiave del Vuoto' },
  { id: 'monster_claw', name: 'Artiglio di Mostro' },
  { id: 'monster_core', name: 'Nucleo di Mostro' },
  { id: 'monster_fang', name: 'Zanna di Mostro' },
  { id: 'monster_hide', name: 'Pelle di Mostro' },
  { id: 'monster_scale', name: 'Scaglia di Mostro' },
  { id: 'ore_common', name: 'Minerale Comune' },
  { id: 'ore_deep', name: 'Minerale Profondo' },
  { id: 'ore_rare', name: 'Minerale Raro' },
  { id: 'quest_map_fragment', name: 'Frammento di Mappa' },
  { id: 'quest_relic', name: 'Reliquia Antica' },
  { id: 'quest_scroll', name: 'Pergamena Misteriosa' },
  { id: 'rare_orb', name: 'Sfera Rara' },
  { id: 'rare_tome', name: 'Tomo Raro' },
  { id: 'wood_ancient', name: 'Legno Antico' },
  { id: 'wood_log', name: 'Tronco di Legno' },
  {
    id: 'aether_gel',
    name: 'Gelatina Eterea',
    rarity: 'COMMON',
    description:
      "Residuo viscoso lasciato dagli slime, ancora attraversato da piccole scintille d'Etere.",
  },
  {
    id: 'aether_nexus_shard',
    name: 'Scheggia del Nexus',
    rarity: 'UNCOMMON',
    description:
      'Frammento cristallizzato di un portale instabile che conserva una debole energia dimensionale.',
  },
  {
    id: 'herb_luminous_spore',
    name: 'Spora Lucente',
    rarity: 'COMMON',
    description: "Spora bioluminescente raccolta da organismi alterati dall'Etere.",
  },
  {
    id: 'monster_carapace_fragment',
    name: 'Frammento di Carapace',
    rarity: 'COMMON',
    description: 'Parte resistente della corazza naturale di una creatura.',
  },
  {
    id: 'monster_slime_core',
    name: 'Nucleo di Slime',
    rarity: 'UNCOMMON',
    description: 'Centro energetico di uno slime evoluto, ancora sospeso nella sua gelatina.',
  },
  {
    id: 'rare_moon_tear',
    name: 'Lacrima Lunare',
    rarity: 'RARE',
    description: 'Cristallo formatosi sotto la luce lunare, ricercato dagli alchimisti.',
  },
  {
    id: 'quest_ancient_seal',
    name: 'Sigillo Antico',
    rarity: 'RARE',
    description: 'Resti di un sigillo utilizzato dagli antichi custodi dei portali.',
  },
  {
    id: 'aether_shadow_essence',
    name: "Essenza d'Ombra",
    rarity: 'UNCOMMON',
    description: "Energia oscura racchiusa in un'ampolla e mantenuta stabile dall'Etere.",
  },
  {
    id: 'rare_nexus_heart',
    name: 'Cuore del Nexus',
    rarity: 'EPIC',
    description: 'Nucleo dimensionale estremamente instabile, nato vicino a un grande portale.',
  },
  {
    id: 'monster_void_eye',
    name: 'Occhio del Vuoto',
    rarity: 'EPIC',
    description:
      'Reliquia senziente proveniente dalle profondità del Vuoto; sembra osservare chi la trasporta.',
  },
  {
    id: 'ore_astral_amber',
    name: 'Ambra Astrale',
    rarity: 'RARE',
    description: 'Ambra che racchiude minuscoli frammenti di luce stellare.',
  },
  {
    id: 'rare_ether_prism',
    name: 'Prisma Etereo',
    rarity: 'LEGENDARY',
    description: "Cristallo capace di concentrare l'Etere quasi puro senza frantumarsi.",
  },
  {
    id: 'aether_arcane_dust',
    name: 'Polvere Arcana',
    rarity: 'COMMON',
    description: 'Residuo magico impiegato nelle lavorazioni e nei rituali più semplici.',
  },
  {
    id: 'herb_runic_fiber',
    name: 'Fibra Runica',
    rarity: 'COMMON',
    description: 'Fibra vegetale capace di trattenere piccole quantità di energia arcana.',
  },
  {
    id: 'aether_mana_drop',
    name: 'Goccia di Mana',
    rarity: 'COMMON',
    description: 'Mana condensato allo stato liquido, instabile fuori dal suo involucro.',
  },
  {
    id: 'herb_lunar_pollen',
    name: 'Polline Lunare',
    rarity: 'COMMON',
    description: 'Polline luminoso raccolto da piante che fioriscono soltanto di notte.',
  },
  {
    id: 'aether_spirit_ash',
    name: 'Cenere Spirituale',
    rarity: 'UNCOMMON',
    description: 'Cenere fredda lasciata dalle creature incorporee quando svaniscono.',
  },
  {
    id: 'ore_whispering_stone',
    name: 'Pietra Sussurrante',
    rarity: 'UNCOMMON',
    description: 'Sasso misterioso dal quale provengono deboli sussurri incomprensibili.',
  },
  {
    id: 'aether_resin',
    name: 'Resina Eterea',
    rarity: 'COMMON',
    description: 'Resina traslucida usata come reagente e collante magico.',
  },
  {
    id: 'herb_nexus_vine',
    name: 'Vite del Nexus',
    rarity: 'UNCOMMON',
    description: 'Tralcio cresciuto nelle vicinanze di un portale ancora attivo.',
  },
  {
    id: 'monster_fossil_fang',
    name: 'Zanna Fossile',
    rarity: 'COMMON',
    description: "Resti mineralizzati di una creatura vissuta prima dell'apertura dei portali.",
  },
  {
    id: 'monster_prismatic_scale',
    name: 'Squama Prismatica',
    rarity: 'UNCOMMON',
    description: 'Squama organica che riflette la luce in colori innaturali.',
  },
  {
    id: 'aether_crystalline_blood',
    name: 'Sangue Cristallino',
    rarity: 'UNCOMMON',
    description: "Fluido magico solidificato in frammenti cremisi non appena esposto all'aria.",
  },
  {
    id: 'herb_void_seed',
    name: 'Seme del Vuoto',
    rarity: 'RARE',
    description: 'Seme oscuro che sembra assorbire la luce circostante.',
  },
  {
    id: 'aether_mist_vial',
    name: 'Fiala di Nebbia',
    rarity: 'UNCOMMON',
    description: 'Nebbia incantata sigillata in una piccola ampolla.',
  },
  {
    id: 'forge_runic_gear',
    name: 'Ingranaggio Runico',
    rarity: 'UNCOMMON',
    description: 'Meccanismo antico alimentato da simboli arcani ancora luminosi.',
  },
  {
    id: 'rare_abyssal_pearl',
    name: 'Perla Abissale',
    rarity: 'RARE',
    description: 'Perla proveniente dalle profondità di acque sconosciute.',
  },
  {
    id: 'herb_forest_heart',
    name: 'Cuore della Foresta',
    rarity: 'RARE',
    description: 'Nucleo vegetale intriso di energia naturale e avvolto da radici vive.',
  },
  {
    id: 'monster_ether_egg',
    name: 'Uovo Etereo',
    rarity: 'RARE',
    description: "Uovo di una creatura profondamente alterata dall'Etere.",
  },
  {
    id: 'quest_time_fragment',
    name: 'Frammento Temporale',
    rarity: 'RARE',
    description: 'Scheggia nella quale un singolo istante sembra essersi fermato.',
  },
  {
    id: 'quest_burnt_scroll',
    name: 'Pergamena Bruciata',
    rarity: 'UNCOMMON',
    description: 'Documento antico quasi completamente consumato dalle fiamme.',
  },
  {
    id: 'quest_gatewarden_totem',
    name: 'Totem del Gatewarden',
    rarity: 'RARE',
    description: 'Piccola reliquia appartenuta a uno dei custodi dei portali.',
  },
  {
    id: 'rare_captured_soul',
    name: 'Anima Incapsulata',
    rarity: 'RARE',
    description: "Una debole essenza spirituale imprigionata all'interno del cristallo.",
  },
  {
    id: 'ore_fallen_star',
    name: 'Stella Caduta',
    rarity: 'EPIC',
    description: 'Frammento celeste ancora carico di energia astrale.',
  },
  {
    id: 'quest_broken_hourglass',
    name: 'Clessidra Infranta',
    rarity: 'EPIC',
    description: 'Il suo flusso di sabbia continua nonostante il vetro sia spezzato.',
  },
  {
    id: 'rare_tide_orb',
    name: 'Globo delle Maree',
    rarity: 'RARE',
    description: 'Sfera capace di contenere acqua in movimento perpetuo.',
  },
  {
    id: 'rare_twilight_sphere',
    name: 'Sfera del Crepuscolo',
    rarity: 'EPIC',
    description: 'Racchiude il fragile confine tra luce e oscurità.',
  },
  {
    id: 'quest_runic_tablet',
    name: 'Tavoletta Runica',
    rarity: 'RARE',
    description: 'Frammento di una lingua magica ormai dimenticata.',
  },
  {
    id: 'herb_eclipse_flower',
    name: "Fiore dell'Eclissi",
    rarity: 'EPIC',
    description: 'Fiore rarissimo che sboccia soltanto durante particolari fenomeni astrali.',
  },
  {
    id: 'rare_dawn_fragment',
    name: "Frammento dell'Alba",
    rarity: 'EPIC',
    description: 'Cristallo caldo che emette una luce simile al primo mattino.',
  },
  {
    id: 'rare_paradox_cube',
    name: 'Cubo Paradossale',
    rarity: 'EPIC',
    description: 'Oggetto impossibile che sembra cambiare forma quando viene osservato.',
  },
  {
    id: 'rare_bottled_phoenix',
    name: 'Fenice Imbottigliata',
    rarity: 'LEGENDARY',
    description: 'Fiamma vivente sigillata nel vetro che assume la forma di una fenice.',
  },
  {
    id: 'quest_first_portal_relic',
    name: 'Reliquia del Primo Portale',
    rarity: 'LEGENDARY',
    description: 'Frammento del primo varco che, secondo la leggenda, venne aperto su Aetheria.',
  },
  {
    id: 'ore_titan_core',
    name: 'Nucleo del Titano',
    rarity: 'EPIC',
    description: 'Cuore minerale ancora attraversato da energia incandescente.',
  },
  {
    id: 'rare_dragon_tear',
    name: 'Lacrima del Drago',
    rarity: 'LEGENDARY',
    description: 'Cristallo generato dal dolore di un antico drago.',
  },
  {
    id: 'key_planar',
    name: 'Chiave Planare',
    rarity: 'EPIC',
    description: 'Chiave di energia capace di reagire con portali normalmente inaccessibili.',
  },
  {
    id: 'herb_cosmic_seed',
    name: 'Seme Cosmico',
    rarity: 'LEGENDARY',
    description: 'Seme impossibile che contiene una minuscola galassia ancora in formazione.',
  },
  {
    id: 'monster_slime_king_essence',
    name: 'Essenza del Re Slime',
    rarity: 'LEGENDARY',
    description: 'Nucleo reale lasciato dal più potente esemplare della stirpe degli slime.',
  },
  {
    id: 'rare_origin_crystal',
    name: "Cristallo dell'Origine",
    rarity: 'LEGENDARY',
    description: "Una delle forme più pure e antiche conosciute dell'Etere.",
  },
  {
    id: 'rare_eternity_fragment',
    name: "Frammento d'Eternità",
    rarity: 'LEGENDARY',
    description: "Reliquia nella quale lo spazio sembra ripetersi all'infinito.",
  },
  {
    // Il Metallo Magico della riforgiatura (vedi forgeMaterials.ts): sta nel catalogo per la
    // wiki e per lo zaino, ma non esce dal giro dei cimeli qualsiasi - cade a parte, raro.
    id: 'magic_metal',
    name: 'Metallo Magico',
    rarity: 'EPIC',
    description:
      'Un lingotto che non si raffredda mai. I fabbri di Lumengate lo usano per sciogliere i bonus di un pezzo e rifonderli da capo: senza, non si riforgia.',
  },
];

/** A quale famiglia di materiali appartiene un id: serve alla wiki per raggrupparli invece di
 *  srotolarne ventisei di fila. La chiave e' il prefisso dell'id, che e' gia' il gruppo. */
export const curioGroupOf = (id: string): string => {
  const key = String(id ?? '');
  if (key.startsWith('aether')) return 'aether';
  if (key.startsWith('forge')) return 'forge';
  if (key.startsWith('herb')) return 'herb';
  if (key.startsWith('key')) return 'key';
  if (key.startsWith('monster')) return 'monster';
  if (key.startsWith('ore')) return 'ore';
  if (key.startsWith('quest')) return 'quest';
  if (key.startsWith('wood')) return 'wood';
  return 'rare';
};

/**
 * Il set che lascia una terra.
 *
 * Chi indossa tre pezzi rari o migliori dello stesso posto accende il secondo gradino del suo
 * set (vedi GEAR_SETS). La regola sta qui e non nel server perche' la wiki dice da dove viene
 * ogni set, e leggerla e' meglio che ricopiarla: una copia invecchia da sola.
 */
export const gearSetForSource = (source: string): string => {
  const key = String(source ?? '').toUpperCase();
  if (key.startsWith('WILDS')) return 'WAYFARER';
  if (key === 'GROVE_BOSS') return 'TIDEBORN';
  if (key.startsWith('GROVE')) return 'MIREWARD';
  if (key.startsWith('VOID')) return 'VOIDBOUND';
  if (key.startsWith('DEPTHS') || key.startsWith('TOWER')) return 'STONEBOUND';
  if (key.startsWith('ASHEN')) return 'ASHWROUGHT';
  if (key.startsWith('FROST')) return 'FROSTBOUND';
  if (key.startsWith('BASTION')) return 'HOLLOWBOUND';
  if (key.startsWith('RIFT')) return 'STORMBOUND';
  if (key.startsWith('VIGIL')) return 'STARLESS';
  if (key.startsWith('VOXTHRONE')) return 'SOVEREIGN';
  if (key.startsWith('CRATER')) return 'STARFALLEN';
  return 'ABYSSAL';
};

/** Le terre che lasciano i pezzi di un set, in ordine di livello: la riga che la wiki scrive
 *  sotto al nome del set. */
export const sourcesForGearSet = (setId: string): ItemSource[] =>
  ITEM_SOURCES.filter(
    (source) => gearSetForSource(source.id) === String(setId ?? '').toUpperCase(),
  );
