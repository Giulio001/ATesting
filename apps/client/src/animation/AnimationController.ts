import {
  AnimationMixer,
  AnimationAction,
  LoopOnce,
  LoopRepeat,
  type Object3D,
  type AnimationClip,
} from 'three';

export type AnimationState =
  'Idle' | 'Run' | 'Attack01' | 'Attack02' | 'Attack03' | 'Block' | 'Hit' | 'Death' | 'Skill01';

/** Ordered clip candidates per logical state; the first existing clip wins. */
export type ClipAliases = Partial<Record<AnimationState, string[]>>;

const ONE_SHOT: readonly string[] = ['Skill01', 'Hit', 'Death'];

export class AnimationController {
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<string, AnimationAction>();
  private readonly aliases: ClipAliases;
  private current?: AnimationAction;
  private currentState?: AnimationState;

  constructor(root: Object3D, clips: AnimationClip[], aliases: ClipAliases = {}) {
    this.mixer = new AnimationMixer(root);
    this.aliases = aliases;
    for (const clip of clips)
      this.actions.set(clip.name.toLowerCase(), this.mixer.clipAction(clip));
  }

  /** True when the model ships a clip that maps onto the given state. */
  can(name: AnimationState) {
    return !!this.resolve(name);
  }

  private resolve(name: AnimationState) {
    const candidates = [
      ...(this.aliases[name] ?? []),
      name,
      ...(name.startsWith('Attack') ? ['attack01', 'idle'] : []),
      'idle',
    ];
    for (const candidate of candidates) {
      const action = this.actions.get(candidate.toLowerCase());
      if (action) return action;
    }
    return undefined;
  }

  play(name: AnimationState, force = false) {
    if (!force && this.currentState === name) return;
    const action = this.resolve(name);
    if (!action || action === this.current) return;
    const once = name.startsWith('Attack') || ONE_SHOT.includes(name);
    action.reset().setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once;
    action.fadeIn(0.15).play();
    this.current?.fadeOut(0.15);
    this.current = action;
    this.currentState = name;
  }

  update(dt: number) {
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
  }
}
