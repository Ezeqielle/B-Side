import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { MonthStat } from '../../core/models';
import { niceTicks } from './nice-scale';

interface Bar {
  month: string;
  plays: number;
  /** Graduation sous la barre : initiale du mois, ou année en janvier sur plusieurs années. */
  label: string;
  /** Années impaires masquées sur mobile, faute de place. */
  minor: boolean;
}

const MONTH_INITIALS = 'JFMAMJJASOND';

/**
 * Écoutes par mois, en barres. Le survol d'un mois affiche son détail, le pic par défaut.
 */
@Component({
  selector: 'app-timeline-chart',
  imports: [DatePipe, DecimalPipe],
  template: `
    @if (shown(); as bar) {
      <p class="text-sm" aria-hidden="true">
        <span class="text-muted-foreground"
          >{{ active() ? '' : 'Record : ' }}{{ bar.month + '-01' | date: 'MMMM yyyy' }}</span
        >
        · <span class="font-semibold">{{ bar.plays | number }}</span> écoutes
      </p>
    }

    <div class="mt-4 flex gap-2" aria-hidden="true">
      <div
        class="text-muted-foreground relative h-48 w-10 shrink-0 text-right text-xs tabular-nums"
      >
        @for (tick of ticks(); track tick) {
          <span class="absolute right-0 translate-y-1/2" [style.bottom.%]="(tick / top()) * 100">{{
            tick | number
          }}</span>
        }
      </div>
      <div class="flex-1">
        <div class="relative h-48">
          @for (tick of ticks(); track tick) {
            <div
              class="border-border absolute inset-x-0 border-t"
              [style.bottom.%]="(tick / top()) * 100"
            ></div>
          }
          <div
            class="absolute inset-0 flex items-end"
            [class]="bars().length > 48 ? 'gap-px' : 'gap-0.5'"
            (pointerleave)="active.set(null)"
          >
            @for (bar of bars(); track bar.month) {
              <div
                class="flex h-full flex-1 items-end justify-center"
                (pointerenter)="active.set(bar)"
              >
                <div
                  class="bg-viz w-full max-w-6 rounded-t-[4px] transition-opacity"
                  [class.opacity-40]="active() && active() !== bar"
                  [style.height.%]="(bar.plays / top()) * 100"
                ></div>
              </div>
            }
          </div>
        </div>
        <div
          class="text-muted-foreground mt-1 flex h-4 text-xs"
          [class]="bars().length > 48 ? 'gap-px' : 'gap-0.5'"
        >
          @for (bar of bars(); track bar.month) {
            <div class="relative flex-1" [class.text-center]="bars().length <= 24">
              <span
                class="whitespace-nowrap"
                [class.absolute]="bars().length > 24"
                [class.max-sm:hidden]="bar.minor"
                >{{ bar.label }}</span
              >
            </div>
          }
        </div>
      </div>
    </div>

    <div class="sr-only">
      <table>
        <caption>
          Écoutes par mois
        </caption>
        <tr>
          <th scope="col">Mois</th>
          <th scope="col">Écoutes</th>
        </tr>
        @for (bar of bars(); track bar.month) {
          <tr>
            <td>{{ bar.month + '-01' | date: 'MMMM yyyy' }}</td>
            <td>{{ bar.plays }}</td>
          </tr>
        }
      </table>
    </div>
  `,
})
export class TimelineChart {
  readonly months = input.required<MonthStat[]>();

  protected readonly active = signal<Bar | null>(null);

  /** Tous les mois entre le premier et le dernier, y compris ceux sans écoute. */
  protected readonly bars = computed<Bar[]>(() => {
    const months = this.months();
    if (!months.length) {
      return [];
    }

    const plays = new Map(months.map((m) => [m.month, m.plays]));
    const [first, last] = [months[0].month, months[months.length - 1].month];
    const count = toIndex(last) - toIndex(first) + 1;
    const yearly = count > 24;

    return Array.from({ length: count }, (_, i) => {
      const index = toIndex(first) + i;
      const [year, month] = [Math.floor(index / 12), index % 12];
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      return {
        month: key,
        plays: plays.get(key) ?? 0,
        label: yearly ? (month === 0 ? String(year) : '') : MONTH_INITIALS[month],
        minor: yearly && year % 2 === 1,
      };
    });
  });

  protected readonly ticks = computed(() =>
    niceTicks(Math.max(0, ...this.bars().map((b) => b.plays))),
  );
  protected readonly top = computed(() => this.ticks()[this.ticks().length - 1]);

  private readonly peak = computed(() =>
    this.bars().reduce<Bar | null>(
      (best, bar) => (!best || bar.plays > best.plays ? bar : best),
      null,
    ),
  );
  protected readonly shown = computed(() => this.active() ?? this.peak());
}

function toIndex(month: string): number {
  const [year, m] = month.split('-').map(Number);
  return year * 12 + m - 1;
}
