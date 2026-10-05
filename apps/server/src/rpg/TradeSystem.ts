import {
  BAG_CAPACITY,
  TRADE_RANGE,
  protectedStarterItem,
  heroClass,
  type Item,
  type TradeItemView,
  type TradeRequestView,
  type TradeView,
} from '@aetheria/shared';
import type { WorldState, PlayerState } from '@aetheria/shared/schema';
import type { RPGSystem } from './RPGSystem.ts';
import type { Profile } from './Repository.ts';

/**
 * Server-authoritative player-to-player trading. Items are never destroyed while
 * a trade is open: they stay in the owner's bag and are only *locked*, then moved
 * in one atomic step on commit. A crash or disconnect therefore returns everything.
 */
interface Side {
  id: string;
  itemIds: string[];
  gold: number;
  ready: boolean;
}
interface Trade {
  id: string;
  a: Side;
  b: Side;
  open: boolean;
  createdAt: number;
}
type Send = (id: string, type: string, value: unknown) => void;
const INVITE_TTL = 20000;

export class TradeSystem {
  private trades = new Map<string, Trade>();
  private byPlayer = new Map<string, string>();
  constructor(
    private state: WorldState,
    private rpg: RPGSystem,
    private send: Send,
  ) {}

  private player(id: string): PlayerState | undefined {
    return this.state.players.get(id);
  }
  private profile(id: string): Profile | undefined {
    return this.rpg.profiles.get(id);
  }
  private toast(id: string, text: string) {
    this.send(id, 'notice', text);
  }
  private side(trade: Trade, id: string): Side | undefined {
    return trade.a.id === id ? trade.a : trade.b.id === id ? trade.b : undefined;
  }
  private other(side: Side, trade: Trade): Side {
    return trade.a === side ? trade.b : trade.a;
  }
  private distance(a: string, b: string) {
    const pa = this.player(a),
      pb = this.player(b);
    return pa && pb ? Math.hypot(pa.x - pb.x, pa.z - pb.z) : Infinity;
  }
  private itemView(item: Item): TradeItemView {
    return {
      id: item.id,
      name: item.name,
      icon: item.icon,
      rarity: item.rarity,
      quantity: item.quantity,
      upgradeLevel: item.upgradeLevel,
    };
  }
  private offerItems(id: string, itemIds: string[]): TradeItemView[] {
    const profile = this.profile(id);
    if (!profile) return [];
    return itemIds
      .map((itemId) => profile.items.find((i) => i.id === itemId))
      .filter((i): i is Item => !!i)
      .map((i) => this.itemView(i));
  }
  private view(trade: Trade, id: string): TradeView {
    const side = this.side(trade, id)!,
      other = this.other(side, trade),
      partner = this.player(other.id);
    return {
      id: trade.id,
      partnerName: partner?.name ?? 'Viandante',
      partnerClass: heroClass(partner?.heroClass),
      myOffer: this.offerItems(side.id, side.itemIds),
      theirOffer: this.offerItems(other.id, other.itemIds),
      myGold: side.gold,
      theirGold: other.gold,
      myReady: side.ready,
      theirReady: other.ready,
    };
  }
  private push(trade: Trade) {
    this.send(trade.a.id, 'trade', this.view(trade, trade.a.id));
    this.send(trade.b.id, 'trade', this.view(trade, trade.b.id));
  }
  private unlock(trade: Trade) {
    for (const side of [trade.a, trade.b])
      for (const itemId of side.itemIds) this.rpg.locked.delete(itemId);
  }
  private finish(trade: Trade, reason: string) {
    this.unlock(trade);
    this.trades.delete(trade.id);
    this.byPlayer.delete(trade.a.id);
    this.byPlayer.delete(trade.b.id);
    this.send(trade.a.id, 'trade', null);
    this.send(trade.b.id, 'trade', null);
    if (reason) {
      this.toast(trade.a.id, reason);
      this.toast(trade.b.id, reason);
    }
  }
  handle(id: string, value: unknown) {
    if (!value || typeof value !== 'object') return;
    const v = value as Record<string, unknown>,
      tradeId = typeof v.id === 'string' ? v.id : '';
    switch (v.action) {
      case 'request':
        this.request(id, v.target);
        return;
      case 'accept':
        this.respond(id, tradeId, true);
        return;
      case 'decline':
        this.respond(id, tradeId, false);
        return;
      case 'offer':
        if (typeof v.itemId === 'string') this.offer(id, tradeId, v.itemId);
        return;
      case 'retract':
        if (typeof v.itemId === 'string') this.retract(id, tradeId, v.itemId);
        return;
      case 'gold':
        this.setGold(id, tradeId, v.amount);
        return;
      case 'ready':
        this.setReady(id, tradeId);
        return;
      case 'cancel':
        this.cancel(id, tradeId, 'Scambio annullato.');
        return;
      default:
        return;
    }
  }
  private request(from: string, target: unknown) {
    if (typeof target !== 'string' || target === from) return;
    const fromPlayer = this.player(from),
      targetPlayer = this.player(target),
      fromProfile = this.profile(from),
      targetProfile = this.profile(target);
    if (!fromPlayer || !targetPlayer || !fromProfile || !targetProfile) return;
    if (fromPlayer.hp <= 0 || targetPlayer.hp <= 0) {
      this.toast(from, 'Non puoi scambiare da morto.');
      return;
    }
    if (this.byPlayer.has(from) || this.byPlayer.has(target)) {
      this.toast(from, 'Uno dei due giocatori è già impegnato in uno scambio.');
      return;
    }
    if (this.distance(from, target) > TRADE_RANGE) {
      this.toast(from, 'Avvicinati al giocatore per proporre uno scambio.');
      return;
    }
    const trade: Trade = {
      id: `${from}:${target}:${Date.now().toString(36)}`,
      a: { id: from, itemIds: [], gold: 0, ready: false },
      b: { id: target, itemIds: [], gold: 0, ready: false },
      open: false,
      createdAt: Date.now(),
    };
    this.trades.set(trade.id, trade);
    this.byPlayer.set(from, trade.id);
    this.byPlayer.set(target, trade.id);
    const incoming: TradeRequestView = {
      id: trade.id,
      fromName: fromPlayer.name,
      fromClass: heroClass(fromPlayer.heroClass),
    };
    this.send(target, 'trade-request', incoming);
    this.toast(from, `Invito di scambio inviato a ${targetPlayer.name}.`);
  }
  private respond(id: string, tradeId: string, accept: boolean) {
    const trade = this.trades.get(tradeId);
    if (!trade || trade.open || trade.b.id !== id) return;
    if (!accept) {
      this.finish(trade, 'Invito di scambio rifiutato.');
      return;
    }
    trade.open = true;
    this.toast(trade.a.id, 'Scambio aperto: componi la tua offerta.');
    this.push(trade);
  }
  private active(id: string, tradeId: string): { trade: Trade; side: Side } | null {
    const trade = this.trades.get(tradeId),
      side = trade && this.side(trade, id);
    return trade && trade.open && side ? { trade, side } : null;
  }
  private offer(id: string, tradeId: string, itemId: string) {
    const ctx = this.active(id, tradeId);
    if (!ctx) return;
    const { trade, side } = ctx;
    if (side.itemIds.includes(itemId)) return;
    const profile = this.profile(id),
      item = profile?.items.find((i) => i.id === itemId);
    if (!profile || !item) return;
    if (Object.values(profile.equipment).includes(itemId)) {
      this.toast(id, 'Rimuovi l’oggetto prima di offrirlo in scambio.');
      return;
    }
    if (protectedStarterItem(item)) {
      this.toast(id, 'Il kit iniziale non può essere scambiato.');
      return;
    }
    side.itemIds.push(itemId);
    this.rpg.locked.add(itemId);
    trade.a.ready = trade.b.ready = false;
    this.rpg.send(id);
    this.push(trade);
  }
  private retract(id: string, tradeId: string, itemId: string) {
    const ctx = this.active(id, tradeId);
    if (!ctx) return;
    const { trade, side } = ctx,
      index = side.itemIds.indexOf(itemId);
    if (index < 0) return;
    side.itemIds.splice(index, 1);
    this.rpg.locked.delete(itemId);
    trade.a.ready = trade.b.ready = false;
    this.rpg.send(id);
    this.push(trade);
  }
  private setGold(id: string, tradeId: string, amount: unknown) {
    const ctx = this.active(id, tradeId);
    if (!ctx) return;
    const { trade, side } = ctx,
      p = this.player(id),
      value = typeof amount === 'number' && Number.isFinite(amount) ? Math.floor(amount) : NaN;
    if (!p || !Number.isFinite(value)) return;
    side.gold = Math.max(0, Math.min(p.gold, value));
    trade.a.ready = trade.b.ready = false;
    this.push(trade);
  }
  private setReady(id: string, tradeId: string) {
    const ctx = this.active(id, tradeId);
    if (!ctx) return;
    const { trade, side } = ctx;
    side.ready = !side.ready;
    if (trade.a.ready && trade.b.ready) this.commit(trade);
    else this.push(trade);
  }
  private commit(trade: Trade) {
    const aProfile = this.profile(trade.a.id),
      bProfile = this.profile(trade.b.id),
      aPlayer = this.player(trade.a.id),
      bPlayer = this.player(trade.b.id);
    if (!aProfile || !bProfile || !aPlayer || !bPlayer) {
      this.finish(trade, 'Scambio annullato.');
      return;
    }
    const capacity = (profile: Profile, side: Side, incoming: Side) =>
      profile.items.length - side.itemIds.length + incoming.itemIds.length <= BAG_CAPACITY;
    if (!capacity(aProfile, trade.a, trade.b) || !capacity(bProfile, trade.b, trade.a)) {
      trade.a.ready = trade.b.ready = false;
      this.toast(trade.a.id, 'Zaino pieno per uno dei due: libera spazio e riprova.');
      this.toast(trade.b.id, 'Zaino pieno per uno dei due: libera spazio e riprova.');
      this.push(trade);
      return;
    }
    if (aPlayer.gold < trade.a.gold || bPlayer.gold < trade.b.gold) {
      trade.a.ready = trade.b.ready = false;
      this.toast(trade.a.id, 'Oro insufficiente: aggiorna l’offerta.');
      this.toast(trade.b.id, 'Oro insufficiente: aggiorna l’offerta.');
      this.push(trade);
      return;
    }
    const take = (profile: Profile, ids: string[]) =>
      ids.map((itemId) => profile.items.find((i) => i.id === itemId)!).filter(Boolean);
    const aItems = take(aProfile, trade.a.itemIds),
      bItems = take(bProfile, trade.b.itemIds);
    aProfile.items = aProfile.items.filter((i) => !trade.a.itemIds.includes(i.id));
    bProfile.items = bProfile.items.filter((i) => !trade.b.itemIds.includes(i.id));
    aProfile.items.push(...bItems);
    bProfile.items.push(...aItems);
    aPlayer.gold = aPlayer.gold - trade.a.gold + trade.b.gold;
    bPlayer.gold = bPlayer.gold - trade.b.gold + trade.a.gold;
    this.finish(trade, '');
    this.rpg.checkpoint(trade.a.id);
    this.rpg.checkpoint(trade.b.id);
    this.rpg.send(trade.a.id);
    this.rpg.send(trade.b.id);
    this.toast(trade.a.id, 'Scambio completato.');
    this.toast(trade.b.id, 'Scambio completato.');
  }
  private cancel(id: string, tradeId: string, reason: string) {
    const trade = this.trades.get(tradeId);
    if (!trade || !this.side(trade, id)) return;
    this.finish(trade, reason);
  }
  leave(id: string) {
    const tradeId = this.byPlayer.get(id);
    if (!tradeId) return;
    const trade = this.trades.get(tradeId);
    if (trade) this.finish(trade, 'Scambio annullato: un giocatore si è disconnesso.');
  }
  tick(now: number) {
    for (const trade of [...this.trades.values()]) {
      if (!trade.open) {
        if (now - trade.createdAt > INVITE_TTL) this.finish(trade, 'Invito di scambio scaduto.');
        continue;
      }
      const a = this.player(trade.a.id),
        b = this.player(trade.b.id);
      if (!a || !b || a.hp <= 0 || b.hp <= 0) {
        this.finish(trade, 'Scambio annullato.');
        continue;
      }
      if (this.distance(trade.a.id, trade.b.id) > TRADE_RANGE + 1) {
        this.finish(trade, 'Scambio annullato: vi siete allontanati.');
      }
    }
  }
}
