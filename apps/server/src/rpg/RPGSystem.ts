import { randomUUID } from 'node:crypto';
import {
  BAG_CAPACITY,
  EQUIPMENT_SLOTS,
  SLOT_NAMES,
  SHOP_ITEMS,
  MATERIAL_CURIOS,
  NPCS,
  CLAN_CREATION_COST,
  intrinsicGearStats,
  equipRefusal,
  isHostile,
  FRONTIER_STORY,
  heroClass,
  HERO_CLASSES,
  CLASS_NAMES,
  starterKit,
  itemStats,
  protectedStarterItem,
  FORGE_MAX_UPGRADE,
  forgeUpgradeCost,
  forgeSalvageValue,
  forgeUpgradeMaterials,
  hasMaterials,
  materialIdOf,
  MATERIAL_STACK_MAX,
  FORGE_MATERIAL_DROPS,
  forgeMaterialFor,
  rollForgeMaterialRarity,
  type ForgeMaterialRequirement,
  type RPGSnapshot,
  type EquipmentSlot,
  type Item,
} from '@aetheria/shared';
import type { WorldState, PlayerState } from '@aetheria/shared/schema';
import { repository, type Profile, type Clan, type Repository } from './Repository.ts';
interface Events {
  send(id: string, type: string, value: unknown): void;
  changed(): void;
}
export class RPGSystem {
  readonly profiles = new Map<string, Profile>();
  private lastChat = new Map<string, number>();
  constructor(
    private state: WorldState,
    private events: Events,
    private random: () => number = Math.random,
    private storage: Repository = repository,
  ) {}
  join(id: string, name: string, token: unknown, selectedClass?: unknown) {
    const profile = this.storage.open(token, name, selectedClass);
    if ([...this.profiles.values()].some((p) => p.id === profile.id))
      throw new Error(
        'Questo personaggio è già connesso. Apri una finestra privata per un secondo giocatore.',
      );
    this.profiles.set(id, profile);
    const p = this.state.players.get(id)!;
    p.heroClass = profile.heroClass;
    for (const key of [
      'level',
      'xp',
      'gold',
      'questState',
      'questKills',
      'frontierState',
      'frontierKills',
      'kills',
      'potions',
      'manaPotions',
    ] as const)
      p[key] = profile[key];
    this.stats(id, true);
    this.identity(id);
  }
  identity(id: string) {
    const p = this.state.players.get(id),
      profile = this.profiles.get(id);
    if (p && profile) p.clanName = this.storage.clans[profile.clanId]?.name ?? '';
  }
  checkpoint(id: string) {
    const p = this.state.players.get(id),
      profile = this.profiles.get(id);
    if (!p || !profile) return;
    for (const key of [
      'level',
      'xp',
      'gold',
      'questState',
      'questKills',
      'frontierState',
      'frontierKills',
      'kills',
      'potions',
      'manaPotions',
    ] as const)
      profile[key] = p[key];
    this.storage.save();
  }
  leave(id: string) {
    this.checkpoint(id);
    this.profiles.delete(id);
    this.lastChat.delete(id);
    this.events.changed();
  }
  snapshot(id: string): RPGSnapshot | null {
    const profile = this.profiles.get(id);
    if (!profile) return null;
    const c = this.storage.clans[profile.clanId];
    const online = new Set([...this.profiles.values()].map((p) => p.id));
    return {
      profileId: profile.id,
      aetherDust: profile.aetherDust,
      heroClass: profile.heroClass,
      items: profile.items,
      equipment: profile.equipment,
      stats: this.totalStats(profile),
      clan: c
        ? {
            id: c.id,
            name: c.name,
            motto: c.motto,
            members: c.members.length,
            treasury: c.treasury,
            founderId: c.founderId,
            roster: c.members.map((id) => ({
              id,
              name: this.storage.profiles[id]?.name ?? 'Guardian',
              role: id === c.founderId ? 'FOUNDER' : 'MEMBER',
              online: online.has(id),
            })),
            requests:
              c.founderId === profile.id
                ? c.requests.map((id) => ({
                    id,
                    name: this.storage.profiles[id]?.name ?? 'Guardian',
                  }))
                : [],
          }
        : null,
      clans: Object.values(this.storage.clans).map((c) => ({
        id: c.id,
        name: c.name,
        motto: c.motto,
        members: c.members.length,
        treasury: c.treasury,
      })),
    };
  }
  send(id: string) {
    const s = this.snapshot(id);
    if (s) this.events.send(id, 'rpg', s);
  }
  all() {
    for (const id of this.profiles.keys()) {
      this.identity(id);
      this.send(id);
    }
  }
  private toast(id: string, text: string) {
    this.events.send(id, 'notice', text);
  }
  private near(id: string, npc: string) {
    const p = this.state.players.get(id),
      n = NPCS.find((n) => n.id === npc);
    return !!p && p.hp > 0 && !!n && Math.hypot(p.x - n.x, p.z - n.z) <= 2.4;
  }
  private totalStats(profile: Profile) {
    const stats: Record<string, number> = {};
    for (const iid of Object.values(profile.equipment)) {
      const item = profile.items.find((i) => i.id === iid);
      if (item)
        for (const [k, v] of Object.entries(itemStats(item))) stats[k] = (stats[k] ?? 0) + v;
    }
    return stats;
  }
  stats(id: string, heal = false) {
    const p = this.state.players.get(id),
      profile = this.profiles.get(id);
    if (!p || !profile) return;
    const s = this.totalStats(profile);
    p.maxHp = 100 + (p.level - 1) * 10 + (s.bonusHp ?? 0);
    p.hp = heal ? p.maxHp : Math.min(p.hp, p.maxHp);
    p.attackBonus = s.bonusAttack ?? 0;
    p.defence = s.bonusDef ?? 0;
    p.weaponIcon = profile.items.find((i) => i.id === profile.equipment.WEAPON)?.icon ?? '';
    p.shieldIcon = profile.items.find((i) => i.id === profile.equipment.OFFHAND)?.icon ?? '';
  }
  inventory(id: string, value: unknown) {
    const p = this.state.players.get(id),
      profile = this.profiles.get(id);
    if (!p || !profile || p.hp <= 0 || !value || typeof value !== 'object') return;
    const v = value as Record<string, unknown>;
    const item = profile.items.find((i) => i.id === v.id);
    if (
      v.action === 'unequip' &&
      typeof v.slot === 'string' &&
      EQUIPMENT_SLOTS.includes(v.slot as EquipmentSlot)
    )
      delete profile.equipment[v.slot as EquipmentSlot];
    else if (v.action === 'equip' && item && EQUIPMENT_SLOTS.includes(item.kind as EquipmentSlot)) {
      if (item.level > p.level) {
        this.toast(id, 'Il tuo livello è troppo basso per questo oggetto.');
        return;
      }
      if (equipRefusal(profile.heroClass, item.kind, item.name, item.id)) {
        this.toast(id, 'Questo equipaggiamento appartiene a un altro cammino.');
        return;
      }
      profile.equipment[item.kind as EquipmentSlot] = item.id;
      this.toast(id, `${SLOT_NAMES[item.kind as EquipmentSlot]}: ${item.name}`);
    } else return;
    this.stats(id);
    this.checkpoint(id);
    this.send(id);
  }
  selectClass(id: string, value: unknown) {
    const profile = this.profiles.get(id),
      p = this.state.players.get(id);
    if (
      !profile ||
      !p ||
      !HERO_CLASSES.includes(value as never) ||
      p.hp <= 0 ||
      isHostile(p.x, p.z)
    )
      return;
    const cls = heroClass(value);
    if (cls === profile.heroClass) return;
    const kit = starterKit(cls),
      missing = kit.filter((item) => !profile.items.some((i) => i.id === item.id));
    if (profile.items.length + missing.length > BAG_CAPACITY) {
      this.toast(id, 'Libera spazio nello zaino prima di cambiare cammino.');
      return;
    }
    profile.items.push(...missing);
    profile.heroClass = p.heroClass = cls;
    for (const [slot, iid] of Object.entries(profile.equipment)) {
      const item = profile.items.find((i) => i.id === iid);
      if (item && equipRefusal(cls, item.kind, item.name, item.id))
        delete profile.equipment[slot as EquipmentSlot];
    }
    profile.equipment.WEAPON = kit.find((item) => item.kind === 'WEAPON')!.id;
    if (cls === 'GUARDIAN') profile.equipment.OFFHAND = 'wood-shield';
    this.stats(id);
    this.checkpoint(id);
    this.send(id);
    this.toast(id, `Cammino scelto: ${CLASS_NAMES[cls]}.`);
  }
  buy(id: string, value: unknown) {
    if (!this.near(id, 'quartermaster')) {
      this.toast(id, 'Avvicinati al Quartiermastro per acquistare.');
      return;
    }
    const profile = this.profiles.get(id)!,
      p = this.state.players.get(id)!,
      offer = SHOP_ITEMS.find((i) => i.id === value);
    if (!offer || p.gold < offer.price) {
      this.toast(id, 'Oro insufficiente.');
      return;
    }
    if (offer.id === 'health-potion' && p.potions < 99) p.potions++;
    else if (offer.id === 'mana-potion' && p.manaPotions < 99) p.manaPotions++;
    else if (offer.kind !== 'CONSUMABLE') {
      if (profile.items.length >= BAG_CAPACITY) {
        this.toast(id, 'La sacca è piena.');
        return;
      }
      profile.items.push({ ...offer, id: randomUUID(), stats: { ...offer.stats } });
    } else return;
    p.gold -= offer.price;
    this.checkpoint(id);
    this.send(id);
    this.toast(id, `${offer.name} acquistato.`);
  }
  forge(id: string, value: unknown) {
    const profile = this.profiles.get(id),
      p = this.state.players.get(id);
    if (!profile || !p || !value || typeof value !== 'object') return;
    const v = value as Record<string, unknown>;
    if (v.action !== 'upgrade' && v.action !== 'salvage') return;
    if (!this.near(id, 'blacksmith')) {
      this.toast(id, 'Avvicinati al Fabbro per usare la forgia.');
      return;
    }
    const item = profile.items.find((i) => i.id === v.id);
    if (!item || !EQUIPMENT_SLOTS.includes(item.kind as EquipmentSlot)) return;
    if (v.action === 'salvage') {
      if (Object.values(profile.equipment).includes(item.id) || protectedStarterItem(item)) {
        this.toast(id, 'Il kit iniziale e gli oggetti indossati non possono essere riciclati.');
        return;
      }
      const dust = forgeSalvageValue(item.rarity, item.upgradeLevel);
      profile.items = profile.items.filter((i) => i.id !== item.id);
      profile.aetherDust += dust;
      this.toast(id, `${item.name} riciclato: +${dust} Polvere d’Aether.`);
    } else {
      const level = (item.upgradeLevel ?? 0) + 1;
      if (level > FORGE_MAX_UPGRADE) {
        this.toast(id, 'Questo oggetto ha raggiunto il limite +9.');
        return;
      }
      const cost = forgeUpgradeCost(level, item.rarity);
      const materials = forgeUpgradeMaterials(level, item.rarity, item.level);
      if (
        p.gold < cost.goldCost ||
        profile.aetherDust < cost.dustCost ||
        !hasMaterials(profile.items, materials)
      ) {
        this.toast(id, 'Risorse insufficienti: controlla oro, polvere e materiali richiesti.');
        return;
      }
      this.takeMaterials(profile, materials);
      p.gold -= cost.goldCost;
      profile.aetherDust -= cost.dustCost;
      if (this.random() < cost.chance) {
        item.upgradeLevel = level;
        this.stats(id);
        this.toast(id, `${item.name} potenziato a +${level}.`);
      } else
        this.toast(id, 'Tentativo fallito: risorse consumate, oggetto e potenziamento conservati.');
    }
    this.checkpoint(id);
    this.send(id);
  }
  private takeMaterials(profile: Profile, needs: readonly ForgeMaterialRequirement[]) {
    for (const need of needs) {
      let remaining = need.quantity;
      for (const item of profile.items) {
        if (materialIdOf(item) !== need.id) continue;
        const spent = Math.min(item.quantity, remaining);
        item.quantity -= spent;
        remaining -= spent;
        if (!remaining) break;
      }
    }
    profile.items = profile.items.filter((item) => item.quantity > 0);
  }
  private forgeLoot(profile: Profile, elite: boolean) {
    // Lumengate uses the original frontier trash/elite rewards and material tables.
    profile.aetherDust += elite ? 4 : 1;
    const grade = elite ? 'ELITE' : 'TRASH',
      table = FORGE_MATERIAL_DROPS[grade];
    if (this.random() >= table.chance * 0.96) return;
    const material = forgeMaterialFor('FRONTIER', rollForgeMaterialRarity(grade, this.random()));
    const existing = profile.items.find(
      (i) => materialIdOf(i) === material.id && i.quantity < MATERIAL_STACK_MAX,
    );
    if (existing) existing.quantity++;
    else if (profile.items.length < BAG_CAPACITY)
      profile.items.push({
        id: randomUUID(),
        kind: 'MATERIAL',
        name: material.name,
        icon: material.id,
        rarity: material.rarity,
        quantity: 1,
        level: 1,
        description: 'Materiale della Frontiera per i potenziamenti dal +5.',
        stats: {},
        price: 0,
      });
  }
  frontierReward(id: string): boolean {
    const profile = this.profiles.get(id);
    if (!profile) return false;
    const existing = profile.items.find(
      (i) =>
        materialIdOf(i) === 'aether_gel' &&
        i.quantity + FRONTIER_STORY.reward.gel <= MATERIAL_STACK_MAX,
    );
    if (!existing && profile.items.length >= BAG_CAPACITY) return false;
    if (existing) existing.quantity += FRONTIER_STORY.reward.gel;
    else
      profile.items.push({
        id: randomUUID(),
        kind: 'MATERIAL',
        name: 'Gelatina Eterea',
        icon: 'aether_gel',
        rarity: 'COMMON',
        quantity: FRONTIER_STORY.reward.gel,
        level: 1,
        description: 'Ricompensa della Frontiera per i potenziamenti della forgia.',
        stats: {},
        price: 0,
      });
    profile.aetherDust += FRONTIER_STORY.reward.dust;
    return true;
  }
  loot(id: string, elite: boolean) {
    const profile = this.profiles.get(id);
    if (!profile) return;
    this.forgeLoot(profile, elite);
    const material = MATERIAL_CURIOS.find(
      (m) => m.id === (elite ? 'monster_core' : 'aether_shard'),
    )!;
    const existing = profile.items.find((i) => i.icon === material.id && i.kind === 'MATERIAL');
    if (existing) existing.quantity++;
    else if (profile.items.length < BAG_CAPACITY)
      profile.items.push({
        id: randomUUID(),
        kind: 'MATERIAL',
        name: material.name,
        icon: material.id,
        rarity: material.rarity ?? 'COMMON',
        quantity: 1,
        level: 1,
        description: material.description ?? 'Materiale recuperato dalle creature del Vuoto.',
        stats: {},
        price: 0,
      });
    else this.toast(id, 'Sacca piena: libera spazio per il bottino.');
    if (elite && profile.items.length < BAG_CAPACITY) {
      const gear: Item = {
        id: randomUUID(),
        kind: 'WEAPON',
        name:
          profile.heroClass === 'AETHER_BLADE'
            ? 'Grove Bow'
            : profile.heroClass === 'VOID_KNIGHT'
              ? 'Amethyst Staff'
              : 'Steel Sword',
        icon:
          profile.heroClass === 'AETHER_BLADE'
            ? 'bow_grove'
            : profile.heroClass === 'VOID_KNIGHT'
              ? 'scepter_amethyst'
              : 'sword_steel',
        rarity: 'RARE',
        quantity: 1,
        level: 2,
        description: 'Equipaggiamento raro recuperato da un avversario d’élite.',
        stats: intrinsicGearStats({
          kind: 'WEAPON',
          name:
            profile.heroClass === 'AETHER_BLADE'
              ? 'Grove Bow'
              : profile.heroClass === 'VOID_KNIGHT'
                ? 'Amethyst Staff'
                : 'Steel Sword',
          icon:
            profile.heroClass === 'AETHER_BLADE'
              ? 'bow_grove'
              : profile.heroClass === 'VOID_KNIGHT'
                ? 'scepter_amethyst'
                : 'sword_steel',
          rarity: 'RARE',
        }),
        price: 0,
      };
      profile.items.push(gear);
    }
    this.checkpoint(id);
    this.send(id);
  }
  clan(id: string, value: unknown) {
    const profile = this.profiles.get(id),
      p = this.state.players.get(id);
    if (!profile || !p || !value || typeof value !== 'object') return;
    const v = value as Record<string, unknown>,
      c = this.storage.clans[profile.clanId];
    if (v.action === 'create') {
      if (!this.near(id, 'herald')) {
        this.toast(id, 'Solo l’Araldo dei Clan può registrare un clan.');
        return;
      }
      const name = String(v.name ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 20);
      if (c || !/^[A-Za-z0-9][A-Za-z0-9 '_-]{2,19}$/.test(name)) {
        this.toast(id, 'Il nome richiede 3–20 caratteri, lettere e numeri.');
        return;
      }
      if (
        Object.values(this.storage.clans).some((c) => c.name.toLowerCase() === name.toLowerCase())
      ) {
        this.toast(id, 'Esiste già un clan con questo nome.');
        return;
      }
      if (p.gold < CLAN_CREATION_COST) {
        this.toast(id, `Fondare un clan costa ${CLAN_CREATION_COST} oro.`);
        return;
      }
      const clan: Clan = {
        id: randomUUID(),
        name,
        motto: '',
        founderId: profile.id,
        members: [profile.id],
        requests: [],
        treasury: 0,
      };
      this.storage.clans[clan.id] = clan;
      profile.clanId = clan.id;
      p.gold -= CLAN_CREATION_COST;
    } else if (v.action === 'request' && !c) {
      const target = this.storage.clans[String(v.clanId)];
      if (!target || target.requests.includes(profile.id) || target.requests.length >= 100) return;
      target.requests.push(profile.id);
      this.toast(id, 'Richiesta inviata al fondatore.');
    } else if (v.action === 'accept' && c?.founderId === profile.id) {
      const target = this.storage.profiles[String(v.profileId)];
      if (!target || target.clanId || !c.requests.includes(target.id) || c.members.length >= 50)
        return;
      c.members.push(target.id);
      c.requests = c.requests.filter((i) => i !== target.id);
      target.clanId = c.id;
    } else if (v.action === 'leave' && c) {
      if (c.founderId === profile.id && c.members.length > 1) {
        this.toast(id, 'Il fondatore deve prima rimuovere gli altri membri.');
        return;
      }
      c.members = c.members.filter((i) => i !== profile.id);
      profile.clanId = '';
      if (c.members.length === 0) delete this.storage.clans[c.id];
    } else if (v.action === 'kick' && c?.founderId === profile.id && v.profileId !== profile.id) {
      const target = this.storage.profiles[String(v.profileId)];
      if (!target || target.clanId !== c.id) return;
      c.members = c.members.filter((i) => i !== target.id);
      target.clanId = '';
    } else if (v.action === 'donate' && c) {
      const amount = Number(v.amount);
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > p.gold) return;
      p.gold -= amount;
      c.treasury += amount;
    } else return;
    this.checkpoint(id);
    this.events.changed();
  }
  chat(id: string, value: unknown) {
    const profile = this.profiles.get(id);
    if (!profile || !value || typeof value !== 'object') return null;
    const v = value as Record<string, unknown>,
      text = String(v.text ?? '')
        .replace(/[\u0000-\u001f<>]/g, '')
        .trim()
        .slice(0, 220),
      now = Date.now();
    if (!text || now - (this.lastChat.get(id) ?? 0) < 1000) return null;
    const channel = v.channel === 'GUILD' ? 'GUILD' : 'GLOBAL';
    if (channel === 'GUILD' && !profile.clanId) return null;
    this.lastChat.set(id, now);
    return { message: { name: profile.name, text, channel, at: now }, clanId: profile.clanId };
  }
}
