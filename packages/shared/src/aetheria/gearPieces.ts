/**
 * I pezzi disegnati uno per uno: ogni icona ha il suo nome, in inglese e in italiano.
 *
 * Fino alle scarpe un pezzo si chiamava come la sua famiglia ("Fractured Cuirass"), e cento drop
 * della stessa famiglia si chiamavano tutti uguali anche con cento disegni diversi. Adesso il
 * nome e' quello del disegno: una "Lama di Magma" e' quella lama li', e basta leggerlo per
 * sapere cosa si ha in mano.
 *
 * Il nome che il server scrive sul pezzo resta inglese ("Mythic Magma Blade"): e' quello che il
 * mercato cerca, che la chat cita e che decide chi puo' impugnare un'arma (weaponFamilyOf legge
 * le parole "blade", "staff", "scepter"). La traduzione e' solo di chi guarda: `localizeGearName`
 * lo rigira in italiano, con la provenienza accordata al genere del pezzo.
 *
 * Le icone vengono da tools/items/fogli.py (collane, spade, scettri, elmi) e scarpe.py.
 */

import { weaponFamilyOf } from './equipment.js';

/** Maschile/femminile, singolare/plurale: serve ad accordare la provenienza ("Mitica", "Mitici"). */
export type GearGender = 'ms' | 'fs' | 'mp' | 'fp';

export interface GearPiece {
  /** La chiave dell'icona: /assets/aetheria/ui/items/96/<icon>_96.png */
  icon: string;
  en: string;
  it: string;
  g: GearGender;
}

const piece = (icon: string, en: string, it: string, g: GearGender): GearPiece => ({
  icon,
  en,
  it,
  g,
});

/** Le collane, dal comune al leggendario: quattro per gradino. */
export const NECK_PIECES: readonly GearPiece[] = [
  piece('neck_stone_bead', 'Stone Bead Necklace', 'Collana con Perla di Pietra', 'fs'),
  piece('neck_fang', 'Fang Necklace', 'Collana di Zanna', 'fs'),
  piece('neck_leafwoven', 'Leafwoven Torc', 'Torque di Foglie', 'ms'),
  piece('neck_oak_medallion', 'Oak Medallion', 'Medaglione di Quercia', 'ms'),
  piece('neck_claws', 'Claw Necklace', "Collana d'Artigli", 'fs'),
  piece('neck_spiral', 'Spiral Pendant', 'Pendente a Spirale', 'ms'),
  piece('neck_sapphire_chain', 'Sapphire Chain', 'Catena di Zaffiro', 'fs'),
  piece('neck_amber', 'Amber Torc', "Torque d'Ambra", 'ms'),
  piece('neck_silver_choker', 'Silver Choker', "Girocollo d'Argento", 'ms'),
  piece('neck_winged_sapphire', 'Winged Sapphire Collar', 'Collare dello Zaffiro Alato', 'ms'),
  piece('neck_bloodthorn', 'Bloodthorn Collar', 'Collare di Spinasangue', 'ms'),
  piece('neck_skull', 'Skullbone Necklace', 'Collana del Teschio', 'fs'),
  piece('neck_bloom', 'Bloomheart Garland', 'Ghirlanda del Cuore in Fiore', 'fs'),
  piece('neck_voidcoil', 'Voidcoil Collar', 'Collare delle Spire del Vuoto', 'ms'),
  piece('neck_magma', 'Magmaheart Collar', 'Collare dal Cuore di Magma', 'ms'),
  piece('neck_frostshard', 'Frostshard Necklace', 'Collana di Schegge di Ghiaccio', 'fs'),
  piece('neck_skywing', 'Skywing Collar', 'Collare Ala di Cielo', 'ms'),
  piece('neck_nightthorn', 'Nightthorn Torc', 'Torque di Spinanotte', 'ms'),
  piece('neck_tidecrown', 'Tidecrown Necklace', 'Collana della Corona delle Maree', 'fs'),
  piece('neck_phoenix', 'Phoenix Collar', 'Collare della Fenice', 'ms'),
];

/** Le spade del Guardiano. Ogni nome inglese contiene "Blade" o "Sword": e' la parola che lo
 *  fa riconoscere come lama (weaponFamilyOf), e un test lo controlla pezzo per pezzo. */
export const SWORD_PIECES: readonly GearPiece[] = [
  piece('sword_rough_iron', 'Rough Iron Sword', 'Spada di Ferro Grezzo', 'fs'),
  piece('sword_steel_plain', 'Steel Sword', "Spada d'Acciaio", 'fs'),
  piece('sword_bronze', 'Bronze Sword', 'Spada di Bronzo', 'fs'),
  piece('sword_knight', "Knight's Sword", 'Spada del Cavaliere', 'fs'),
  piece('sword_ruby', 'Ruby Blade', 'Lama di Rubino', 'fs'),
  piece('sword_sapphire', 'Sapphire Blade', 'Lama di Zaffiro', 'fs'),
  piece('sword_serrated', 'Serrated Blade', 'Lama a Sega', 'fs'),
  piece('sword_frost', 'Frost Blade', 'Lama del Gelo', 'fs'),
  piece('sword_magma', 'Magma Blade', 'Lama di Magma', 'fs'),
  piece('sword_void', 'Void Blade', 'Lama del Vuoto', 'fs'),
  piece('sword_thornvine', 'Thornvine Sword', 'Spada dei Rovi', 'fs'),
  piece('sword_bone', 'Bone Sword', "Spada d'Osso", 'fs'),
  piece('sword_seraph', 'Seraph Sword', 'Spada del Serafino', 'fs'),
  piece('sword_nightshade', 'Nightshade Blade', 'Lama di Belladonna', 'fs'),
  piece('sword_spectral', 'Spectral Blade', 'Lama degli Spettri', 'fs'),
  piece('sword_stormguard', 'Stormguard Sword', 'Spada della Tempesta', 'fs'),
  piece('sword_bloodfire', 'Bloodfire Blade', 'Lama di Sangue e Fuoco', 'fs'),
  piece('sword_sunfire', 'Sunfire Sword', 'Spada del Sole', 'fs'),
  piece('sword_ancient_grove', 'Ancient Grove Sword', 'Spada del Bosco Antico', 'fs'),
  piece('sword_starstorm', 'Starstorm Blade', 'Lama della Tempesta Astrale', 'fs'),
];

/** Gli archi del Ranger: quattro disegni per rarita', dal legno alle reliquie mitiche. */
export const DAGGER_PIECES: readonly GearPiece[] = [
  piece('dagger_rough_iron', 'Rough Iron Dagger', 'Pugnale di Ferro Grezzo', 'ms'),
  piece('dagger_scout', 'Scout Dagger', 'Pugnale dell’Esploratore', 'ms'),
  piece('dagger_bronze', 'Bronze Dagger', 'Pugnale di Bronzo', 'ms'),
  piece('dagger_steel', 'Steel Dagger', 'Pugnale d’Acciaio', 'ms'),
  piece('dagger_thorn', 'Thorn Dagger', 'Pugnale dei Rovi', 'ms'),
  piece('dagger_bone', 'Bone Dagger', 'Pugnale d’Osso', 'ms'),
  piece('dagger_ruby', 'Ruby Dagger', 'Pugnale di Rubino', 'ms'),
  piece('dagger_sapphire', 'Sapphire Dagger', 'Pugnale di Zaffiro', 'ms'),
  piece('dagger_frost', 'Frost Dagger', 'Pugnale del Gelo', 'ms'),
  piece('dagger_venom', 'Venom Dagger', 'Pugnale del Veleno', 'ms'),
  piece('dagger_serrated', 'Serrated Dagger', 'Pugnale a Sega', 'ms'),
  piece('dagger_shadow', 'Shadow Dagger', 'Pugnale dell’Ombra', 'ms'),
  piece('dagger_magma', 'Magma Dagger', 'Pugnale di Magma', 'ms'),
  piece('dagger_void', 'Void Dagger', 'Pugnale del Vuoto', 'ms'),
  piece('dagger_seraph', 'Seraph Dagger', 'Pugnale del Serafino', 'ms'),
  piece('dagger_dragon', 'Dragon Dagger', 'Pugnale del Drago', 'ms'),
  piece('dagger_storm', 'Storm Dagger', 'Pugnale della Tempesta', 'ms'),
  piece('dagger_bloom', 'Everbloom Dagger', 'Pugnale dell’Eterna Fioritura', 'ms'),
  piece('dagger_astral', 'Astral Dagger', 'Pugnale Astrale', 'ms'),
  piece('dagger_sunfire', 'Sunfire Dagger', 'Pugnale del Sole', 'ms'),
];

export const BOW_PIECES: readonly GearPiece[] = [
  piece('bow_ashwood', 'Ashwood Bow', 'Arco di Frassino', 'ms'),
  piece('bow_hunter', "Hunter's Bow", 'Arco del Cacciatore', 'ms'),
  piece('bow_reinforced', 'Ironbound Bow', 'Arco Rinforzato', 'ms'),
  piece('bow_scout', "Scout's Bow", "Arco dell'Esploratore", 'ms'),
  piece('bow_thornvine', 'Thornvine Bow', 'Arco dei Rovi', 'ms'),
  piece('bow_elven', 'Elven Bow', 'Arco Elfico', 'ms'),
  piece('bow_moonsteel', 'Moonsteel Bow', "Arco d'Acciaio Lunare", 'ms'),
  piece('bow_azure', 'Azure Bow', 'Arco Azzurro', 'ms'),
  piece('bow_grove', 'Grovekeeper Bow', 'Arco del Custode del Bosco', 'ms'),
  piece('bow_bone', 'Bonefang Bow', "Arco delle Zanne d'Osso", 'ms'),
  piece('bow_bloodthorn', 'Bloodthorn Bow', 'Arco di Spinasangue', 'ms'),
  piece('bow_frost', 'Frostshard Bow', 'Arco di Ghiaccio', 'ms'),
  piece('bow_magma', 'Magma Bow', 'Arco di Magma', 'ms'),
  piece('bow_void', 'Voidcoil Bow', 'Arco delle Spire del Vuoto', 'ms'),
  piece('bow_seraph', 'Seraph Bow', 'Arco del Serafino', 'ms'),
  piece('bow_dragon', 'Dragonfire Bow', 'Arco del Drago', 'ms'),
  piece('bow_storm', 'Stormcaller Bow', 'Arco della Tempesta', 'ms'),
  piece('bow_bloom', 'Everbloom Bow', "Arco dell'Eterna Fioritura", 'ms'),
  piece('bow_astral', 'Astral Bow', 'Arco Astrale', 'ms'),
  piece('bow_sunfire', 'Sunfire Bow', 'Arco del Sole', 'ms'),
];

/** Gli scettri del Mago: ogni nome inglese contiene "Staff" o "Scepter". */
export const SCEPTER_PIECES: readonly GearPiece[] = [
  piece('scepter_oak', 'Oak Staff', 'Bastone di Quercia', 'ms'),
  piece('scepter_wanderer', "Wanderer's Staff", 'Bastone del Viandante', 'ms'),
  piece('scepter_vine', 'Vinewrapped Staff', 'Bastone dei Rampicanti', 'ms'),
  piece('scepter_amethyst', 'Amethyst Staff', "Bastone d'Ametista", 'ms'),
  piece('scepter_crescent', 'Crescent Scepter', 'Scettro della Mezzaluna', 'ms'),
  piece('scepter_frostspike', 'Frostspike Scepter', 'Scettro delle Punte di Ghiaccio', 'ms'),
  piece('scepter_skullhorn', 'Skullhorn Staff', 'Bastone del Teschio Cornuto', 'ms'),
  piece('scepter_seraph', 'Seraph Scepter', 'Scettro del Serafino', 'ms'),
  piece('scepter_voidorb', 'Void Orb Scepter', 'Scettro della Sfera del Vuoto', 'ms'),
  piece('scepter_ember', 'Emberheart Scepter', 'Scettro del Cuore di Brace', 'ms'),
  piece('scepter_glacier', 'Glacier Staff', 'Bastone del Ghiacciaio', 'ms'),
  piece('scepter_bloom', 'Blossom Staff', 'Bastone dei Fiori', 'ms'),
  piece('scepter_sunburst', 'Sunburst Scepter', 'Scettro del Sole Nascente', 'ms'),
  piece('scepter_moonshadow', 'Moonshadow Scepter', "Scettro dell'Ombra Lunare", 'ms'),
  piece('scepter_tidecaller', 'Tidecaller Scepter', 'Scettro Richiamo delle Maree', 'ms'),
  piece('scepter_bloodgem', 'Bloodgem Scepter', 'Scettro della Gemma di Sangue', 'ms'),
  piece('scepter_archangel', 'Archangel Scepter', "Scettro dell'Arcangelo", 'ms'),
  piece(
    'scepter_emerald_wraith',
    'Emerald Wraith Staff',
    'Bastone dello Spettro di Smeraldo',
    'ms',
  ),
  piece('scepter_orrery', 'Orrery Scepter', 'Scettro delle Orbite', 'ms'),
  piece('scepter_voidcrown', 'Voidcrown Scepter', 'Scettro della Corona del Vuoto', 'ms'),
];

/** Gli elmi, per tutti i cammini. */
export const HELM_PIECES: readonly GearPiece[] = [
  piece('helm_hood', 'Leather Hood', 'Cappuccio di Cuoio', 'ms'),
  piece('helm_iron_plain', 'Iron Helm', 'Elmo di Ferro', 'ms'),
  piece('helm_bronze', 'Bronze Helm', 'Elmo di Bronzo', 'ms'),
  piece('helm_valkyrie', 'Valkyrie Helm', 'Elmo della Valchiria', 'ms'),
  piece('helm_gilded_wing', 'Gilded Wing Helm', 'Elmo dalle Ali Dorate', 'ms'),
  piece('helm_plumed', 'Plumed Helm', 'Elmo dal Pennacchio Blu', 'ms'),
  piece('helm_legionnaire', 'Legionnaire Helm', 'Elmo del Legionario', 'ms'),
  piece('helm_raider', "Raider's Helm", 'Elmo del Predone', 'ms'),
  piece('helm_skull', 'Skull Helm', 'Elmo del Teschio', 'ms'),
  piece('helm_druid', 'Druid Helm', 'Elmo del Druido', 'ms'),
  piece('helm_grove_warden', 'Grove Warden Helm', 'Elmo del Custode del Bosco', 'ms'),
  piece('helm_bloodforged', 'Bloodforged Helm', 'Elmo Forgiato nel Sangue', 'ms'),
  piece('helm_frost', 'Frost Helm', 'Elmo di Ghiaccio', 'ms'),
  piece('helm_magma', 'Magma Helm', 'Elmo di Magma', 'ms'),
  piece('helm_void', 'Void Helm', 'Elmo del Vuoto', 'ms'),
  piece('helm_paladin', 'Paladin Helm', 'Elmo del Paladino', 'ms'),
  piece('helm_wraith', 'Wraith Helm', 'Elmo dello Spettro', 'ms'),
  piece('helm_sunflare', 'Sunflare Helm', 'Elmo della Fiamma Solare', 'ms'),
  piece('helm_demon', 'Demon Helm', 'Elmo del Demone', 'ms'),
  piece('helm_astral_crown', 'Astral Crown', 'Corona degli Astri', 'fs'),
];

/** Gli scudi, solo del Guardiano (classUsesShield). Ogni nome inglese contiene "Shield",
 *  "Aegis", "Bulwark" o "Buckler": sono le parole che lo fanno riconoscere come scudo. */
export const SHIELD_PIECES: readonly GearPiece[] = [
  piece('shield_oak_buckler', 'Oak Buckler', 'Brocchiere di Quercia', 'ms'),
  piece('shield_iron_buckler', 'Iron Buckler', 'Brocchiere di Ferro', 'ms'),
  piece('shield_bronze', 'Bronze Shield', 'Scudo di Bronzo', 'ms'),
  piece('shield_lion', 'Lion Crest Shield', 'Scudo del Leone', 'ms'),
  piece('shield_sapphire_crest', 'Sapphire Crest Shield', 'Scudo dello Zaffiro', 'ms'),
  piece('shield_sunwing', 'Sunwing Shield', "Scudo dell'Ala Solare", 'ms'),
  piece('shield_horned_skull', 'Horned Skull Shield', 'Scudo del Teschio Cornuto', 'ms'),
  piece('shield_boneward', 'Boneward Shield', 'Scudo delle Ossa', 'ms'),
  piece('shield_vineguard', 'Vineguard Shield', 'Scudo dei Rampicanti', 'ms'),
  piece('shield_emerald_grove', 'Emerald Grove Shield', 'Scudo del Bosco di Smeraldo', 'ms'),
  piece('shield_bloodthorn', 'Bloodthorn Aegis', 'Egida di Spinasangue', 'fs'),
  piece('shield_frostshard', 'Frostshard Aegis', 'Egida di Schegge di Ghiaccio', 'fs'),
  piece('shield_magma', 'Magma Aegis', 'Egida di Magma', 'fs'),
  piece('shield_voidspiral', 'Voidspiral Shield', 'Scudo della Spirale del Vuoto', 'ms'),
  piece('shield_seraph', 'Seraph Aegis', 'Egida del Serafino', 'fs'),
  piece('shield_wraithfire', 'Wraithfire Shield', 'Scudo del Fuoco Spettrale', 'ms'),
  piece('shield_sunburst', 'Sunburst Bulwark', 'Baluardo del Sole', 'ms'),
  piece('shield_dragonscale', 'Dragonscale Bulwark', 'Baluardo del Drago', 'ms'),
  piece('shield_runeward', 'Runeward Aegis', 'Egida delle Rune', 'fs'),
  piece('shield_galaxy', 'Galaxy Aegis', 'Egida della Galassia', 'fs'),
];

/** Le corazze, per tutti i cammini. */
export const ARMOR_PIECES: readonly GearPiece[] = [
  piece('armor_leather_jerkin', 'Leather Jerkin', 'Farsetto di Cuoio', 'ms'),
  piece('armor_studded', 'Studded Brigandine', 'Brigantina Borchiata', 'fs'),
  piece('armor_bronze_cuirass', 'Bronze Cuirass', 'Corazza di Bronzo', 'fs'),
  piece('armor_steel_plate', 'Steel Plate', "Piastra d'Acciaio", 'fs'),
  piece('armor_fleur_hauberk', 'Lily Hauberk', 'Usbergo del Giglio', 'ms'),
  piece('armor_furmantle', 'Furmantle Armor', 'Armatura col Manto di Pelo', 'fs'),
  piece('armor_horned_skull', 'Horned Skull Armor', 'Armatura del Teschio Cornuto', 'fs'),
  piece('armor_boneplate', 'Boneplate Armor', "Armatura d'Ossa", 'fs'),
  piece('armor_leafbark', 'Leafbark Armor', 'Armatura di Corteccia e Foglie', 'fs'),
  piece('armor_emerald_warden', 'Emerald Warden Plate', 'Piastra del Custode di Smeraldo', 'fs'),
  piece('armor_bloodthorn', 'Bloodthorn Plate', 'Piastra di Spinasangue', 'fs'),
  piece('armor_frostshard', 'Frostshard Armor', 'Armatura di Schegge di Ghiaccio', 'fs'),
  piece('armor_magma', 'Magma Plate', 'Piastra di Magma', 'fs'),
  piece('armor_voidweave', 'Voidweave Armor', 'Armatura Intessuta di Vuoto', 'fs'),
  piece('armor_seraph', 'Seraph Plate', 'Piastra del Serafino', 'fs'),
  piece('armor_wraith', 'Wraith Armor', 'Armatura dello Spettro', 'fs'),
  piece('armor_sunforged', 'Sunforged Plate', 'Piastra Forgiata dal Sole', 'fs'),
  piece('armor_dragonscale', 'Dragonscale Armor', 'Armatura di Scaglie di Drago', 'fs'),
  piece('armor_runeward', 'Runeward Armor', 'Armatura delle Rune', 'fs'),
  piece('armor_galaxy', 'Galaxy Armor', 'Armatura della Galassia', 'fs'),
];

/** Gli anelli, per tutti i cammini. */
export const RING_PIECES: readonly GearPiece[] = [
  piece('ring_copper_band', 'Copper Band', 'Anello di Rame', 'ms'),
  piece('ring_iron_band', 'Iron Band', 'Anello di Ferro', 'ms'),
  piece('ring_sapphire', 'Sapphire Ring', 'Anello di Zaffiro', 'ms'),
  piece('ring_ruby', 'Ruby Ring', 'Anello di Rubino', 'ms'),
  piece('ring_emerald_vine', 'Emerald Vine Ring', 'Anello di Smeraldo e Rampicanti', 'ms'),
  piece('ring_bone', 'Bone Ring', "Anello d'Ossa", 'ms'),
  piece('ring_skull', 'Skull Ring', 'Anello del Teschio', 'ms'),
  piece('ring_frostshard', 'Frostshard Ring', 'Anello di Schegge di Ghiaccio', 'ms'),
  piece('ring_magma', 'Magma Ring', 'Anello di Magma', 'ms'),
  piece('ring_seraph', 'Seraph Ring', 'Anello del Serafino', 'ms'),
  piece('ring_amethyst_orbit', 'Amethyst Orbit Ring', "Anello delle Orbite d'Ametista", 'ms'),
  piece('ring_void_eye', 'Void Eye Ring', "Anello dell'Occhio del Vuoto", 'ms'),
  piece('ring_tidal', 'Tidal Ring', 'Anello delle Maree', 'ms'),
  piece('ring_dragonscale', 'Dragonscale Ring', 'Anello di Scaglie di Drago', 'ms'),
  piece('ring_moonstar', 'Moonstar Ring', 'Anello della Luna e delle Stelle', 'ms'),
  piece('ring_demonhorn', 'Demonhorn Ring', 'Anello del Corno di Demone', 'ms'),
  piece('ring_grovebloom', 'Grovebloom Ring', 'Anello del Bosco in Fiore', 'ms'),
  piece('ring_royal_crown', 'Royal Crown Ring', 'Anello della Corona Reale', 'ms'),
  piece('ring_galaxy', 'Galaxy Ring', 'Anello della Galassia', 'ms'),
  piece('ring_sunfire', 'Sunfire Ring', 'Anello del Sole', 'ms'),
];

/** Le scarpe (le famiglie e il loro carattere stanno in itemCatalog, FEET_FAMILIES). */
export const FEET_PIECES: readonly GearPiece[] = [
  piece('boots_leather', 'Leather Boots', 'Stivali di Cuoio', 'mp'),
  piece('boots_buckled', 'Buckled Boots', 'Stivali con Fibbia', 'mp'),
  piece('boots_furcuff', 'Fur-Cuffed Boots', 'Stivali col Risvolto di Pelo', 'mp'),
  piece('boots_steeltoe', 'Steel-Toe Boots', "Stivali con Punta d'Acciaio", 'mp'),
  piece('boots_fur', 'Fur Boots', 'Stivali di Pelliccia', 'mp'),
  piece('boots_leaf', 'Leafstep Boots', 'Stivali di Foglie', 'mp'),
  piece('boots_black', 'Blackiron Boots', 'Stivali di Ferro Nero', 'mp'),
  piece('boots_gold_ruby', 'Ruby-Gilt Boots', "Stivali d'Oro e Rubino", 'mp'),
  piece('boots_silver', 'Silver Greaves', "Schinieri d'Argento", 'mp'),
  piece('boots_silver_gold', 'Gilded Greaves', "Schinieri d'Argento e Oro", 'mp'),
  piece('boots_ice', 'Frostshard Boots', 'Stivali di Schegge di Ghiaccio', 'mp'),
  piece('boots_magma', 'Magmawalk Boots', 'Stivali di Magma', 'mp'),
  piece('boots_bone', 'Bonecraw Boots', "Stivali d'Ossa e Artigli", 'mp'),
  piece('boots_void_flame', 'Voidflame Boots', 'Stivali della Fiamma del Vuoto', 'mp'),
  piece('boots_seraph', 'Seraph Boots', 'Stivali del Serafino', 'mp'),
  piece('boots_bloodspike', 'Bloodspike Greaves', 'Schinieri di Spine di Sangue', 'mp'),
  piece('boots_flower', 'Blossom Boots', 'Stivali dei Fiori', 'mp'),
  piece('boots_vine', 'Vinewalker Boots', 'Stivali dei Rampicanti', 'mp'),
  piece('boots_winged', 'Winged Boots', 'Stivali Alati', 'mp'),
  piece('boots_skywing', 'Skywing Boots', 'Stivali delle Ali Celesti', 'mp'),
  piece('boots_raven', 'Raven Boots', 'Stivali del Corvo', 'mp'),
  piece('boots_alchemist', "Alchemist's Boots", "Stivali dell'Alchimista", 'mp'),
  piece('boots_amethyst', 'Amethyst Boots', "Stivali d'Ametista", 'mp'),
  piece('boots_void_swirl', 'Voidwalker Boots', 'Stivali del Viandante del Vuoto', 'mp'),
];

export const GEAR_PIECES: readonly GearPiece[] = [
  ...NECK_PIECES,
  ...SWORD_PIECES,
  ...BOW_PIECES,
  ...SCEPTER_PIECES,
  ...DAGGER_PIECES,
  ...HELM_PIECES,
  ...SHIELD_PIECES,
  ...ARMOR_PIECES,
  ...RING_PIECES,
  ...FEET_PIECES,
];

const PIECE_BY_ICON = new Map(GEAR_PIECES.map((entry) => [entry.icon, entry]));
export const gearPieceByIcon = (icon: string): GearPiece | undefined => PIECE_BY_ICON.get(icon);

/** La chiave dell'icona dentro un indirizzo: "/assets/.../96/sword_magma_96.png" -> "sword_magma". */
export const gearIconKey = (url: string): string => {
  const match = /\/([a-z0-9_]+?)(?:_96)?\.png$/i.exec(String(url ?? ''));
  return match ? match[1] : '';
};

/**
 * Venti pezzi in ordine di rarita', quattro per gradino, diventano quattro scale da cinque: la
 * scala k prende il k-esimo pezzo di ogni gradino. Cosi' ogni drop sceglie una scala e prende il
 * gradino della sua rarita', come per tutte le altre famiglie del gioco.
 */
export const laddersFromPieces = (
  pieces: readonly GearPiece[],
  names: readonly string[],
): Array<{ name: string; ladder: string[] }> =>
  names.map((name, k) => ({
    name,
    ladder: [0, 1, 2, 3, 4].map((tier) => pieces[tier * names.length + k].icon),
  }));

/**
 * La provenienza di un drop, in italiano, nelle quattro forme: [ms, fs, mp, fp]. Le chiavi sono
 * i prefissi che il server mette davanti al nome (vedi applyEquipmentDrop).
 */
export const GEAR_PREFIXES_IT: Record<string, readonly [string, string, string, string]> = {
  Mythic: ['Mitico', 'Mitica', 'Mitici', 'Mitiche'],
  Fractured: ['Spezzato', 'Spezzata', 'Spezzati', 'Spezzate'],
  Colossal: ['Colossale', 'Colossale', 'Colossali', 'Colossali'],
  Voidbound: ['Legato al Vuoto', 'Legata al Vuoto', 'Legati al Vuoto', 'Legate al Vuoto'],
  Ascendant: ['Ascendente', 'Ascendente', 'Ascendenti', 'Ascendenti'],
  Cinderwrought: ['Cinereo', 'Cinerea', 'Cinerei', 'Cineree'],
  Frostbound: ['Gelido', 'Gelida', 'Gelidi', 'Gelide'],
  Hollowforged: [
    'Temprato nel Bastione',
    'Temprata nel Bastione',
    'Temprati nel Bastione',
    'Temprate nel Bastione',
  ],
  Stormtouched: ['Tempestoso', 'Tempestosa', 'Tempestosi', 'Tempestose'],
  Abyssal: ['Abissale', 'Abissale', 'Abissali', 'Abissali'],
  Starless: ['Senza Stelle', 'Senza Stelle', 'Senza Stelle', 'Senza Stelle'],
  Sovereign: ['Sovrano', 'Sovrana', 'Sovrani', 'Sovrane'],
  Starfallen: ['Stellare', 'Stellare', 'Stellari', 'Stellari'],
  Tidebound: ['delle Maree', 'delle Maree', 'delle Maree', 'delle Maree'],
  Mirewoven: ['Palustre', 'Palustre', 'Palustri', 'Palustri'],
};

/** I nomi di famiglia dei pezzi fatti prima dei nomi propri: anche loro si leggono in italiano. */
const FAMILY_NAMES_IT: readonly GearPiece[] = [
  piece('', 'Cuirass', 'Corazza', 'fs'),
  piece('', 'Brigandine', 'Brigantina', 'fs'),
  piece('', 'Scalemail', 'Cotta di Squame', 'fs'),
  piece('', 'Cowl', 'Cappuccio', 'ms'),
  piece('', 'Greathelm', 'Grande Elmo', 'ms'),
  piece('', 'Diadem', 'Diadema', 'ms'),
  piece('', 'Aegis', 'Egida', 'fs'),
  piece('', 'Bulwark', 'Baluardo', 'ms'),
  piece('', 'Buckler', 'Brocchiere', 'ms'),
  piece('', 'Ring', 'Anello', 'ms'),
  piece('', 'Amulet', 'Amuleto', 'ms'),
  piece('', 'Blade', 'Lama', 'fs'),
  piece('', 'Cleaver', 'Mannaia', 'fs'),
  piece('', 'Warhammer', 'Martello da Guerra', 'ms'),
  piece('', 'Fang', 'Zanna', 'fs'),
  piece('', 'Lance', 'Lancia', 'fs'),
  piece('', 'Longbow', 'Arco Lungo', 'ms'),
  piece('', 'Shortbow', 'Arco Corto', 'ms'),
  piece('', 'Daggers', 'Pugnali', 'mp'),
  piece('', 'Staff', 'Bastone', 'ms'),
  piece('', 'Scepter', 'Scettro', 'ms'),
  piece('', 'Catalyst', 'Catalizzatore', 'ms'),
  piece('', 'Treads', 'Calzari', 'mp'),
  piece('', 'Greaves', 'Schinieri', 'mp'),
  piece('', 'Wildwalkers', 'Stivali Selvaggi', 'mp'),
  piece('', 'Voidsteps', 'Passi del Vuoto', 'mp'),
  piece('', 'Emberstriders', 'Stivali di Brace', 'mp'),
  piece('', 'Fox', 'Volpe', 'fs'),
  piece('', 'Lynx', 'Lince', 'fs'),
  piece('', 'Turtle', 'Tartaruga', 'fs'),
  piece('', 'Boar', 'Cinghiale', 'ms'),
  piece('', 'Toad', 'Rospo', 'ms'),
  piece('', 'Raven', 'Corvo', 'ms'),
  piece('', 'Whelp', 'Draghetto', 'ms'),
  piece('', 'Relic', 'Reliquia', 'fs'),
  piece('', 'Hauberk', 'Usbergo', 'ms'),
  piece('', 'Shield', 'Scudo', 'ms'),
  piece('', 'Sword', 'Spada', 'fs'),
  piece('', 'Longsword', 'Spada Lunga', 'fs'),
  piece('', 'Broadsword', 'Spadone', 'ms'),
  piece('', 'Greatsword', 'Spada a Due Mani', 'fs'),
  piece('', 'Warstaff', 'Bastone da Guerra', 'ms'),
  piece('', 'Wand', 'Bacchetta', 'fs'),
  piece('', 'Helm', 'Elmo', 'ms'),
  piece('', 'Warhelm', 'Elmo da Guerra', 'ms'),
  piece('', 'Crownhelm', 'Elmo Coronato', 'ms'),
  piece('', 'Band', 'Fascia', 'fs'),
  piece('', 'Signet', 'Sigillo', 'ms'),
  piece('', 'Loop', 'Cerchio', 'ms'),
  piece('', 'Necklace', 'Collana', 'fs'),
  piece('', 'Pendant', 'Pendente', 'ms'),
  piece('', 'Torc', 'Torque', 'ms'),
  piece('', 'Collar', 'Collare', 'ms'),
];
// I nomi piu' lunghi prima: "Winged Sapphire Collar" non deve fermarsi a un "Collar" qualunque.
const NAMES_BY_LENGTH = [...GEAR_PIECES, ...FAMILY_NAMES_IT].sort(
  (a, b) => b.en.length - a.en.length,
);
const GENDER_INDEX: Record<GearGender, number> = { ms: 0, fs: 1, mp: 2, fp: 3 };

/**
 * Il nome di un pezzo nella lingua di chi guarda. In inglese resta com'e'; in italiano il pezzo
 * va davanti e la provenienza dietro, accordata ("Mythic Magma Blade" -> "Lama di Magma Mitica").
 * Un nome che non si riconosce - un premio, un pezzo del kit, un oggetto di una volta - torna
 * indietro intatto: meglio l'inglese che una traduzione a meta'.
 */
export const localizeGearName = (name: string, language: string): string => {
  const value = String(name ?? '');
  if (language !== 'it' || !value) return value;
  const found = NAMES_BY_LENGTH.find(
    (entry) => value === entry.en || value.endsWith(' ' + entry.en),
  );
  if (!found) return value;
  const prefix = value.slice(0, value.length - found.en.length).trim();
  if (!prefix) return found.it;
  const forms = GEAR_PREFIXES_IT[prefix];
  return forms ? `${found.it} ${forms[GENDER_INDEX[found.g]]}` : value;
};

const TIERS = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
const PIECE_ICONS = new Set(GEAR_PIECES.map((entry) => entry.icon));

/**
 * I disegni di un tipo d'equipaggiamento, o niente se quel tipo non ha ancora i suoi.
 * Per le armi decide la famiglia del nome; i pugnali gia' salvati conservano il loro disegno.
 */
const piecesForItem = (kind: string, name: string): readonly GearPiece[] | undefined => {
  if (kind === 'HEAD') return HELM_PIECES;
  if (kind === 'ARMOR') return ARMOR_PIECES;
  if (kind === 'OFFHAND') return SHIELD_PIECES;
  if (kind === 'NECK') return NECK_PIECES;
  // Gli amuleti di una volta erano accessori: anche loro prendono il disegno di un anello.
  if (kind === 'ACCESSORY') return RING_PIECES;
  if (kind !== 'WEAPON') return undefined;
  const family = weaponFamilyOf(name);
  if (family === 'bow') return BOW_PIECES;
  if (family === 'blade' || family === 'cleaver' || family === 'warhammer' || family === 'lance')
    return SWORD_PIECES;
  if (family === 'staff' || family === 'scepter' || family === 'catalyst') return SCEPTER_PIECES;
  return undefined;
};

/**
 * Il disegno nuovo di un pezzo che ne ha ancora uno vecchio.
 *
 * La grafica dell'equipaggiamento e' stata rifatta per intero: un elmo trovato ieri non deve
 * restare con il disegno di prima accanto a quelli nuovi. Il pezzo prende un disegno del suo
 * tipo e del suo gradino di rarita', scelto dal suo id (sempre lo stesso per lo stesso pezzo,
 * ma diverso fra due pezzi uguali). Un pezzo gia' disegnato, o di un tipo che i disegni nuovi
 * non hanno, torna indietro com'e'. Restituisce la chiave dell'icona, non l'indirizzo.
 */
export const modernGearIcon = (item: {
  kind: string;
  rarity: string;
  name: string;
  id: string;
  icon: string;
}): string => {
  const current = gearIconKey(item.icon);
  if (PIECE_ICONS.has(current)) return current;
  const pieces = piecesForItem(String(item.kind ?? ''), String(item.name ?? ''));
  if (!pieces) return current;
  const tier = Math.max(0, TIERS.indexOf(String(item.rarity ?? '').toUpperCase()));
  let hash = 0;
  for (const char of String(item.id ?? '')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const perTier = pieces.length / TIERS.length;
  return pieces[tier * perTier + (hash % perTier)].icon;
};
