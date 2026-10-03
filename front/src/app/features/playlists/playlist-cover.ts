import { Component, input, signal } from '@angular/core';

/** Image de la playlist, ou son initiale. La taille se règle sur l'élément hôte. */
@Component({
  selector: 'app-playlist-cover',
  host: { class: 'block shrink-0 overflow-hidden rounded-md', 'aria-hidden': 'true' },
  template: `
    @if (imageUrl() && !failed()) {
      <img
        class="bg-muted size-full object-cover"
        [src]="imageUrl()"
        alt=""
        loading="lazy"
        decoding="async"
        (error)="failed.set(true)"
      />
    } @else {
      <div class="bg-muted text-muted-foreground grid size-full place-items-center font-semibold">
        {{ name().charAt(0).toUpperCase() }}
      </div>
    }
  `,
})
export class PlaylistCover {
  readonly name = input.required<string>();
  readonly imageUrl = input<string | null>(null);

  protected readonly failed = signal(false);
}
