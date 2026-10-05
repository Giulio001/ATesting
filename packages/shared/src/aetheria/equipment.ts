/**
 * Chi puo' indossare cosa.
 *
 * Fino a ieri l'equipaggiamento controllava solo lo slot: un arciere poteva infilarsi uno scudo
 * e un cavaliere del vuoto una lama, perche' il gioco guardava "e' un OFFHAND?" e non "e' roba
 * del suo cammino?". Le regole stanno qui perche' le applicano in due: il server quando
 * equipaggia, il client per dirlo prima che il giocatore ci provi.
 */
export type WeaponFamily =
  | 'blade'
  | 'cleaver'
  | 'warhammer'
  | 'lance'
  | 'bow'
  | 'daggers'
  | 'staff'
  | 'scepter'
  | 'catalyst';

/** Le parole che riconoscono la famiglia di un'arma nel suo nome, in inglese e in italiano:
 *  i drop si chiamano "Fractured Blade", i pezzi iniziali "Spada di Ferro d'Aether". */
const WEAPON_WORDS: ReadonlyArray<readonly [WeaponFamily, readonly string[]]> = [
  ['blade', ['blade', 'sword', 'spada', 'lama']],
  ['cleaver', ['cleaver', 'axe', 'ascia', 'scure']],
  ['warhammer', ['warhammer', 'hammer', 'mace', 'martello']],
  ['bow', ['bow', 'arco']],
  ['daggers', ['daggers', 'dagger', 'fang', 'pugnal', 'zanna']],
  ['lance', ['lance', 'spear', 'lancia', 'asta']],
  ['staff', ['staff', 'bastone']],
  // Lo scettro e' l'arma del Mago; le bacchette trovate prima che la famiglia si chiamasse
  // cosi' restano scettri a tutti gli effetti.
  ['scepter', ['scepter', 'scettro', 'wand', 'bacchetta']],
  ['catalyst', ['catalyst', 'orb', 'sfera', 'crystal', 'cristallo', 'shard', 'frammento']],
];

export const weaponFamilyOf = (name: string): WeaponFamily | undefined => {
  const value = String(name ?? '').toLowerCase();
  for (const [family, words] of WEAPON_WORDS)
    if (words.some((word) => value.includes(word))) return family;
  return undefined;
};

const SHIELD_WORDS = [
  'shield',
  'scudo',
  'aegis',
  'egida',
  'bulwark',
  'baluardo',
  'buckler',
  'brocchiere',
];
export const isShieldItem = (name: string): boolean => {
  const value = String(name ?? '').toLowerCase();
  return SHIELD_WORDS.some((word) => value.includes(word));
};

/** Chi impugna cosa. Il ranger impugna solo archi. */
const CLASS_WEAPONS: Record<string, readonly WeaponFamily[]> = {
  GUARDIAN: ['blade', 'cleaver', 'warhammer', 'lance'],
  AETHER_BLADE: ['bow'],
  VOID_KNIGHT: ['staff', 'scepter', 'catalyst'],
  SHADOW_ROGUE: ['daggers'],
};

/**
 * Se questo cammino impugna un'arma che si chiama cosi'.
 *
 * Diverso da `equipRefusal`, che conserva l’eccezione del kit iniziale per gli altri cammini - la lezione del
 * fabbro si fa con quella spada qualunque sia il cammino. Va bene per equipaggiare, non per
 * vendere: al banco quella stessa eccezione faceva trovare l'arco sotto le mani di un guardiano,
 * e il catalogo prometteva tre armi a chi ne puo' usare una.
 */
export const classUsesWeapon = (specialization: string, name: string): boolean => {
  const families = CLASS_WEAPONS[String(specialization ?? 'UNBOUND').toUpperCase()];
  if (!families) return true;
  const family = weaponFamilyOf(name);
  return family
    ? families.includes(family)
    : !['AETHER_BLADE', 'SHADOW_ROGUE'].includes(specialization.toUpperCase());
};

/** Lo scudo e' del Guardiano. L'Aether Blade combatte col suo arco e il Mago con lo
 *  scettro: sono cammini a due mani, e lo scudo gli sta in mezzo ai piedi. */
export const classUsesShield = (specialization: string): boolean => {
  const value = String(specialization ?? 'UNBOUND').toUpperCase();
  return value === 'GUARDIAN' || value === 'UNBOUND';
};

export type EquipRefusal = '' | 'weapon' | 'shield';

/**
 * Perche' un oggetto non si puo' indossare, o stringa vuota se si puo'. Chi non ha ancora
 * scelto un cammino puo' provare tutto: la scelta arriva al primo ingresso, e prima di allora
 * non avrebbe senso bloccargli le mani. Il ranger usa solo archi, compreso il kit iniziale; gli altri cammini conservano
 * l’eccezione per le armi iniziali.
 */
export function equipRefusal(
  specialization: string,
  kind: string,
  name: string,
  id = '',
): EquipRefusal {
  const spec = String(specialization ?? 'UNBOUND').toUpperCase();
  if (spec === 'UNBOUND' || !CLASS_WEAPONS[spec]) return '';
  if (String(id).startsWith('starter-') && spec !== 'AETHER_BLADE' && spec !== 'SHADOW_ROGUE')
    return '';
  if (kind === 'OFFHAND') return isShieldItem(name) && !classUsesShield(spec) ? 'shield' : '';
  if (kind !== 'WEAPON') return '';
  const family = weaponFamilyOf(name);
  // Per il ranger una famiglia sconosciuta non dimostra che l’arma sia un arco.
  if (!family) return spec === 'AETHER_BLADE' || spec === 'SHADOW_ROGUE' ? 'weapon' : '';
  return CLASS_WEAPONS[spec].includes(family) ? '' : 'weapon';
}
