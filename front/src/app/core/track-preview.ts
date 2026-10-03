import { Component, computed, inject, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAudioLines, lucidePlay, lucideVolumeOff } from '@ng-icons/lucide';
import { PreviewPlayer } from './preview-player';
import { PreviewDirective } from './preview.directive';

/**
 * Pochette d'un titre, demandée à Spotify par l'API s'il n'a jamais été vu dans une playlist :
 * à réserver aux listes courtes, une requête Spotify par titre inconnu.
 */
export function trackArtwork(track: { id: string; imageUrl: string | null }): string {
  return track.imageUrl ?? `/api/artwork/track/${track.id}`;
}

/**
 * Vignette d'un titre, sa pochette ou à défaut une icône : son extrait se joue au survol, ou au focus clavier.
 * La taille et l'arrondi se règlent sur l'élément hôte.
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
      class="bg-muted text-muted-foreground hover:text-foreground focus-visible:ring-ring data-playing:bg-primary data-playing:text-primary-foreground relative grid size-full place-items-center overflow-hidden rounded-[inherit] transition-colors focus-visible:ring-2 focus-visible:outline-none"
      [appPreview]="trackId()"
      [attr.aria-label]="
        (state() === 'unavailable' ? 'Pas d’extrait pour ' : 'Extrait de ') + name()
      "
      [title]="state() === 'unavailable' ? 'Pas d’extrait pour ce titre' : ''"
    >
      @if (imageUrl() && !failed()) {
        <img
          class="absolute inset-0 size-full object-cover"
          [src]="imageUrl()"
          alt=""
          loading="lazy"
          decoding="async"
          (error)="failed.set(true)"
        />
        @if (state() === 'playing') {
          <div class="absolute inset-0 grid place-items-center bg-black/40 text-white">
            <ng-icon name="lucideAudioLines" class="animate-pulse" />
          </div>
        }
      } @else {
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
      }
    </div>
  `,
})
export class TrackPreview {
  /** Id Spotify. */
  readonly trackId = input.required<string>();
  /** Nom du titre, pour les lecteurs d'écran. */
  readonly name = input.required<string>();
  /** Pochette, remplacée par l'icône de l'extrait si elle manque ou ne charge pas. */
  readonly imageUrl = input<string | null>();

  private readonly player = inject(PreviewPlayer);

  protected readonly state = computed(() => this.player.state(this.trackId()));
  protected readonly failed = signal(false);
}
