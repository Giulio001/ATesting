export class LoadingScreen {
  private root = document.getElementById('loading-screen')!;
  private title = document.getElementById('loading-title')!;
  private status = document.getElementById('loading-status')!;
  private progress = document.getElementById('loading-progress') as HTMLProgressElement;
  private retry = document.getElementById('loading-retry') as HTMLButtonElement;
  private blocked = new Map<HTMLElement, boolean>();
  private previousFocus?: HTMLElement;

  show(title = 'Lumengate prende forma') {
    if (this.root.hidden || !this.blocked.size) {
      this.previousFocus = document.activeElement as HTMLElement;
      for (const element of document.body.children) {
        if (
          element instanceof HTMLElement &&
          element !== this.root &&
          element.tagName !== 'SCRIPT'
        ) {
          this.blocked.set(element, element.inert);
          element.inert = true;
        }
      }
    }
    this.root.hidden = false;
    this.root.classList.remove('loading-error');
    this.root.setAttribute('aria-busy', 'true');
    this.title.textContent = title;
    this.retry.hidden = true;
    this.progress.value = 0;
    this.root.focus();
  }

  stage(message: string, value: number) {
    this.status.textContent = message;
    this.progress.value = Math.max(this.progress.value, Math.min(100, value));
  }

  async paint() {
    if (document.hidden) return;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }

  hide() {
    this.root.hidden = true;
    this.root.setAttribute('aria-busy', 'false');
    for (const [element, inert] of this.blocked) element.inert = inert;
    this.blocked.clear();
    if (this.previousFocus?.isConnected && !this.previousFocus.closest('.hidden, [hidden]'))
      this.previousFocus.focus();
  }

  fail(message: string, onRetry: () => void, label = 'Riprova') {
    this.root.classList.add('loading-error');
    this.root.setAttribute('aria-busy', 'false');
    this.title.textContent = 'Il varco non si è aperto';
    this.status.textContent = message;
    this.retry.textContent = label;
    this.retry.onclick = onRetry;
    this.retry.hidden = false;
    this.retry.focus();
  }
}
