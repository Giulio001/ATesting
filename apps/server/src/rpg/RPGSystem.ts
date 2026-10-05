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
  type RPGSnapshot,
  type EquipmentSlot,
  type Item,
} from '@aetheria/shared';
import type { WorldState, PlayerState } from '@aetheria/shared/schema';
import { repository, type Profile, type Clan } from './Repository.ts';
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
  ) {}
  join(id: string, name: string, token: unknown) {
    const profile = repository.open(token, name);
    if ([...this.profiles.values()].some((p) => p.id === profile.id))
      throw new Error(
        'Questo personaggio è già connesso. Apri una finestra privata per un secondo giocatore.',
      );
    this.profiles.set(id, profile);
    const p = this.state.players.get(id)!;
    for (const key of [
      'level',
      'xp',
      'gold',
      'questState',
      'questKills',
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
    if (p && profile) p.clanName = repository.clans[profile.clanId]?.name ?? '';
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
      'kills',
      'potions',
      'manaPotions',
    ] as const)
      profile[key] = p[key];
    repository.save();
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
    const c = repository.clans[profile.clanId];
    const online = new Set([...this.profiles.values()].map((p) => p.id));
    return {
      profileId: profile.id,
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
              name: repository.profiles[id]?.name ?? 'Guardian',
              role: id === c.founderId ? 'FOUNDER' : 'MEMBER',
              online: online.has(id),
            })),
            requests:
              c.founderId === profile.id
                ? c.requests.map((id) => ({
                    id,
                    name: repository.profiles[id]?.name ?? 'Guardian',
                  }))
                : [],
          }
        : null,
      clans: Object.values(repository.clans).map((c) => ({
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
      if (item) for (const [k, v] of Object.entries(item.stats)) stats[k] = (stats[k] ?? 0) + v;
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
      if (equipRefusal('GUARDIAN', item.kind, item.name, item.id)) {
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
  loot(id: string, elite: boolean) {
    const profile = this.profiles.get(id);
    if (!profile) return;
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
        name: 'Steel Sword',
        icon: 'sword_steel',
        rarity: 'RARE',
        quantity: 1,
        level: 2,
        description: 'Lama rara recuperata dal Custode del Vuoto.',
        stats: intrinsicGearStats({
          kind: 'WEAPON',
          name: 'Steel Sword',
          icon: 'sword_steel',
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
      c = repository.clans[profile.clanId];
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
        Object.values(repository.clans).some((c) => c.name.toLowerCase() === name.toLowerCase())
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
      repository.clans[clan.id] = clan;
      profile.clanId = clan.id;
      p.gold -= CLAN_CREATION_COST;
    } else if (v.action === 'request' && !c) {
      const target = repository.clans[String(v.clanId)];
      if (!target || target.requests.includes(profile.id) || target.requests.length >= 100) return;
      target.requests.push(profile.id);
      this.toast(id, 'Richiesta inviata al fondatore.');
    } else if (v.action === 'accept' && c?.founderId === profile.id) {
      const target = repository.profiles[String(v.profileId)];
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
      if (c.members.length === 0) delete repository.clans[c.id];
    } else if (v.action === 'kick' && c?.founderId === profile.id && v.profileId !== profile.id) {
      const target = repository.profiles[String(v.profileId)];
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
