import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { StatsOverview } from '../../core/models';

@Component({
  selector: 'app-stat-tiles',
  imports: [DecimalPipe, PercentPipe],
  template: `
    <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      @for (tile of tiles(); track tile.label) {
        <div class="bg-card rounded-xl border px-4 py-3">
          <dt class="text-muted-foreground text-sm">{{ tile.label }}</dt>
          <dd class="mt-1 text-2xl font-semibold">
            @if (tile.percent) {
              {{ tile.value | percent: '1.0-0' }}
            } @else {
              {{ tile.value | number: '1.0-0' }}
            }
          </dd>
        </div>
      }
    </dl>
  `,
})
export class StatTiles {
  readonly overview = input.required<StatsOverview>();

  protected readonly tiles = computed(() => {
    const o = this.overview();
    return [
      { label: 'Écoutes', value: o.plays },
      { label: "Heures d'écoute", value: o.msPlayed / 3_600_000 },
      { label: 'Titres', value: o.tracks },
      { label: 'Artistes', value: o.artists },
      { label: 'Écoutes passées', value: o.skipRate, percent: true },
    ];
  });
}
