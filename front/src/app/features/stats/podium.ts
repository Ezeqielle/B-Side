import { DecimalPipe } from '@angular/common';
import { Component, booleanAttribute, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrackPreview } from '../../core/track-preview';
import type { RankedEntry } from './ranking';

/** Du 1er au 3e : couleur, colonne (le 1er au centre), taille de l'image et hauteur de la marche. */
const PLACES = [
  { medal: 'var(--gold)', column: 'col-start-2', image: 'size-22 sm:size-32', step: 'h-16' },
  { medal: 'var(--silver)', column: 'col-start-1', image: 'size-18 sm:size-24', step: 'h-11' },
  { medal: 'var(--bronze)', column: 'col-start-3', image: 'size-18 sm:size-24', step: 'h-7' },
];

/**
 * Les trois premiers d'un classement, mis en avant sur un podium or / argent / bronze.
 */
@Component({
  selector: 'app-podium',
  imports: [DecimalPipe, RouterLink, TrackPreview],
  template: `
    <ol class="grid grid-cols-3 items-end gap-2 sm:gap-4">
      @for (entry of entries().slice(0, 3); track entry.key; let i = $index) {
        <li
          class="row-start-1 flex min-w-0 flex-col items-center text-center"
          [class]="places[i].column"
          [style.--medal]="places[i].medal"
        >
          <div
            class="medal-frame shrink-0 p-1"
            [class]="places[i].image + (round() ? ' rounded-full' : ' rounded-xl')"
            [class.medal-glow]="i === 0"
          >
            @if (entry.trackId; as trackId) {
              <app-track-preview
                class="size-full rounded-lg"
                [trackId]="trackId"
                [name]="entry.name"
                [imageUrl]="entry.imageUrl"
              />
            } @else if (failed().has(entry.key)) {
              <div
                class="bg-muted text-muted-foreground grid size-full place-items-center text-2xl font-semibold"
                [class]="round() ? 'rounded-full' : 'rounded-lg'"
                aria-hidden="true"
              >
                {{ entry.name.charAt(0).toUpperCase() }}
              </div>
            } @else {
              <img
                class="bg-muted size-full object-cover"
                [class]="round() ? 'rounded-full' : 'rounded-lg'"
                [src]="entry.imageUrl"
                alt=""
                decoding="async"
                (error)="fail(entry.key)"
              />
            }
          </div>

          <p
            class="mt-2 line-clamp-2 w-full text-sm font-semibold break-words"
            [title]="entry.name"
          >
            @if (entry.trackId) {
              {{ entry.name }}
            } @else {
              <a
                class="hover:underline"
                [routerLink]="entry.link"
                [title]="'Filtrer sur ' + entry.name"
                >{{ entry.name }}</a
              >
            }
          </p>
          @if (entry.trackId) {
            <a
              class="text-muted-foreground hover:text-foreground max-w-full truncate text-xs hover:underline"
              [routerLink]="entry.link"
              [title]="'Filtrer sur ' + entry.artist"
              >{{ entry.artist }}</a
            >
          }
          <p class="text-muted-foreground text-xs tabular-nums">
            {{ entry.plays | number }} écoutes
          </p>

          <div
            class="medal-step mt-2 grid w-full place-items-center rounded-t-md text-lg font-bold"
            [class]="places[i].step"
          >
            <span><span class="sr-only">Place </span>{{ i + 1 }}</span>
          </div>
        </li>
      }
    </ol>
  `,
  styles: `
    .medal-frame {
      background: linear-gradient(
        135deg,
        var(--medal),
        color-mix(in oklab, var(--medal), white 55%) 45%,
        var(--medal) 60%,
        color-mix(in oklab, var(--medal), black 25%)
      );
    }
    .medal-glow {
      box-shadow: 0 10px 28px -8px color-mix(in oklab, var(--medal) 70%, transparent);
    }
    .medal-step {
      background: linear-gradient(
        color-mix(in oklab, var(--medal) 22%, transparent),
        color-mix(in oklab, var(--medal) 4%, transparent)
      );
      border-top: 3px solid var(--medal);
      color: color-mix(in oklab, var(--medal), black 45%);
    }
    :host-context(.dark) .medal-step {
      color: color-mix(in oklab, var(--medal), white 15%);
    }
  `,
})
export class Podium {
  readonly entries = input.required<RankedEntry[]>();
  /** Image ronde (artistes) plutôt que carrée (pochettes). */
  readonly round = input(false, { transform: booleanAttribute });

  protected readonly places = PLACES;

  /** Entrées sans image : on affiche leur initiale. */
  protected readonly failed = signal(new Set<string>());

  protected fail(key: string): void {
    this.failed.update((keys) => new Set(keys).add(key));
  }
}
