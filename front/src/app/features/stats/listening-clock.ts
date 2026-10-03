import { DecimalPipe } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { HourStat } from '../../core/models';

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * Écoutes par jour de la semaine et par heure : plus la case est foncée, plus tu écoutes.
 */
@Component({
  selector: 'app-listening-clock',
  imports: [DecimalPipe],
  template: `
    @if (shown(); as slot) {
      <p class="text-sm" aria-hidden="true">
        <span class="text-muted-foreground"
          >{{ active() ? '' : 'Pic : ' }}{{ days[slot.weekday - 1] }}, {{ slot.hour }} h –
          {{ slot.hour + 1 }} h</span
        >
        · <span class="font-semibold">{{ slot.plays | number }}</span> écoutes
      </p>
    }

    <div
      class="mt-4 grid grid-cols-[auto_repeat(24,minmax(0,1fr))] gap-0.5"
      aria-hidden="true"
      (pointerleave)="active.set(null)"
    >
      <span></span>
      @for (hour of hours; track hour) {
        <span class="text-muted-foreground text-xs whitespace-nowrap">{{
          hour % 6 === 0 ? hour + ' h' : ''
        }}</span>
      }
      @for (row of grid(); track $index; let day = $index) {
        <span class="text-muted-foreground pr-2 text-xs leading-none"
          >{{ days[day].slice(0, 3) }}.</span
        >
        @for (slot of row; track slot.hour) {
          <div
            class="aspect-square rounded-[3px] transition-opacity"
            [class.opacity-40]="active() && active() !== slot"
            [style.background-color]="color(slot.plays)"
            (pointerenter)="active.set(slot)"
          ></div>
        }
      }
    </div>

    <div
      class="text-muted-foreground mt-3 flex items-center justify-end gap-1 text-xs"
      aria-hidden="true"
    >
      moins
      @for (level of [0, 0.25, 0.5, 0.75, 1]; track level) {
        <span class="size-3 rounded-[3px]" [style.background-color]="color(level * max())"></span>
      }
      plus
    </div>

    <div class="sr-only">
      <table>
        <caption>
          Écoutes par jour et par heure
        </caption>
        <tr>
          <th scope="col">Créneau</th>
          <th scope="col">Écoutes</th>
        </tr>
        @for (row of grid(); track $index) {
          @for (slot of row; track slot.hour) {
            @if (slot.plays) {
              <tr>
                <td>{{ days[slot.weekday - 1] }} {{ slot.hour }} h</td>
                <td>{{ slot.plays }}</td>
              </tr>
            }
          }
        }
      </table>
    </div>
  `,
})
export class ListeningClock {
  readonly stats = input.required<HourStat[]>();

  protected readonly days = DAYS;
  protected readonly hours = HOURS;
  protected readonly active = signal<HourStat | null>(null);

  /** 7 lignes (lundi d'abord) de 24 créneaux, vides compris. */
  protected readonly grid = computed(() => {
    const plays = new Map(this.stats().map((h) => [`${h.weekday}-${h.hour}`, h.plays]));
    return DAYS.map((_, day) =>
      HOURS.map((hour) => ({
        weekday: day + 1,
        hour,
        plays: plays.get(`${day + 1}-${hour}`) ?? 0,
      })),
    );
  });

  protected readonly max = computed(() => Math.max(1, ...this.stats().map((h) => h.plays)));

  private readonly peak = computed(() =>
    this.grid()
      .flat()
      .reduce((best, slot) => (slot.plays > best.plays ? slot : best)),
  );
  protected readonly shown = computed(
    () => this.active() ?? (this.peak().plays ? this.peak() : null),
  );

  /** Une seule teinte, de la surface de la carte (aucune écoute) à la couleur pleine (le pic). */
  protected color(plays: number): string {
    return plays
      ? `color-mix(in oklch, var(--viz) ${8 + 92 * (plays / this.max())}%, var(--card))`
      : 'var(--muted)';
  }
}
