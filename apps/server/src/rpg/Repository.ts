import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import {
  starterKit,
  heroClass,
  type HeroClass,
  type Item,
  type EquipmentSlot,
} from '@aetheria/shared';
export interface Profile {
  id: string;
  token: string;
  name: string;
  level: number;
  xp: number;
  gold: number;
  aetherDust: number;
  heroClass: HeroClass;
  questState: number;
  questKills: number;
  frontierState: number;
  frontierKills: number;
  groveState: number;
  groveKills: number;
  kills: number;
  potions: number;
  manaPotions: number;
  items: Item[];
  equipment: Partial<Record<EquipmentSlot, string>>;
  clanId: string;
}
export interface Clan {
  id: string;
  name: string;
  motto: string;
  founderId: string;
  members: string[];
  requests: string[];
  treasury: number;
}
export class Repository {
  readonly profiles: Record<string, Profile> = Object.create(null);
  readonly clans: Record<string, Clan> = Object.create(null);
  private file: string;
  constructor(file = process.env.DATA_FILE || resolve('data', 'aetheria-3d.json')) {
    this.file = file;
    if (existsSync(file)) {
      const d = JSON.parse(readFileSync(file, 'utf8'));
      if (d.version !== 1 || !d.profiles || !d.clans)
        throw new Error('Unsupported ATesting save file');
      Object.assign(this.profiles, d.profiles);
      for (const profile of Object.values(this.profiles)) {
        profile.aetherDust ??= 0;
        profile.frontierState ??= 0;
        profile.frontierKills ??= 0;
        profile.groveState ??= 0;
        profile.groveKills ??= 0;
        profile.heroClass = heroClass(profile.heroClass);
      }
      Object.assign(this.clans, d.clans);
    }
  }
  open(token: unknown, name: string, selectedClass?: unknown) {
    let p =
      typeof token === 'string' && token.length === 36
        ? Object.values(this.profiles).find((p) => p.token === token)
        : undefined;
    if (!p) {
      p = {
        id: randomUUID(),
        token: randomUUID(),
        name,
        level: 1,
        xp: 0,
        gold: 0,
        aetherDust: 0,
        heroClass: heroClass(selectedClass),
        questState: 0,
        questKills: 0,
        frontierState: 0,
        frontierKills: 0,
        groveState: 0,
        groveKills: 0,
        kills: 0,
        potions: 3,
        manaPotions: 2,
        items: starterKit(selectedClass),
        equipment: {
          HEAD: 'traveller-cap',
          ARMOR: 'recruit-armor',
          WEAPON:
            heroClass(selectedClass) === 'AETHER_BLADE'
              ? 'starter-bow'
              : heroClass(selectedClass) === 'VOID_KNIGHT'
                ? 'starter-catalyst'
                : 'starter-sword',
          ...(heroClass(selectedClass) === 'GUARDIAN' ? { OFFHAND: 'wood-shield' } : {}),
        },
        clanId: '',
      };
      this.profiles[p.id] = p;
    }
    p.name = name;
    this.save();
    return p;
  }
  save() {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(
      this.file + '.tmp',
      JSON.stringify({ version: 1, profiles: this.profiles, clans: this.clans }),
      'utf8',
    );
    renameSync(this.file + '.tmp', this.file);
  }
}
export const repository = new Repository();
