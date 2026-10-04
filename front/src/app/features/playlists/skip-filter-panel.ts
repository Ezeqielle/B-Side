import { Component, model } from '@angular/core';
import { HlmSliderImports } from '@spartan-ng/helm/slider';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { SkipFilter } from '../../core/models';
import { RATE, SKIPS } from './skip-filter';

/**
 * Réglage des seuils des titres passés : nombre de passages et part des écoutes, chacun activable.
 */
@Component({
  selector: 'app-skip-filter-panel',
  imports: [HlmSliderImports, HlmSwitchImports],
  host: { class: 'bg-muted/40 grid gap-5 rounded-lg border p-4 sm:grid-cols-2' },
  template: `
    <div class="grid gap-2">
      <div class="flex items-center gap-3">
        <hlm-switch
          inputId="skip-filter-skips"
          [checked]="filter().minSkips !== null"
          (checkedChange)="set({ minSkips: $event ? skips.initial : null })"
        />
        <label for="skip-filter-skips" class="text-sm">
          @if (filter().minSkips; as minSkips) {
            Passés au moins <strong>{{ minSkips }}</strong> fois
          } @else {
            Nombre de passages
          }
        </label>
      </div>
      @if (filter().minSkips; as minSkips) {
        <hlm-slider
          aria-label="Nombre de passages minimum"
          [min]="skips.min"
          [max]="skips.max"
          [value]="[minSkips]"
          (valueChange)="set({ minSkips: $event[0] })"
        />
      }
    </div>

    <div class="grid gap-2">
      <div class="flex items-center gap-3">
        <hlm-switch
          inputId="skip-filter-rate"
          [checked]="filter().minRate !== null"
          (checkedChange)="set({ minRate: $event ? rate.initial : null })"
        />
        <label for="skip-filter-rate" class="text-sm">
          @if (filter().minRate; as minRate) {
            Passés sur au moins <strong>{{ minRate }} %</strong> des écoutes
          } @else {
            Part des écoutes passées
          }
        </label>
      </div>
      @if (filter().minRate; as minRate) {
        <hlm-slider
          aria-label="Part des écoutes passées, en %"
          [min]="rate.min"
          [max]="rate.max"
          [step]="5"
          [value]="[minRate]"
          (valueChange)="set({ minRate: $event[0] })"
        />
      }
    </div>
  `,
})
export class SkipFilterPanel {
  readonly filter = model.required<SkipFilter>();

  protected readonly skips = SKIPS;
  protected readonly rate = RATE;

  protected set(changes: Partial<SkipFilter>): void {
    this.filter.update((filter) => ({ ...filter, ...changes }));
  }
}
