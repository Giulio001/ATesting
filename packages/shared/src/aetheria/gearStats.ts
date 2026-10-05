/**
 * I valori propri di ogni pezzo d'equipaggiamento, e come la forgia li fa crescere.
 *
 * Un pezzo ha due meta'. I valori **propri** vengono da cosa e': il tipo e la rarita' (una corazza
 * mitica da' vita e difesa), la famiglia (le scarpe Treads corrono di piu'), il disegno (la Lama
 * del Gelo e' piu' svelta), la specie (la tartaruga para). I bonus **aggiunti** invece sono
 * fortuna: quelli sorteggiati al drop e quelli rifatti dalla riforgiatura.
 *
 * La forgia fa crescere solo i primi: ogni gradino aggiunge una percentuale dei valori propri,
 * mai dei bonus sorteggiati. Cosi' un +9 e' lo stesso pezzo, piu' forte in quello che e' - e la
 * fortuna resta fortuna, da cercare riforgiando.
 *
 * Sta nel pacchetto condiviso perche' lo leggono in due: il server, che mette i numeri addosso al
 * personaggio, e il client, che li mostra sul pezzo e nell'anteprima della forgia. Due copie
 * direbbero due numeri diversi.
 */
import { FEET_FAMILIES, PET_FAMILIES } from './itemCatalog.js';
import { gearIconKey } from './gearPieces.js';

const TIERS = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
const tierOf = (rarity: string): number =>
  Math.max(
    0,
    TIERS.indexOf(
      String(rarity ?? '')
        .trim()
        .toUpperCase(),
    ),
  );

/** L'attacco per gradino di un'arma e di un anello (lo legge anche il metro dei boss). */
export const GEAR_ATTACK_PER_TIER = { weapon: 8, accessory: 3 } as const;

/**
 * Il gradino con cui si calcolano i valori base: da insolito in su e' il gradino di rarita'
 * (1..4), il comune vale mezzo. A +0 ogni pezzo da' qualcosa, anche il comune.
 */
export const gearScale = (tier: number): number => (tier > 0 ? tier : 0.5);

/** Le collane danno sempre velocita' d'attacco e schivata (%), per gradino [comune .. mitico]. */
export const NECK_ATTACK_SPEED = [1, 2.5, 4, 5.5, 7];
export const NECK_DODGE = [1, 2, 3, 4, 5];

export interface GearStatLine {
  hp?: number;
  mp?: number;
  def?: number;
  attack?: number;
  speed?: number;
  regen?: number;
  crit?: number;
  attackSpeed?: number;
  abilityPower?: number;
  cooldownReduction?: number;
  dodge?: number;
  block?: number;
}

/**
 * I valori base di un pezzo per tipo e gradino di rarita' (0 comune .. 4 mitico), a +0 e prima
 * di famiglia, disegno o sorteggio. I compagni hanno la loro riga per specie (PET_SPECIES_STATS).
 */
export const baseGearStats = (kind: string, tier: number): GearStatLine => {
  const g = gearScale(tier);
  const whole = (value: number) => Math.round(value);
  const tenth = (value: number) => Math.round(value * 10) / 10;
  switch (kind) {
    case 'WEAPON':
      return { attack: whole(GEAR_ATTACK_PER_TIER.weapon * g) };
    case 'ARMOR':
      return { hp: whole(35 * g), def: whole(3 * g) };
    case 'HEAD':
      return { mp: whole(20 * g), regen: tenth(g), def: whole(2 * g) };
    case 'OFFHAND':
      return { def: whole(4 * g), hp: whole(18 * g) };
    case 'ACCESSORY':
      return {
        speed: whole(4 * g),
        attack: whole(GEAR_ATTACK_PER_TIER.accessory * g),
        regen: tenth(g),
      };
    case 'NECK':
      return {
        def: 1 + 2 * tier,
        attackSpeed: NECK_ATTACK_SPEED[tier] ?? 0,
        dodge: NECK_DODGE[tier] ?? 0,
      };
    case 'FEET':
      return { speed: 3 + 3 * tier, def: 1 + 2 * tier };
    default:
      return {};
  }
};

/**
 * Il carattere di ogni disegno, sopra le doti del suo tipo: la Lama del Gelo e' piu' svelta,
 * quella di Magma piu' cattiva, lo Scettro delle Orbite spinge le abilita'. Numeri assoluti (il
 * disegno ha gia' il suo gradino). Le chiavi sono le icone di GEAR_PIECES.
 */
export const GEAR_PIECE_BONUS: Record<string, GearStatLine> = {
  dagger_scout: { attackSpeed: 1 },
  dagger_bronze: { crit: 1 },
  dagger_steel: { def: 2 },
  dagger_thorn: { hp: 20 },
  dagger_bone: { attack: 2 },
  dagger_ruby: { crit: 2 },
  dagger_sapphire: { abilityPower: 3 },
  dagger_frost: { attackSpeed: 3 },
  dagger_venom: { crit: 3 },
  dagger_serrated: { attack: 4 },
  dagger_shadow: { dodge: 3 },
  dagger_magma: { attack: 6 },
  dagger_void: { abilityPower: 9 },
  dagger_seraph: { def: 6 },
  dagger_dragon: { crit: 5 },
  dagger_storm: { attackSpeed: 7 },
  dagger_bloom: { hp: 120 },
  dagger_astral: { abilityPower: 12 },
  dagger_sunfire: { attack: 8 },
  // Archi: i bonus hanno lo stesso ordine di grandezza delle altre armi del loro grado.
  bow_hunter: { crit: 1 },
  bow_reinforced: { def: 2 },
  bow_scout: { attackSpeed: 1 },
  bow_thornvine: { hp: 20 },
  bow_elven: { crit: 2 },
  bow_moonsteel: { attackSpeed: 3 },
  bow_azure: { abilityPower: 3 },
  bow_grove: { hp: 40 },
  bow_bone: { attack: 4 },
  bow_bloodthorn: { crit: 3 },
  bow_frost: { attackSpeed: 3 },
  bow_magma: { attack: 6 },
  bow_void: { abilityPower: 9 },
  bow_seraph: { def: 6 },
  bow_dragon: { crit: 5 },
  bow_storm: { attackSpeed: 7 },
  bow_bloom: { hp: 120 },
  bow_astral: { abilityPower: 12 },
  bow_sunfire: { attack: 8 },
  // Spade: comuni
  sword_steel_plain: { crit: 1 },
  sword_bronze: { attackSpeed: 1 },
  sword_knight: { def: 2 },
  // insolite
  sword_ruby: { crit: 2 },
  sword_sapphire: { abilityPower: 3 },
  sword_serrated: { attack: 2 },
  sword_frost: { attackSpeed: 3 },
  // rare
  sword_magma: { crit: 3 },
  sword_void: { abilityPower: 6 },
  sword_thornvine: { hp: 40 },
  sword_bone: { attack: 4 },
  // favolose
  sword_seraph: { def: 6 },
  sword_nightshade: { crit: 5 },
  sword_spectral: { attackSpeed: 5 },
  sword_stormguard: { abilityPower: 9 },
  // mitiche
  sword_bloodfire: { crit: 7 },
  sword_sunfire: { attack: 8 },
  sword_ancient_grove: { hp: 120 },
  sword_starstorm: { attackSpeed: 7 },
  // Scettri: comuni
  scepter_wanderer: { mp: 15 },
  scepter_vine: { regen: 0.5 },
  scepter_amethyst: { abilityPower: 2 },
  // insoliti
  scepter_crescent: { mp: 30 },
  scepter_frostspike: { cooldownReduction: 2 },
  scepter_skullhorn: { crit: 2 },
  scepter_seraph: { regen: 1 },
  // rari
  scepter_voidorb: { abilityPower: 6 },
  scepter_ember: { crit: 3 },
  scepter_glacier: { cooldownReduction: 4 },
  scepter_bloom: { regen: 2 },
  // favolosi
  scepter_sunburst: { abilityPower: 9 },
  scepter_moonshadow: { mp: 80 },
  scepter_tidecaller: { cooldownReduction: 6 },
  scepter_bloodgem: { crit: 5 },
  // mitici
  scepter_archangel: { regen: 3, mp: 60 },
  scepter_emerald_wraith: { cooldownReduction: 8 },
  scepter_orrery: { abilityPower: 12 },
  scepter_voidcrown: { crit: 6, abilityPower: 6 },
};

/**
 * Il carattere di ogni famiglia di scarpe, per gradino (si moltiplica per gearScale), sopra il
 * passo e la difesa che tutte le scarpe danno. Le chiavi sono i nomi di FEET_FAMILIES.
 */
export const FEET_FAMILY_BONUS: Record<string, GearStatLine> = {
  Treads: { speed: 2 },
  Greaves: { def: 2, hp: 8, speed: -1 },
  Wildwalkers: { hp: 14, regen: 0.4 },
  Voidsteps: { mp: 14, regen: 0.2 },
  Emberstriders: { attack: 1.5, speed: 0.5 },
};

/** La riga di ogni specie di compagno, per gradino di rarita' (0 comune .. 4 mitico). */
export const PET_SPECIES_STATS: Record<string, GearStatLine> = {
  Lynx: { attack: 3, speed: 3, hp: 8 },
  Boar: { attack: 2, hp: 18, def: 2 },
  Turtle: { hp: 22, def: 3, regen: 0.5 },
  Toad: { hp: 12, mp: 14, regen: 1 },
  Raven: { speed: 4, mp: 10, crit: 1 },
  Whelp: { def: 4, hp: 16 },
  Fox: { hp: 15, mp: 12 },
};

/** I pezzi del kit iniziale hanno numeri loro, scritti a mano (vedi createStarterGear). */
/**
 * L'attacco dell'arma del kit iniziale: sotto una comune (4) e un'insolita (8), cosi' il primo
 * pezzo che cade e' gia' un passo avanti. Era 9, e i primi drop sembravano inutili.
 */
export const STARTER_WEAPON_ATTACK = 3;

export const STARTER_GEAR_STATS: Record<string, GearStatLine> = {
  'starter-sword': { attack: STARTER_WEAPON_ATTACK },
  'starter-bow': { attack: STARTER_WEAPON_ATTACK },
  'starter-catalyst': { attack: STARTER_WEAPON_ATTACK },
  'starter-daggers': { attack: STARTER_WEAPON_ATTACK },
  // Il resto del kit, come l'arma: circa tre quarti di un comune del suo tipo, con le doti del
  // suo tipo (il berretto da' mana, non vita). Era 75 vita e 12 difesa per l'armatura - la
  // difesa di una corazza mitica - e nessun pezzo trovato per ore sembrava un passo avanti.
  'recruit-armor': { hp: 13, def: 1 },
  'traveller-cap': { mp: 8, regen: 0.4, def: 1 },
  'wood-shield': { def: 1, hp: 7 },
  'aether-fox': { hp: 50, mp: 30, def: 5, regen: 2 },
};

/** Il nome della statistica sul pezzo, per ogni voce di una GearStatLine. */
const FIELD: Record<keyof GearStatLine, string> = {
  hp: 'bonusHp',
  mp: 'bonusMp',
  def: 'bonusDef',
  attack: 'bonusAttack',
  speed: 'bonusSpeed',
  regen: 'bonusRegen',
  crit: 'bonusCrit',
  attackSpeed: 'bonusAttackSpeed',
  abilityPower: 'bonusAbilityPower',
  cooldownReduction: 'bonusCooldownReduction',
  dodge: 'bonusDodge',
  block: 'bonusBlock',
};
const add = (into: Record<string, number>, line: GearStatLine | undefined, times = 1) => {
  if (!line) return;
  for (const [key, value] of Object.entries(line) as Array<[keyof GearStatLine, number]>) {
    if (!value) continue;
    into[FIELD[key]] = (into[FIELD[key]] ?? 0) + value * times;
  }
};

export interface GearIdentity {
  id?: string;
  kind?: string;
  rarity?: string;
  name?: string;
  icon?: string;
}

/**
 * I valori propri di un pezzo, statistica per statistica ("bonusAttack", "bonusDodge", ...): quello
 * che e' per tipo, rarita', famiglia, disegno o specie. Mai i bonus sorteggiati.
 */
export const intrinsicGearStats = (item: GearIdentity): Record<string, number> => {
  const out: Record<string, number> = {};
  const id = String(item?.id ?? '');
  const starter = Object.keys(STARTER_GEAR_STATS).find(
    (baseId) => id === baseId || id.startsWith(`${baseId}-daily-`),
  );
  if (starter) {
    add(out, STARTER_GEAR_STATS[starter]);
    return out;
  }
  const kind = String(item?.kind ?? '').toUpperCase();
  const tier = tierOf(String(item?.rarity ?? ''));
  if (kind === 'PET') {
    const name = String(item?.name ?? '');
    const species =
      PET_FAMILIES.map((family) => family.name).find((entry) => name.includes(entry)) ?? 'Fox';
    add(out, PET_SPECIES_STATS[species], tier);
    return out;
  }
  add(out, baseGearStats(kind, tier));
  const icon = gearIconKey(String(item?.icon ?? ''));
  if (kind === 'FEET') {
    const family = FEET_FAMILIES.find((entry) => entry.ladder.includes(icon))?.name ?? '';
    add(out, FEET_FAMILY_BONUS[family], gearScale(tier));
  }
  add(out, GEAR_PIECE_BONUS[icon]);
  return out;
};

/** Il gradino piu' alto della forgia. */
export const FORGE_MAX_UPGRADE = 9;

/**
 * Quanto cresce un pezzo a ogni gradino, in frazione dei suoi valori propri, per rarita'
 * [comune .. mitico]: un mitico a +9 vale 2,5 volte il suo +0, un comune quasi il doppio.
 */
export const FORGE_GROWTH = [0.1, 0.11, 0.12, 0.14, 0.17];
/** Le percentuali (critico, velocita' d'attacco, schivata, ...) crescono alla meta': hanno un tetto
 *  sul personaggio (35-40%), e un +9 che le raddoppiasse lo sfonderebbe con due pezzi. */
export const FORGE_PERCENT_STATS: readonly string[] = [
  'bonusCrit',
  'bonusAttackSpeed',
  'bonusCooldownReduction',
  'bonusDodge',
  'bonusBlock',
];

/**
 * Quanto aggiunge un gradino a quella statistica di quel pezzo. `stored` e' il valore scritto sul
 * pezzo (propri + sorteggiati): la crescita si calcola sui propri, mai piu' di quanto il pezzo
 * abbia davvero - un pezzo di una volta con meno della base di oggi cresce su quello che ha.
 */
export const forgeLevelGain = (item: GearIdentity, stat: string, stored: number): number => {
  const own = intrinsicGearStats(item)[stat] ?? 0;
  const value = Number(stored) || 0;
  const growing = own > 0 ? Math.max(0, Math.min(own, value)) : 0;
  const rate =
    FORGE_GROWTH[tierOf(String(item?.rarity ?? ''))] *
    (FORGE_PERCENT_STATS.includes(stat) ? 0.5 : 1);
  return growing * rate;
};

/** Il valore di una statistica con il potenziamento addosso: quello scritto sul pezzo, piu' la
 *  crescita dei suoi valori propri per ogni gradino. */
export const forgeUpgradedValue = (
  item: GearIdentity & { upgradeLevel?: number },
  stat: string,
  stored: number,
): number => {
  const steps = Math.max(
    0,
    Math.min(FORGE_MAX_UPGRADE, Math.floor(Number(item?.upgradeLevel) || 0)),
  );
  const raw = Number(stored) || 0;
  if (!steps) return raw;
  return Math.round((raw + forgeLevelGain(item, stat, raw) * steps) * 100) / 100;
};
