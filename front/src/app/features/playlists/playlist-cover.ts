import { Component, computed, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHeart } from '@ng-icons/lucide';
import { LIKED_PLAYLIST_ID, PlaylistStat } from '../../core/models';

/** Image de la playlist, un cœur pour les titres likés, ou son initiale. La taille se règle sur l'élément hôte. */
@Component({
  selector: 'app-playlist-cover',
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucideHeart })],
  host: { class: 'block shrink-0 overflow-hidden rounded-md', 'aria-hidden': 'true' },
  template: `
    @let p = playlist();
    @if (liked()) {
      <div class="bg-primary text-primary-foreground grid size-full place-items-center">
        <ng-icon name="lucideHeart" size="1.25em" />
      </div>
    } @else if (p.imageUrl && !failed()) {
      <img
        class="bg-muted size-full object-cover"
        [src]="p.imageUrl"
        alt=""
        loading="lazy"
        decoding="async"
        (error)="failed.set(true)"
      />
    } @else {
      <div class="bg-muted text-muted-foreground grid size-full place-items-center font-semibold">
        {{ p.name.charAt(0).toUpperCase() }}
      </div>
    }
  `,
})
export class PlaylistCover {
  readonly playlist = input.required<PlaylistStat>();

  protected readonly liked = computed(() => this.playlist().id === LIKED_PLAYLIST_ID);
  protected readonly failed = signal(false);
}
