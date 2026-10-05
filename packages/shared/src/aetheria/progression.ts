// Ported from Giulio001/RoundWorld: character progression stays shared.
export const MAX_LEVEL = 99;
/** Il livello a cui arriva il mondo: l'ultima mappa (il Cratere) e gli oggetti piu' alti. */
export const CONTENT_LEVEL_CAP = 60;
/** Dove la curva dell'esperienza smette di seguire la formula e comincia a salire del 3,5% a
 *  livello. Era il vecchio tetto del mondo e resta al cinquanta: alzare il tetto a sessanta non
 *  deve cambiare quanto costa un livello a chi c'e' gia'. */
export const XP_CURVE_KNEE = 50;

/**
 * Quanta esperienza serve per passare dal livello `level` al successivo.
 *
 * La curva di prima (120 * L^1,35) portava al cinquanta in dieci-quindici ore di gioco: a fine
 * viaggio un livello costava ottanta mostri. Adesso ogni gradino e' moltiplicato per
 * 1 + (L/10)^1,6: i primi livelli restano rapidi (il decimo in meno di un'ora), dal trenta un
 * livello costa ore, e il cinquanta arriva in circa ottanta ore - tre settimane di gioco
 * regolare. Dal cinquanta al novantanove ogni livello costa il 3,5% piu' del precedente: e' la
 * strada di mesi, per chi resta.
 */
/**
 * I primi livelli costano di piu' di quanto dice la formula: fino a tre volte e mezza al primo,
 * e il sovrappiu' si spegne al quattordicesimo. Senza, le Terre Sanguinanti si finivano in tre
 * minuti; con questo e le fasce larghe (DESTINATION_LEVEL_REQUIREMENT) ognuna delle prime quattro
 * terre tiene tre quarti d'ora o un'ora.
 */
export const EARLY_XP_BOOST = (level: number): number =>
  level < 14 ? 1 + 2.6 * Math.pow((14 - level) / 13, 1.3) : 1;

export function experienceToNextLevel(level: number): number {
  const current = Math.max(1, Math.floor(Number(level) || 1));
  if (current >= MAX_LEVEL) return 0;
  const step = (value: number) =>
    120 * Math.pow(value, 1.35) * (1 + Math.pow(value / 10, 1.6)) * EARLY_XP_BOOST(value);
  if (current < XP_CURVE_KNEE) return Math.round(step(current));
  return Math.round(step(XP_CURVE_KNEE - 1) * Math.pow(1.035, current - (XP_CURVE_KNEE - 1)));
}
