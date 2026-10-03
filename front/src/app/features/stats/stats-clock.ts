import { Component, inject } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { StatsApi } from '../../core/stats-api';
import { ListeningClock } from './listening-clock';
import { StatsFilter } from './stats-filter';

/** Écoutes par jour et par heure pour le filtre courant. Charge ses propres données. */
@Component({
  selector: 'app-stats-clock',
  imports: [HlmCardImports, ListeningClock],
  template: `
    <section hlmCard class="transition-opacity" [class.opacity-60]="clock.isLoading()">
      <div hlmCardHeader>
        <h2 hlmCardTitle>Quand tu écoutes</h2>
        <p hlmCardDescription>Par jour de la semaine et par heure.</p>
      </div>
      <div hlmCardContent>
        <app-listening-clock [stats]="clock.value() ?? []" />
      </div>
    </section>
  `,
})
export class StatsClock {
  protected readonly clock = inject(StatsApi).clock(inject(StatsFilter).filter);
}
