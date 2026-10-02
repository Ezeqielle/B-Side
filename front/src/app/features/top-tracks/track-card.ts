import { Component, input } from '@angular/core';
import { Track } from '../../core/models';

@Component({
  selector: 'app-track-card',
  template: `
    <figure class="group">
      <div class="bg-muted relative aspect-square overflow-hidden rounded-lg shadow-md">
        @if (track().imageUrl; as src) {
          <img
            [src]="src"
            [alt]="track().album"
            loading="lazy"
            class="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        }
        <span
          class="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur"
        >
          #{{ rank() }}
        </span>
      </div>
      <figcaption class="mt-2 min-w-0">
        <p class="truncate text-sm font-medium" [title]="track().name">{{ track().name }}</p>
        <p class="text-muted-foreground truncate text-xs">{{ track().artists.join(', ') }}</p>
      </figcaption>
    </figure>
  `,
})
export class TrackCard {
  readonly track = input.required<Track>();
  readonly rank = input.required<number>();
}
