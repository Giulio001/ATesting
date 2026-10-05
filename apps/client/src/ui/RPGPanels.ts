import {
  EQUIPMENT_SLOTS,
  SLOT_NAMES,
  BAG_PAGE_SIZE,
  BAG_CAPACITY,
  SHOP_ITEMS,
  CLAN_CREATION_COST,
  itemIconUrl,
  itemStats,
  protectedStarterItem,
  FORGE_MAX_UPGRADE,
  forgeUpgradeCost,
  forgeSalvageValue,
  forgeUpgradeMaterials,
  countMaterial,
  nearbyNpc,
  ALL_NPCS,
  RESIDENTS,
  residentPose,
  dayIndex,
  dailyRotation,
  nextDailyReset,
  slotProgress,
  slotDone,
  enemyRules,
  OBSTACLES,
  FRONTIER,
  GROVE,
  CLASS_NAMES,
  isHostile,
  FRONTIER_TITLES,
  FRONTIER_STORY,
  frontierObjective,
  GROVE_TITLES,
  GROVE_STORY,
  groveObjective,
  HERO_CLASSES,
  heroClass,
  classAbilities,
  TRADE_RANGE,
  type TradeView,
  type TradeRequestView,
  type RPGSnapshot,
  type Item,
  type ChatMessage,
  type AbilityId,
} from '@aetheria/shared';
import type { PlayerState, WorldState } from '@aetheria/shared/schema';
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const statName: Record<string, string> = {
  bonusAttack: 'Attacco',
  bonusDef: 'Difesa',
  bonusHp: 'Vita',
  bonusMp: 'Mana',
  bonusSpeed: 'Velocità',
  bonusRegen: 'Rigenerazione',
  bonusCrit: 'Critico',
  bonusBlock: 'Blocco',
  bonusDodge: 'Schivata',
  bonusAttackSpeed: 'Vel. attacco',
  bonusAbilityPower: 'Potere abilità',
  bonusCooldownReduction: 'Riduzione ricarica',
};
export class RPGPanels {
  snapshot?: RPGSnapshot;
  private panel = '';
  private page = 0;
  private selected = '';
  private salvageConfirmation = '';
  private messages: ChatMessage[] = [];
  private channel: 'GLOBAL' | 'GUILD' = 'GLOBAL';
  private trade?: TradeView;
  private tradeReq?: TradeRequestView;
  private root = document.getElementById('rpg-overlay')!;
  private title = document.getElementById('panel-title')!;
  private content = document.getElementById('panel-content')!;
  onMenuChanged: (open: boolean) => void = () => {};
  onSend: (type: string, value: unknown) => void = () => {};
  onAbility: (ability: AbilityId) => void = () => {};
  onNotice: (text: string) => void = () => {};
  onReturn: () => void = () => {};
  get isOpen() {
    return this.panel !== '';
  }
  constructor(
    private player: () => PlayerState | undefined,
    private nearbyPlayers: () => Iterable<[string, PlayerState]> = () => [],
    private world: () => WorldState | undefined = () => undefined,
  ) {
    document
      .querySelectorAll<HTMLElement>('[data-open]')
      .forEach((b) => b.addEventListener('click', () => this.open(b.dataset.open!)));
    document.getElementById('panel-close')!.addEventListener('click', () => this.close());
    document.getElementById('panel-back')!.addEventListener('click', () => this.open('menu'));
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target === this.root) this.close();
    });
    this.content.addEventListener('click', (e) => this.click(e));
    this.content.addEventListener('dblclick', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-item]');
      if (b) this.onSend('inventory', { action: 'equip', id: b.dataset.item });
    });
    addEventListener('keydown', (e) => {
      if (
        (e.target as HTMLElement)?.matches('input,textarea,select') ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      if (!document.body.classList.contains('playing')) return;
      const key: Record<string, string> = {
        KeyI: 'inventory',
        KeyK: 'skills',
        KeyJ: 'quests',
        KeyC: 'clan',
        KeyP: 'character',
        KeyM: 'map',
        Tab: 'menu',
      };
      if (key[e.code] && !e.repeat) {
        e.preventDefault();
        this.panel === key[e.code] ? this.close() : this.open(key[e.code]);
      }
      if (e.code === 'Escape') {
        this.close();
        (document.activeElement as HTMLElement)?.blur();
        document.getElementById('chat-panel')!.classList.remove('expanded');
      }
      if (e.code === 'Enter' && !this.isOpen) {
        e.preventDefault();
        document.getElementById('chat-panel')!.classList.add('expanded');
        (document.getElementById('chat-input') as HTMLInputElement).focus();
      }
    });
    const input = document.getElementById('chat-input') as HTMLInputElement;
    input.addEventListener('focus', () => this.onMenuChanged(true));
    input.addEventListener('blur', () => this.onMenuChanged(this.isOpen));
    input.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        input.blur();
        document.getElementById('chat-panel')!.classList.remove('expanded');
      }
    });
    document.getElementById('chat-form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value.trim()) {
        this.onSend('chat', { text: input.value, channel: this.channel });
        input.value = '';
      }
      input.blur();
    });
    document.querySelectorAll<HTMLElement>('[data-channel]').forEach((b) =>
      b.addEventListener('click', () => {
        this.channel = b.dataset.channel as 'GLOBAL' | 'GUILD';
        document
          .querySelectorAll('[data-channel]')
          .forEach((el) => el.classList.toggle('active', el === b));
        this.renderChat();
      }),
    );
    this.renderChat();
    if (matchMedia('(pointer:coarse)').matches)
      document.querySelector('.rpg-footnote')!.textContent =
        'Tocca × per chiudere · seleziona un oggetto per equipaggiarlo';
    document.getElementById('chat-expand')!.addEventListener('click', () => {
      document.getElementById('chat-panel')!.classList.toggle('expanded');
      if (document.getElementById('chat-panel')!.classList.contains('expanded')) input.focus();
      else input.blur();
    });
  }
  update(snapshot: RPGSnapshot) {
    this.snapshot = snapshot;
    this.salvageConfirmation = '';
    if (this.isOpen) this.render();
  }
  /** A refreshed trade view (or null once it closes). */
  tradeUpdate(view: TradeView | null) {
    this.tradeReq = undefined;
    if (!view) {
      this.trade = undefined;
      if (this.panel === 'trade') this.close();
      return;
    }
    this.trade = view;
    this.open('trade');
  }
  tradeRequest(request: TradeRequestView) {
    this.trade = undefined;
    this.tradeReq = request;
    this.open('trade');
  }
  open(panel: string) {
    if (!document.body.classList.contains('playing')) return;
    this.panel = panel;
    this.salvageConfirmation = '';
    this.root.classList.remove('hidden');
    this.render();
    this.onMenuChanged(true);
    (document.getElementById('panel-close') as HTMLButtonElement).focus();
  }
  close() {
    this.panel = '';
    this.root.classList.add('hidden');
    this.onMenuChanged(false);
  }
  private render() {
    const titles: Record<string, string> = {
      inventory: 'ZAINO',
      skills: 'ABILITÀ',
      quests: 'MISSIONI',
      clan: 'CLAN',
      character: 'PERSONAGGIO',
      menu: 'MENU',
      shop: 'QUARTIERMASTRO',
      forge: 'FORGIA',
      map: 'MINIMAPPA',
      trade: 'SCAMBIO',
      settings: 'OPZIONI',
    };
    this.title.textContent = titles[this.panel] ?? 'AETHERIA';
    this.root.dataset.panel = this.panel;
    document.getElementById('panel-back')!.classList.toggle('hidden', this.panel === 'menu');
    if (this.panel === 'inventory') this.inventory();
    else if (this.panel === 'skills') this.skills();
    else if (this.panel === 'clan') this.clan();
    else if (this.panel === 'quests') this.quests();
    else if (this.panel === 'character') this.character();
    else if (this.panel === 'shop') this.shop();
    else if (this.panel === 'forge') this.forge();
    else if (this.panel === 'map') this.map();
    else if (this.panel === 'trade') this.tradePanel();
    else if (this.panel === 'settings') this.settings();
    else this.menu();
  }
  private icon(item: Pick<Item, 'icon' | 'name'>) {
    return `<img src="${itemIconUrl(item.icon)}" alt="${esc(item.name)}" draggable="false">`;
  }
  private itemSlot(item: Item | undefined, label = '', equipment = false) {
    return `<button class="item-slot ${item?.rarity.toLowerCase() ?? 'empty'} ${item?.id === this.selected ? 'selected' : ''}" ${item ? `data-item="${esc(item.id)}"` : ''} title="${esc(item?.name ?? label)}">${item ? this.icon(item) : `<span>${esc(label)}</span>`}${item && item.quantity > 1 ? `<b>${item.quantity}</b>` : ''}${item?.upgradeLevel ? `<b class="upgrade-badge">+${item.upgradeLevel}</b>` : ''}${equipment && item ? '<small>INDOSSATO</small>' : ''}</button>`;
  }
  private inventory() {
    const s = this.snapshot;
    if (!s) {
      this.content.textContent = 'Caricamento dello zaino…';
      return;
    }
    const selected = s.items.find((i) => i.id === this.selected),
      equipped = Object.values(s.equipment);
    const slots = Array.from({ length: BAG_PAGE_SIZE }, (_, n) =>
      this.itemSlot(s.items[this.page * BAG_PAGE_SIZE + n]),
    ).join('');
    this.content.innerHTML = `<div class="inventory-layout"><section class="equipment-section"><h3>EQUIPAGGIATO</h3><div class="paper-doll"><div class="paper-doll-crest">♜<small>${CLASS_NAMES[heroClass(s.heroClass)].toUpperCase()}</small></div><div class="equipment-grid">${EQUIPMENT_SLOTS.map(
      (slot) =>
        `<div><label>${SLOT_NAMES[slot]}</label>${this.itemSlot(
          s.items.find((i) => i.id === s.equipment[slot]),
          SLOT_NAMES[slot],
          true,
        )}${s.equipment[slot] ? `<button class="unequip" data-unequip="${slot}" title="Rimuovi ${SLOT_NAMES[slot]}">×</button>` : ''}</div>`,
    ).join(
      '',
    )}</div></div></section><section class="bag-section"><h3>SACCA <small>${s.items.length} / ${BAG_CAPACITY}</small></h3><div class="bag-grid">${slots}</div><div class="bag-pager"><button data-page="-1" aria-label="Pagina precedente">‹</button><span>${this.page + 1} / 3</span><button data-page="1" aria-label="Pagina successiva">›</button></div></section></div><aside class="item-details">${
      selected
        ? `<div>${this.icon(selected)}<div><h3 class="${selected.rarity.toLowerCase()}">${esc(selected.name)}${selected.upgradeLevel ? ` +${selected.upgradeLevel}` : ''}</h3><small>${esc(selected.rarity)} · LIVELLO ${selected.level} · ${esc(selected.kind)}</small></div></div><p>${esc(selected.description)}</p><ul>${Object.entries(
            itemStats(selected),
          )
            .map(([k, v]) => `<li>${statName[k] ?? esc(k)} <b>+${v}</b></li>`)
            .join(
              '',
            )}</ul>${EQUIPMENT_SLOTS.includes(selected.kind as never) ? `<button class="gold-button" data-equip="${esc(selected.id)}">${equipped.includes(selected.id) ? 'Equipaggiato' : 'Equipaggia'}</button>` : '<small>Materiale conservato nello zaino.</small>'}`
        : 'Seleziona un oggetto per leggere i bonus, poi premi Equipaggia.'
    }</aside>`;
  }
  private skills() {
    const p = this.player();
    this.content.innerHTML = `<p class="panel-intro">Il cammino del ${CLASS_NAMES[heroClass(p?.heroClass)]}. Premi Q / R / F o usa la barra rapida.</p><div class="skill-cards">${Object.entries(
      classAbilities(p?.heroClass),
    )
      .map(
        ([id, a]) =>
          `<article>${this.icon({ icon: a.icon, name: a.name })}<div><h3>${a.name}</h3><small>${a.key} · ${a.cost} MANA · ${a.cooldown / 1000}s</small><p>${a.description}${a.damage ? ` Danno base ${a.damage}, aumentato dall’attacco dell’equipaggiamento.` : ''}</p><button data-cast="${id}">Usa abilità</button></div></article>`,
      )
      .join(
        '',
      )}</div><p>Vigore: ${Math.floor(p?.stamina ?? 100)} / 100. L’attacco base consuma 25 vigore; il recupero è automatico.</p>`;
  }
  private quests() {
    const p = this.player(),
      state = p?.questState ?? 0;
    const lines = [
      'Parla con Ser Aurel, il custode presso la fontana.',
      'Attraversa la porta sud e sconfiggi tre Schegge del Vuoto.',
      'Torna dal custode per riscuotere la ricompensa.',
      'La porta di Lumengate è al sicuro. Il Custode del Vuoto ti attende nella fenditura.',
    ];
    this.content.innerHTML = `<article class="quest-entry"><small>LUMENGATE · ${state === 3 ? 'COMPLETATA' : state === 0 ? 'DA ACCETTARE' : 'IN CORSO'}</small><h3>Il primo giuramento</h3><p>${lines[state]}</p><div class="quest-meter"><i style="width:${((p?.questKills ?? 0) / 3) * 100}%"></i></div><p>Schegge sconfitte: ${p?.questKills ?? 0} / 3</p><strong>Ricompensa: 75 oro + 100 EXP</strong><p>Interagisci con il custode premendo E o il pulsante PARLA.</p></article>`;
    this.content.innerHTML += `<article class="quest-entry"><small>TERRE SANGUINANTI · ${p?.frontierState === 5 ? 'COMPLETATA' : p?.frontierState ? 'IN CORSO' : 'DA ACCETTARE'}</small><h3>${FRONTIER_TITLES[p?.frontierState ?? 0]}</h3><p>${frontierObjective(p?.frontierState ?? 0, p?.frontierKills ?? 0)}</p><p>Creature corrotte: ${p?.frontierKills ?? 0} / 5</p><strong>Ricompensa: ${FRONTIER_STORY.reward.gold} oro · ${FRONTIER_STORY.reward.xp} EXP · 10 polvere · 2 pozioni · 2 Gelatine Eteree</strong><p>Il ponte a est collega Lumengate alla Frontiera. Il faro conserva l’indizio; il Campione difende la radura orientale.</p></article>`;
    const now = Date.now();
    const day = p?.dailyDay || dayIndex(now);
    const quests = dailyRotation(day);
    const remaining = Math.max(0, nextDailyReset(now) - now);
    const resetLabel = `${Math.floor(remaining / 3_600_000)}h ${Math.floor((remaining % 3_600_000) / 60_000)}m`;
    const dailyEntries = quests
      .map((quest, slot) => {
        const progress = Math.min(quest.goal, slotProgress(p?.dailyProgress ?? 0, slot));
        const done = slotDone(p?.dailyDone ?? 0, slot);
        const status = done ? 'RISCOSSA' : progress >= quest.goal ? 'PRONTA' : 'IN CORSO';
        const reward = `${quest.gold} oro · ${quest.xp} EXP · ${quest.dust} Polvere${quest.potions ? ` · ${quest.potions} pozioni` : ''}`;
        return `<article class="quest-entry daily"><small>TAGLIA GIORNALIERA · ${status}</small><h3>${esc(quest.title)}</h3><p>${esc(quest.description)}</p><div class="quest-meter"><i style="width:${(progress / quest.goal) * 100}%"></i></div><p>Progresso: ${progress} / ${quest.goal}</p><strong>Ricompensa: ${reward}</strong></article>`;
      })
      .join('');
    this.content.innerHTML += `<section class="daily-block"><h3>MISSIONI GIORNALIERE <small>nuove taglie fra ${resetLabel}</small></h3>${dailyEntries}<p class="daily-hint">Riscuoti le taglie dal <b>Banditore</b>, accanto alla fontana (E). Il conteggio avanza combattendo in qualsiasi regione.</p></section>`;
    if ((p?.frontierState ?? 0) >= 5 || (p?.groveState ?? 0) > 0)
      this.content.innerHTML += `<article class="quest-entry"><small>BOSCO SOMMERSO · ${p?.groveState === 5 ? 'COMPLETATA' : 'IN CORSO'}</small><h3>${GROVE_TITLES[p?.groveState ?? 0]}</h3><p>${groveObjective(p?.groveState ?? 0, p?.groveKills ?? 0)}</p><p>Creature annegate: ${p?.groveKills ?? 0} / 6</p><strong>Ricompensa: ${GROVE_STORY.reward.gold} oro · ${GROVE_STORY.reward.xp} EXP · 14 polvere · 3 pozioni · 3 Gelatine Eteree</strong><p>Oltre la Frontiera il fiume ha sommerso un antico bosco. Il Custode del Bosco veglia sull’altare; il Guardiano Annegato custodisce la reliquia.</p></article>`;
  }
  private character() {
    const p = this.player();
    this.content.innerHTML = `<div class="character-summary"><div class="paper-doll-crest">♜</div><h3>${esc(p?.name ?? 'Viandante')}</h3><p>${CLASS_NAMES[heroClass(p?.heroClass)].toUpperCase()} · LIVELLO ${p?.level ?? 1}</p>${p?.clanName ? `<p>Clan: ${esc(p.clanName)}</p>` : ''}</div><div class="stat-grid"><p>Vita <b>${p?.hp ?? 100} / ${p?.maxHp ?? 100}</b></p><p>Mana <b>${Math.floor(p?.mana ?? 100)} / 100</b></p><p>Attacco arma <b>+${p?.attackBonus ?? 0}</b></p><p>Difesa equipaggiamento <b>${p?.defence ?? 0}</b></p><p>Oro <b>${p?.gold ?? 0}</b></p><p>Creature sconfitte <b>${p?.kills ?? 0}</b></p></div><button data-open-panel="inventory">Apri equipaggiamento →</button><p>Puoi cambiare cammino in città. I progressi e gli oggetti vengono conservati.</p><div class="class-choices">${HERO_CLASSES.map((cls) => `<button data-class="${cls}" ${p?.heroClass === cls || !p || p.hp <= 0 || isHostile(p.x, p.z) ? 'disabled' : ''}>${CLASS_NAMES[cls]}</button>`).join('')}</div>`;
  }
  private shop() {
    this.content.innerHTML = `<p class="panel-intro">Equipaggiamento e provviste di Lumengate. Oro: ${this.player()?.gold ?? 0}. Gli acquisti richiedono la vicinanza al Quartiermastro.</p><div class="shop-list">${SHOP_ITEMS.map((item) => `<article>${this.icon(item)}<div><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p></div><button data-buy="${item.id}">${item.price} ORO</button></article>`).join('')}</div>`;
  }
  private forge() {
    const s = this.snapshot,
      p = this.player();
    if (!s) {
      this.content.textContent = 'Caricamento della forgia…';
      return;
    }
    const gear = s.items.filter((item) => EQUIPMENT_SLOTS.includes(item.kind as never));
    const item = gear.find((item) => item.id === this.selected);
    const near = !!p && p.hp > 0 && nearbyNpc(p.x, p.z)?.id === 'blacksmith';
    let details =
      '<p>Seleziona un oggetto per vedere costi e bonus del prossimo potenziamento.</p>';
    if (item) {
      const level = item.upgradeLevel ?? 0,
        max = level >= FORGE_MAX_UPGRADE;
      const cost = forgeUpgradeCost(level + 1, item.rarity);
      const needs = max ? [] : forgeUpgradeMaterials(level + 1, item.rarity, item.level);
      const current = itemStats(item),
        next = itemStats({ ...item, upgradeLevel: level + 1 });
      const canUpgrade =
        near &&
        !max &&
        (p?.gold ?? 0) >= cost.goldCost &&
        s.aetherDust >= cost.dustCost &&
        needs.every((need) => countMaterial(s.items, need.id) >= need.quantity);
      const equipped = Object.values(s.equipment).includes(item.id),
        protectedItem = protectedStarterItem(item);
      details = `<h3>${esc(item.name)} +${level}</h3><p>${equipped ? 'Indossato · ' : ''}${esc(item.rarity)}</p><table class="forge-stats"><thead><tr><th>Bonus</th><th>Ora</th>${max ? '' : `<th>A +${level + 1}</th>`}</tr></thead><tbody>${Object.entries(
        current,
      )
        .map(
          ([key, value]) =>
            `<tr><td>${statName[key] ?? esc(key)}</td><td>+${value}</td>${max ? '' : `<td>+${next[key]}</td>`}</tr>`,
        )
        .join(
          '',
        )}</tbody></table>${max ? '<p>Limite +9 raggiunto.</p>' : `<p>Prossimo gradino: <b>+${level + 1}</b> · riuscita <b>${Math.round(cost.chance * 100)}%</b></p><p>${cost.goldCost} oro · ${cost.dustCost} Polvere d’Aether</p>${needs.length ? `<ul>${needs.map((need) => `<li>${esc(need.name)}: ${countMaterial(s.items, need.id)} / ${need.quantity}</li>`).join('')}</ul>` : ''}<p>${cost.chance < 1 ? 'Il fallimento consuma oro, polvere e materiali. L’oggetto e il suo gradino restano intatti.' : 'Potenziamento garantito.'}</p><button class="gold-button" data-upgrade="${esc(item.id)}" ${canUpgrade ? '' : 'disabled'}>Potenzia a +${level + 1}</button>`}<div class="forge-salvage">${protectedItem ? '<p>Kit iniziale protetto dal riciclo.</p>' : equipped ? '<p>Rimuovi questo oggetto prima di riciclarlo.</p>' : `<p>Riciclo: +${forgeSalvageValue(item.rarity, level)} Polvere d’Aether. L’oggetto viene distrutto.</p><button data-salvage="${esc(item.id)}" ${near ? '' : 'disabled'}>${this.salvageConfirmation === item.id ? 'Conferma distruzione e riciclo' : 'Ricicla oggetto'}</button>${this.salvageConfirmation === item.id ? '<button data-cancel-salvage>Annulla</button>' : ''}`}</div>`;
    }
    this.content.innerHTML = `<p class="panel-intro">Fabbro di Lumengate · Oro: ${p?.gold ?? 0} · Polvere d’Aether: ${s.aetherDust}. ${near ? 'Scegli un oggetto per lavorarlo.' : 'Avvicinati al Fabbro, a ovest della fontana.'}</p><div class="forge-layout"><section><h3>EQUIPAGGIAMENTO</h3><div class="forge-gear">${gear.map((item) => this.itemSlot(item, '', Object.values(s.equipment).includes(item.id))).join('')}</div></section><section class="forge-details" aria-live="polite">${details}</section></div><p>Le creature lasciano polvere e possono lasciare materiali della Frontiera, richiesti dal +5.</p>`;
  }
  private clan() {
    const s = this.snapshot,
      c = s?.clan;
    this.content.innerHTML = c
      ? `<div class="clan-heading"><span>✥</span><div><h3>${esc(c.name)}</h3><small>${c.members} membri · tesoreria ${c.treasury} oro</small></div></div><h3>MEMBRI</h3><div class="clan-roster">${c.roster.map((m) => `<div><i class="${m.online ? 'online' : ''}"></i><span>${esc(m.name)} <small>${m.role === 'FOUNDER' ? 'Fondatore' : 'Membro'}</small></span>${c.founderId === s?.profileId && m.id !== s.profileId ? `<button data-kick="${m.id}">Rimuovi</button>` : ''}</div>`).join('')}</div>${c.requests.length ? `<h3>RICHIESTE DI INGRESSO</h3>${c.requests.map((m) => `<p>${esc(m.name)} <button data-accept="${m.id}">Accetta</button></p>`).join('')}` : ''}<p><label>Donazione <input id="clan-gold" type="number" min="1" max="${this.player()?.gold ?? 0}" value="10"></label><button data-donate>Versa oro</button></p><button data-leave-clan>${c.members === 1 ? 'Sciogli il clan' : 'Lascia il clan'}</button>`
      : `<p class="panel-intro">L’Araldo dei Clan, a est della fontana, può registrare il tuo clan. Costo: ${CLAN_CREATION_COST} oro. Per entrare in un clan esistente, invia una richiesta al fondatore.</p><div class="clan-create"><input id="clan-name" maxlength="20" placeholder="Nome del clan (3–20 caratteri)"><button data-create-clan>Fonda · ${CLAN_CREATION_COST} ORO</button></div><h3>REGISTRO DEI CLAN</h3>${s?.clans.length ? s.clans.map((c) => `<article class="clan-list"><div><h3>${esc(c.name)}</h3><small>${c.members} membri</small></div><button data-request-clan="${c.id}">Richiedi ingresso</button></article>`).join('') : '<p>Nessun clan registrato. Il primo giuramento ti darà l’oro per fondare il tuo.</p>'}`;
  }
  private menu() {
    const entries = [
      ['inventory', 'Zaino', '0'],
      ['character', 'Personaggio', '1'],
      ['trade', 'Scambio', '6'],
      ['clan', 'Clan', '3'],
      ['quests', 'Missioni', '4'],
      ['skills', 'Abilità', '5'],
      ['forge', 'Forgia', '2'],
      ['map', 'Minimappa', '10'],
      ['settings', 'Opzioni', '9'],
    ];
    this.content.innerHTML = `<div class="menu-grid">${entries.map(([panel, name, pos]) => `<button data-open-panel="${panel}"><i class="menu-sprite" style="--sprite-x:${Number(pos) % 4};--sprite-y:${Math.floor(Number(pos) / 4)}"></i><span>${name}</span></button>`).join('')}<button data-return><span class="return-icon">⌂</span><span>Torna in città</span></button></div>`;
  }
  private tradePanel() {
    const s = this.snapshot,
      p = this.player();
    if (!s || !p) {
      this.content.textContent = 'Caricamento dello scambio…';
      return;
    }
    if (this.tradeReq && !this.trade) {
      const req = this.tradeReq;
      this.content.innerHTML = `<p class="panel-intro"><b>${esc(req.fromName)}</b> · ${CLASS_NAMES[heroClass(req.fromClass)]} vuole scambiare con te. Restate vicini finché lo scambio è aperto.</p><div class="trade-actions"><button class="gold-button" data-trade-accept>Accetta</button><button data-trade-decline>Rifiuta</button></div>`;
      return;
    }
    if (!this.trade) {
      const rows: string[] = [];
      for (const [id, other] of this.nearbyPlayers()) {
        if (other === p || other.hp <= 0) continue;
        if (Math.hypot(other.x - p.x, other.z - p.z) > TRADE_RANGE) continue;
        rows.push(
          `<article class="trade-player"><div><h3>${esc(other.name)}</h3><small>${CLASS_NAMES[heroClass(other.heroClass)]} · Livello ${other.level}</small></div><button data-trade-request="${esc(id)}">Proponi scambio</button></article>`,
        );
      }
      this.content.innerHTML = `<p class="panel-intro">Scambio sicuro fra giocatori: restate vicini, componete l’offerta e confermate entrambi. Oggetti e oro passano solo alla conferma finale.</p>${rows.length ? rows.join('') : '<p>Nessun altro giocatore nelle vicinanze. Avvicinati a un compagno entro 4 metri.</p>'}`;
      return;
    }
    const t = this.trade,
      offered = new Set(t.myOffer.map((i) => i.id)),
      equipped = Object.values(s.equipment),
      bag = s.items.filter((i) => !offered.has(i.id)),
      slot = (item: Item) => {
        const blocked = equipped.includes(item.id) || protectedStarterItem(item);
        return `<button class="item-slot ${item.rarity.toLowerCase()}" data-trade-offer="${esc(item.id)}" ${blocked ? 'disabled' : ''} title="${esc(item.name)}${blocked ? ' · non scambiabile' : ''}">${this.icon(item)}${item.quantity > 1 ? `<b>${item.quantity}</b>` : ''}${item.upgradeLevel ? `<b class="upgrade-badge">+${item.upgradeLevel}</b>` : ''}</button>`;
      },
      list = (items: TradeView['myOffer'], mine: boolean) =>
        items.length
          ? items
              .map(
                (i) =>
                  `<li><span>${esc(i.name)}${i.upgradeLevel ? ` +${i.upgradeLevel}` : ''}${i.quantity > 1 ? ` ×${i.quantity}` : ''}</span>${mine ? `<button data-trade-retract="${esc(i.id)}" title="Rimuovi">×</button>` : ''}</li>`,
              )
              .join('')
          : '<li class="muted">Nessun oggetto</li>';
    this.content.innerHTML = `<p class="panel-intro">Scambio con <b>${esc(t.partnerName)}</b> · ${CLASS_NAMES[heroClass(t.partnerClass)]}. Restate entro ${TRADE_RANGE} metri.</p><div class="trade-grid"><section><h3>LA TUA OFFERTA</h3><ul class="trade-list">${list(t.myOffer, true)}</ul><p class="trade-gold-row">Oro offerto <input id="trade-gold" type="number" min="0" max="${p.gold}" value="${t.myGold}"> <button data-trade-gold>Aggiorna</button> <small>Disponibile: ${p.gold}</small></p><h3>SACCA <small>${bag.length} oggetti</small></h3><div class="bag-grid trade-bag">${bag.map(slot).join('') || '<p class="muted">Nessun oggetto disponibile.</p>'}</div></section><section><h3>OFFERTA DI ${esc(t.partnerName.toUpperCase())}</h3><ul class="trade-list">${list(t.theirOffer, false)}</ul><p class="trade-partner-gold">Oro: <b>${t.theirGold}</b></p></section></div><div class="trade-actions"><button class="gold-button" data-trade-ready>${t.myReady ? 'Annulla “pronto”' : 'Sono pronto'}</button><button data-trade-cancel>Annulla scambio</button></div><p class="trade-status">Tu: ${t.myReady ? 'pronto' : 'in attesa'} · ${esc(t.partnerName)}: ${t.theirReady ? 'pronto' : 'in attesa'}</p>`;
  }
  private map() {
    this.content.innerHTML =
      '<canvas id="large-map" width="540" height="540" aria-label="Mappa di Aetheria"></canvas><p class="map-legend">◆ tu · ● oro: servizi · ○ chiaro: abitanti · ● rosso: nemici · ● magenta: élite · ↓ la mappa scorre verso est</p>';
    const p = this.player();
    const canvas = document.getElementById('large-map') as HTMLCanvasElement;
    const c = canvas.getContext('2d')!;
    const W = canvas.width,
      H = canvas.height,
      PAD = 30;
    const minX = -24,
      maxX = 144,
      minZ = -26,
      maxZ = 26;
    const scale = Math.min((W - PAD * 2) / (maxZ - minZ), (H - PAD * 2) / (maxX - minX));
    const stripW = (maxZ - minZ) * scale,
      stripH = (maxX - minX) * scale;
    const ox = (W - stripW) / 2,
      oy = (H - stripH) / 2;
    const pz = (z: number) => ox + (z - minZ) * scale;
    const px = (x: number) => oy + (x - minX) * scale;
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#0c1513';
    c.fillRect(0, 0, W, H);
    const regions: [number, number, string, string][] = [
      [minX, 30, '#22343a', 'LUMENGATE'],
      [30, 86, '#3b2f45', 'TERRE SANGUINANTI'],
      [86, maxX, '#20362f', 'BOSCO SOMMERSO'],
    ];
    for (const [from, to, fill, label] of regions) {
      c.fillStyle = fill;
      c.fillRect(ox, px(from), stripW, (to - from) * scale);
      c.save();
      c.translate(ox + stripW / 2, px((from + to) / 2));
      c.rotate(-Math.PI / 2);
      c.fillStyle = 'rgba(240,230,200,0.45)';
      c.font = '600 16px "VT323", monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(label, 0, 0);
      c.restore();
    }
    // The old kings' road ties the three regions together.
    const road: [number, number][] = [
      [-3, 6],
      [0, 10],
      [8, 9],
      [16, 4],
      [26, 0],
      [36, 0],
      [46, -2],
      [55, 2],
      [61, -4],
      [66, 4],
      [74, 8],
      [86, 2],
      [96, 0],
      [108, -10],
      [118, -4],
      [132, 6],
    ];
    c.beginPath();
    road.forEach(([x, z], index) => (index ? c.lineTo(pz(z), px(x)) : c.moveTo(pz(z), px(x))));
    c.strokeStyle = 'rgba(181,161,125,0.55)';
    c.lineWidth = 3;
    c.setLineDash([8, 7]);
    c.stroke();
    c.setLineDash([]);
    // Buildings, trees and walls from the shared collider list.
    for (const o of OBSTACLES) {
      const color =
        o.kind === 'tree'
          ? '#2f5240'
          : o.kind === 'house'
            ? '#3a4a52'
            : o.kind === 'wall'
              ? '#44505a'
              : o.kind === 'rock'
                ? '#43565c'
                : '#334c52';
      c.fillStyle = color;
      c.fillRect(
        pz(o.z - o.hz),
        px(o.x - o.hx),
        Math.max(2, o.hz * 2 * scale),
        Math.max(2, o.hx * 2 * scale),
      );
    }
    const dot = (x: number, z: number, color: string, radius: number) => {
      c.fillStyle = color;
      c.beginPath();
      c.arc(pz(z), px(x), radius, 0, Math.PI * 2);
      c.fill();
    };
    const seconds = Date.now() / 1000;
    for (const npc of RESIDENTS) {
      const pose = residentPose(npc, seconds);
      dot(pose.x, pose.z, 'rgba(238,232,210,0.75)', 3);
    }
    for (const npc of ALL_NPCS) if (npc.service !== 'resident') dot(npc.x, npc.z, '#f4d48f', 5);
    dot(FRONTIER.beacon.x, FRONTIER.beacon.z, '#b797fa', 5);
    dot(GROVE.altar.x, GROVE.altar.z, '#7de8c2', 5);
    this.world()?.enemies?.forEach((e) => {
      if (e.hp <= 0) return;
      const rules = enemyRules(e.type);
      dot(e.x, e.z, rules.elite ? '#eb91e2' : '#ec8d83', rules.elite ? 5 : 3);
    });
    if (p && p.hp > 0) {
      const cx = pz(p.z),
        cy = px(p.x);
      c.save();
      c.translate(cx, cy);
      c.rotate(-p.yaw + Math.PI);
      c.fillStyle = '#7fe8ff';
      c.beginPath();
      c.moveTo(0, -11);
      c.lineTo(7, 8);
      c.lineTo(0, 4);
      c.lineTo(-7, 8);
      c.closePath();
      c.fill();
      c.restore();
      c.strokeStyle = 'rgba(127,232,255,0.5)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(cx, cy, 13, 0, Math.PI * 2);
      c.stroke();
    }
    c.strokeStyle = 'rgba(200,170,110,0.5)';
    c.lineWidth = 2;
    c.strokeRect(ox, oy, stripW, stripH);
    c.fillStyle = 'rgba(240,230,200,0.7)';
    c.font = '16px "VT323", monospace';
    c.textAlign = 'center';
    c.fillText(
      `Lumengate  →  Frontiera  →  Bosco Sommerso     ·     posizione: ${Math.round(p?.x ?? 0)} / ${Math.round(p?.z ?? 0)}`,
      W / 2,
      H - 8,
    );
  }
  private settings() {
    this.content.innerHTML = `<p>Il livello grafico si cambia dal selettore GRAFICA. Su telefono la modalità automatica sceglie la qualità leggera.</p><p>WASD / joystick: corsa sempre attiva.<br>Spazio / click: attacco. Q / R / F: abilità.<br>H: pozione salute. G: pozione mana. E: interazione.<br>I: zaino. K: abilità. J: missioni. C: clan. M: mappa. Scambio fra giocatori: Menu → Scambio.<br>Invio: chat. Esc: chiudi.</p><p>Progressi, equipaggiamento e clan sono salvati sul server di ATesting. Il personaggio di questo browser viene riconosciuto tramite una chiave privata salvata localmente.</p>`;
  }
  private click(e: MouseEvent) {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!b) return;
    const d = b.dataset;
    if (d.openPanel) this.open(d.openPanel);
    else if (d.tradeRequest) this.onSend('trade', { action: 'request', target: d.tradeRequest });
    else if ('tradeAccept' in d && this.tradeReq)
      this.onSend('trade', { action: 'accept', id: this.tradeReq.id });
    else if ('tradeDecline' in d && this.tradeReq) {
      this.onSend('trade', { action: 'decline', id: this.tradeReq.id });
      this.tradeReq = undefined;
      this.render();
    } else if (d.tradeOffer && this.trade)
      this.onSend('trade', { action: 'offer', id: this.trade.id, itemId: d.tradeOffer });
    else if (d.tradeRetract && this.trade)
      this.onSend('trade', { action: 'retract', id: this.trade.id, itemId: d.tradeRetract });
    else if ('tradeGold' in d && this.trade)
      this.onSend('trade', {
        action: 'gold',
        id: this.trade.id,
        amount: Number((document.getElementById('trade-gold') as HTMLInputElement).value),
      });
    else if ('tradeReady' in d && this.trade)
      this.onSend('trade', { action: 'ready', id: this.trade.id });
    else if ('tradeCancel' in d && this.trade)
      this.onSend('trade', { action: 'cancel', id: this.trade.id });
    else if (d.class) this.onSend('class', d.class);
    else if (d.item) {
      this.selected = d.item;
      this.salvageConfirmation = '';
      this.render();
    } else if (d.equip) this.onSend('inventory', { action: 'equip', id: d.equip });
    else if (d.unequip) this.onSend('inventory', { action: 'unequip', slot: d.unequip });
    else if (d.page) {
      this.page = Math.max(0, Math.min(2, this.page + Number(d.page)));
      this.render();
    } else if (d.cast) {
      this.close();
      this.onAbility(d.cast as AbilityId);
    } else if (d.buy) this.onSend('buy', d.buy);
    else if (d.upgrade) this.onSend('forge', { action: 'upgrade', id: d.upgrade });
    else if (d.salvage) {
      if (this.salvageConfirmation === d.salvage) {
        this.salvageConfirmation = '';
        this.onSend('forge', { action: 'salvage', id: d.salvage });
      } else {
        this.salvageConfirmation = d.salvage;
        this.render();
      }
    } else if ('cancelSalvage' in d) {
      this.salvageConfirmation = '';
      this.render();
    } else if ('createClan' in d)
      this.onSend('clan', {
        action: 'create',
        name: (document.getElementById('clan-name') as HTMLInputElement).value,
      });
    else if (d.requestClan) this.onSend('clan', { action: 'request', clanId: d.requestClan });
    else if (d.accept) this.onSend('clan', { action: 'accept', profileId: d.accept });
    else if (d.kick) this.onSend('clan', { action: 'kick', profileId: d.kick });
    else if ('donate' in d)
      this.onSend('clan', {
        action: 'donate',
        amount: Number((document.getElementById('clan-gold') as HTMLInputElement).value),
      });
    else if ('leaveClan' in d) this.onSend('clan', { action: 'leave' });
    else if ('return' in d) {
      this.close();
      this.onReturn();
    }
  }
  chat(message: ChatMessage) {
    this.messages.push(message);
    this.messages = this.messages.slice(-50);
    this.renderChat();
  }
  private renderChat() {
    const lines = document.getElementById('chat-lines')!;
    lines.replaceChildren();
    const list = this.messages.filter((m) => m.channel === this.channel);
    for (const m of list) {
      const p = document.createElement('p');
      const name = document.createElement('strong');
      name.textContent = m.name + ': ';
      p.append(name, document.createTextNode(m.text));
      lines.append(p);
    }
    lines.scrollTop = lines.scrollHeight;
    document.getElementById('chat-latest')!.textContent = list.length
      ? `${list.at(-1)!.name}: ${list.at(-1)!.text}`
      : 'Lumengate · benvenuto nella chat';
  }
}
