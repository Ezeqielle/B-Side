import { Component, input, output } from '@angular/core';
import { Track } from '../../core/models';
import { PreviewDirective } from '../../core/preview.directive';

/** Ce qu'affiche la carte : un titre Spotify ou un titre de l'historique. */
export type CardTrack = Pick<Track, 'id' | 'name' | 'artists' | 'album' | 'imageUrl'>;

@Component({
  selector: 'app-track-card',
  imports: [PreviewDirective],
  template: `
    <figure class="group rounded-lg" [appPreview]="track().id">
      <button
        type="button"
        class="bg-muted ring-primary focus-visible:ring-ring relative block aspect-square w-full cursor-pointer overflow-hidden rounded-lg shadow-md group-data-playing:ring-2 focus-visible:ring-2 focus-visible:outline-none"
        [attr.aria-label]="'Statistiques de ' + track().name"
        (click)="opened.emit()"
      >
        @if (track().imageUrl; as src) {
          <img
            [src]="src"
            alt=""
            loading="lazy"
            class="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        }
        <span
          class="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur"
        >
          #{{ rank() }}
        </span>
      </button>
      <figcaption class="mt-2 min-w-0">
        <p class="truncate text-sm font-medium" [title]="track().name">{{ track().name }}</p>
        <p class="text-muted-foreground truncate text-xs">{{ track().artists.join(', ') }}</p>
      </figcaption>
    </figure>
  `,
})
export class TrackCard {
  readonly track = input.required<CardTrack>();
  readonly rank = input.required<number>();
  /** Clic sur la pochette. Le focus du bouton remonte à la carte : son extrait se joue aussi au clavier. */
  readonly opened = output();
}
