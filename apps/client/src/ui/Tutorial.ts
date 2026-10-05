import {
  DUMMY,
  FRONTIER_TITLES,
  GROVE_TITLES,
  QUEST_GOAL,
  SPAWN,
  frontierObjective,
  groveObjective,
} from '@aetheria/shared';

interface Step {
  id: string;
  title: string;
  hint: string;
  focus?: string;
}

const STEPS: Step[] = [
  {
    id: 'move',
    title: 'Muoviti nella piazza',
    hint: 'WASD / frecce · joystick su mobile. Il movimento è sempre corsa.',
  },
  {
    id: 'attack',
    title: 'Prova un colpo sul manichino',
    hint: 'Click sinistro o Spazio · pulsante spada su mobile.',
    focus: 'attack',
  },
  {
    id: 'talk',
    title: 'Parla con Ser Aurel',
    hint: 'Avvicinati al custode vicino alla fontana e premi E.',
    focus: 'interact',
  },
  {
    id: 'shards',
    title: 'Sconfiggi tre Schegge del Vuoto',
    hint: 'Attraversa l’arco a sud: i cerchi rossi annunciano gli attacchi.',
  },
  {
    id: 'return',
    title: 'Torna da Ser Aurel',
    hint: 'Riscuoti il primo giuramento: 75 oro e 100 EXP.',
    focus: 'interact',
  },
];

export interface TutorialSnapshot {
  questState: number;
  questKills: number;
  frontierState: number;
  frontierKills: number;
  groveState: number;
  groveKills: number;
  x: number;
  z: number;
  dummyHp: number;
}

const $ = (id: string) => document.getElementById(id)!;

export class Tutorial {
  private steps = new Map<string, HTMLElement>();
  private completed = new Set<string>();
  private travelled = 0;
  private dummyTouched = false;
  private index = 0;
  private done = false;
  private dismissed = false;
  private questKey = '';

  constructor() {
    const list = $('tutorial-steps');
    for (const step of STEPS) {
      const item = document.createElement('li');
      item.dataset.step = step.id;
      item.innerHTML = '<b></b><small></small>';
      item.querySelector('b')!.textContent = step.title;
      item.querySelector('small')!.textContent = step.hint;
      list.append(item);
      this.steps.set(step.id, item);
    }
    $('tutorial-close').addEventListener('click', () => this.dismiss());
    $('tutorial').classList.add('hidden');
  }

  private dismiss() {
    this.dismissed = true;
    $('tutorial').classList.add('hidden');
  }

  show() {
    this.completed.clear();
    this.index = 0;
    this.done = false;
    this.dismissed = false;
    this.travelled = 0;
    this.dummyTouched = false;
    for (const item of this.steps.values()) {
      item.classList.remove('done', 'active');
    }
    $('tutorial').classList.remove('hidden', 'complete');
    this.render();
  }

  private complete(id: string) {
    if (this.completed.has(id)) return;
    this.completed.add(id);
    this.steps.get(id)?.classList.add('done');
  }

  update(snapshot: TutorialSnapshot) {
    this.travelled = Math.max(
      this.travelled,
      Math.hypot(snapshot.x - SPAWN.x, snapshot.z - SPAWN.z),
    );
    if (snapshot.dummyHp < DUMMY.maxHp) this.dummyTouched = true;
    if (this.travelled > 2.2) this.complete('move');
    if (this.dummyTouched) this.complete('attack');
    if (snapshot.questState >= 1) this.complete('talk');
    if (snapshot.questState >= 2) this.complete('shards');
    if (snapshot.questState >= 3) this.complete('return');
    this.render(snapshot);
  }

  private render(snapshot?: TutorialSnapshot) {
    for (const [index, step] of STEPS.entries()) {
      const item = this.steps.get(step.id)!;
      item.classList.toggle('active', !this.completed.has(step.id) && index === this.index);
    }
    const active = STEPS.find((step) => !this.completed.has(step.id));
    this.index = active ? STEPS.indexOf(active) : STEPS.length;
    const total = STEPS.length;
    ($('tutorial-progress') as HTMLElement).style.width = `${(this.completed.size / total) * 100}%`;
    $('tutorial-count').textContent = `${this.completed.size} / ${total}`;
    document
      .querySelectorAll('#hotbar button')
      .forEach((button) => button.classList.remove('tutorial-focus'));
    if (active?.focus) $(active.focus).classList.add('tutorial-focus');
    if (this.completed.size === total && !this.done) {
      this.done = true;
      $('tutorial').classList.add('complete');
      $('tutorial-title').textContent = 'Primi passi compiuti';
      setTimeout(() => {
        if (!this.dismissed) $('tutorial').classList.add('hidden');
      }, 4200);
    }
    if (snapshot) this.renderQuests(snapshot);
  }

  /** The tracker doubles as a compact quest log for the two active chapters. */
  private renderQuests(snapshot: TutorialSnapshot) {
    // Rebuilding the list every frame is wasteful, so render only on real changes.
    const key = `${snapshot.questState}|${snapshot.questKills}|${snapshot.frontierState}|${snapshot.frontierKills}|${snapshot.groveState}|${snapshot.groveKills}`;
    if (key === this.questKey) return;
    this.questKey = key;
    const list = $('quest-list');
    const rows: { title: string; objective: string; complete: boolean }[] = [
      {
        title: 'Il primo giuramento',
        objective:
          snapshot.questState === 0
            ? 'Parla con Ser Aurel alla fontana.'
            : snapshot.questState === 1
              ? `Sconfiggi le Schegge del Vuoto: ${Math.min(snapshot.questKills, QUEST_GOAL)} / ${QUEST_GOAL}.`
              : snapshot.questState === 2
                ? 'Torna da Ser Aurel per la ricompensa.'
                : 'Giuramento compiuto: la porta sud è al sicuro.',
        complete: snapshot.questState >= 3,
      },
    ];
    if (snapshot.frontierState > 0)
      rows.push({
        title: FRONTIER_TITLES[Math.min(snapshot.frontierState, FRONTIER_TITLES.length - 1)],
        objective: frontierObjective(snapshot.frontierState, snapshot.frontierKills),
        complete: snapshot.frontierState >= 5,
      });
    if (snapshot.frontierState >= 5 || snapshot.groveState > 0)
      rows.push({
        title: GROVE_TITLES[Math.min(snapshot.groveState, GROVE_TITLES.length - 1)],
        objective: groveObjective(snapshot.groveState, snapshot.groveKills),
        complete: snapshot.groveState >= 5,
      });
    list.replaceChildren(
      ...rows.map((row) => {
        const item = document.createElement('li');
        item.classList.toggle('done', row.complete);
        item.innerHTML = '<i></i><div><b></b><small></small></div>';
        item.querySelector('i')!.textContent = row.complete ? '◆' : '◇';
        item.querySelector('b')!.textContent = row.title;
        item.querySelector('small')!.textContent = row.objective;
        return item;
      }),
    );
  }
}
