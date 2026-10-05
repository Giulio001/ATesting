// Original synthesized cues: no downloads, external requests or third-party audio.
export class AudioManager {
  private context?: AudioContext;
  unlock() {
    this.context ??= new AudioContext();
    void this.context.resume();
  }
  hit(skill = false) {
    if (!this.context || this.context.state !== 'running') return;
    const ctx = this.context,
      osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = skill ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(skill ? 680 : 190, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(skill ? 90 : 45, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  }
}
