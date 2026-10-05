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
export class AnimationController {
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<string, AnimationAction>();
  private current?: AnimationAction;
  constructor(root: Object3D, clips: AnimationClip[]) {
    this.mixer = new AnimationMixer(root);
    for (const clip of clips)
      this.actions.set(clip.name.toLowerCase(), this.mixer.clipAction(clip));
  }
  play(name: AnimationState) {
    const action =
      this.actions.get(name.toLowerCase()) ??
      (name.startsWith('Attack') ? this.actions.get('attack01') : undefined) ??
      this.actions.get('idle');
    if (!action || (action === this.current && (action.isRunning() || name === 'Death'))) return;
    const once = name.startsWith('Attack') || ['Skill01', 'Hit', 'Death'].includes(name);
    action.reset().setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once;
    action.fadeIn(0.15).play();
    this.current?.fadeOut(0.15);
    this.current = action;
  }
  update(dt: number) {
    this.mixer.update(dt);
  }
  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
  }
}
