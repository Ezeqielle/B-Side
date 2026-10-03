import { DestroyRef, Directive, computed, inject, input } from '@angular/core';
import { PreviewPlayer } from './preview-player';

/** Évite de lancer un extrait en passant simplement la souris. */
const HOVER_DELAY_MS = 300;

/**
 * Joue l'extrait du titre (id Spotify) au survol à la souris ou au focus clavier, l'arrête en partant.
 * Rien au toucher : il n'y a pas de survol. `data-playing` est posé pendant la lecture, pour un indicateur visuel.
 */
@Directive({
  selector: '[appPreview]',
  host: {
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'leave()',
    '(focusin)': 'enter()',
    '(focusout)': 'leave()',
    '[attr.data-playing]': 'playing() ? "" : null',
  },
})
export class PreviewDirective {
  /** Sans id, la directive ne fait rien : pratique pour un composant qui affiche aussi des artistes. */
  readonly appPreview = input<string | null | undefined>();

  private readonly player = inject(PreviewPlayer);
  private timer?: ReturnType<typeof setTimeout>;

  protected readonly playing = computed(() => {
    const id = this.appPreview();
    return !!id && this.player.playing() === id;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.leave());
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      this.enter();
    }
  }

  protected enter(): void {
    const id = this.appPreview();
    if (!id) {
      return;
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.player.play(id), HOVER_DELAY_MS);
  }

  protected leave(): void {
    clearTimeout(this.timer);
    if (this.playing()) {
      this.player.stop();
    }
  }
}
