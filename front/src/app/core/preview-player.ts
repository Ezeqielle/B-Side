import { DOCUMENT, Service, inject, signal } from '@angular/core';

const FADE_MS = 300;
const VOLUME = 0.7;
const STORAGE_KEY = 'previews-enabled';

export type PreviewState = 'idle' | 'playing' | 'unavailable';

/**
 * Extraits de 30 s joués au survol, un seul à la fois, avec fondu entre deux titres.
 * Le navigateur bloque l'audio avant la première interaction : rien ne joue avant un clic ou une touche.
 */
@Service()
export class PreviewPlayer {
  private readonly document = inject(DOCUMENT);
  private readonly audio = new Audio();
  private unlocked = false;
  private frame = 0;

  /** Id Spotify du titre en cours, y compris pendant son chargement. */
  readonly playing = signal<string | null>(null);
  /** Choix de l'utilisateur, gardé d'une visite à l'autre. */
  readonly enabled = signal(readEnabled());
  /** Titres sans extrait, appris au survol : ils ne sont plus redemandés pendant la visite. */
  private readonly unavailable = signal<ReadonlySet<string>>(new Set());

  constructor() {
    const unlock = () => (this.unlocked = true);
    for (const type of ['pointerdown', 'keydown']) {
      this.document.addEventListener(type, unlock, { once: true, capture: true });
    }
    this.audio.addEventListener('ended', () => this.playing.set(null));
  }

  state(trackId: string): PreviewState {
    if (this.playing() === trackId) {
      return 'playing';
    }
    return this.unavailable().has(trackId) ? 'unavailable' : 'idle';
  }

  play(trackId: string): void {
    if (!this.unlocked || !this.enabled() || this.state(trackId) !== 'idle') {
      return;
    }
    this.playing.set(trackId);
    // Un fondu interrompu ne se termine jamais : seul le dernier titre demandé démarre
    (this.audio.paused ? Promise.resolve() : this.fadeTo(0)).then(() => this.start(trackId));
  }

  stop(): void {
    if (this.playing() === null) {
      return;
    }
    this.playing.set(null);
    this.fadeTo(0).then(() => this.audio.pause());
  }

  toggle(): void {
    const enabled = !this.enabled();
    this.enabled.set(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour la visite
    }
    if (!enabled) {
      this.stop();
    }
  }

  private async start(trackId: string): Promise<void> {
    this.audio.volume = 0;
    this.audio.src = `/api/preview/track/${trackId}`;
    try {
      await this.audio.play();
    } catch {
      // Toujours le titre demandé : pas d'extrait (404). Sinon, lecture remplacée par une autre ou arrêtée
      if (this.playing() === trackId) {
        this.playing.set(null);
        this.unavailable.update((ids) => new Set(ids).add(trackId));
      }
      return;
    }
    if (this.playing() === trackId) {
      void this.fadeTo(VOLUME);
    }
  }

  /** Remplace le fondu en cours, dont la promesse reste alors en attente. */
  private fadeTo(volume: number): Promise<void> {
    cancelAnimationFrame(this.frame);
    const from = this.audio.volume;
    let start: number | undefined;
    return new Promise((resolve) => {
      const step = (now: number) => {
        start ??= now;
        const progress = Math.min((now - start) / FADE_MS, 1);
        this.audio.volume = from + (volume - from) * progress;
        if (progress < 1) {
          this.frame = requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      this.frame = requestAnimationFrame(step);
    });
  }
}

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}
