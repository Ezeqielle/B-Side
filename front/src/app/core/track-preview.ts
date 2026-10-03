import { Component, computed, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAudioLines, lucidePlay, lucideVolumeOff } from '@ng-icons/lucide';
import { PreviewPlayer } from './preview-player';
import { PreviewDirective } from './preview.directive';

/**
 * Vignette d'un titre sans pochette : son extrait se joue au survol, ou au focus clavier.
 * La taille se règle sur l'élément hôte.
 */
@Component({
  selector: 'app-track-preview',
  imports: [NgIcon, PreviewDirective],
  viewProviders: [provideIcons({ lucideAudioLines, lucidePlay, lucideVolumeOff })],
  host: { class: 'block shrink-0' },
  template: `
    <div
      tabindex="0"
      role="img"
      class="bg-muted text-muted-foreground hover:text-foreground focus-visible:ring-ring data-playing:bg-primary data-playing:text-primary-foreground grid size-full place-items-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
      [appPreview]="trackId()"
      [attr.aria-label]="
        (state() === 'unavailable' ? 'Pas d’extrait pour ' : 'Extrait de ') + name()
      "
      [title]="state() === 'unavailable' ? 'Pas d’extrait pour ce titre' : ''"
    >
      @switch (state()) {
        @case ('playing') {
          <ng-icon name="lucideAudioLines" class="animate-pulse" />
        }
        @case ('unavailable') {
          <ng-icon name="lucideVolumeOff" class="opacity-50" />
        }
        @default {
          <ng-icon name="lucidePlay" />
        }
      }
    </div>
  `,
})
export class TrackPreview {
  /** Id Spotify. */
  readonly trackId = input.required<string>();
  /** Nom du titre, pour les lecteurs d'écran. */
  readonly name = input.required<string>();

  private readonly player = inject(PreviewPlayer);

  protected readonly state = computed(() => this.player.state(this.trackId()));
}
