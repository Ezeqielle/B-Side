import { DatePipe, PercentPipe } from '@angular/common';
import { Component, computed, input, model } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSliderImports } from '@spartan-ng/helm/slider';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { ADDED, CleanupRules, IDLE, PRESETS, SKIP, STARTS, months, sameRules } from './cleanup-rules';

/**
 * Réglage des règles de nettoyage : préréglages, protection des ajouts récents, et trois critères.
 */
@Component({
  selector: 'app-cleanup-panel',
  imports: [DatePipe, PercentPipe, HlmButtonImports, HlmSliderImports, HlmSwitchImports],
  host: { class: 'bg-muted/40 grid gap-5 rounded-lg border p-4' },
  template: `
    <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Préréglages">
      @for (preset of presets; track preset.label) {
        <button
          hlmBtn
          size="xs"
          [variant]="preset.label === activePreset() ? 'secondary' : 'ghost'"
          [attr.aria-pressed]="preset.label === activePreset()"
          (click)="rules.set(preset.rules)"
        >
          {{ preset.label }}
        </button>
      }
    </div>

    <div class="grid gap-5 sm:grid-cols-2">
      <div class="grid gap-2">
        <p id="cleanup-added" class="text-sm">
          @if (rules().addedMonths) {
            Ajoutés il y a plus de <strong>{{ months(rules().addedMonths) }}</strong>
          } @else {
            <strong>Tous les ajouts</strong>, même récents
          }
        </p>
        <hlm-slider
          aria-labelledby="cleanup-added"
          [min]="added.min"
          [max]="added.max"
          [value]="[rules().addedMonths]"
          (valueChange)="set({ addedMonths: $event[0] })"
        />
      </div>

      <div class="flex items-center gap-3">
        <hlm-switch inputId="cleanup-never" [checked]="rules().never" (checkedChange)="set({ never: $event })" />
        <label for="cleanup-never" class="text-sm">Jamais écoutés</label>
      </div>

      @let idleMonths = rules().idleMonths;
      <div class="grid gap-2">
        <div class="flex items-center gap-3">
          <hlm-switch
            inputId="cleanup-idle"
            [checked]="idleMonths !== null"
            (checkedChange)="set({ idleMonths: $event ? idle.initial : null })"
          />
          <label for="cleanup-idle" class="text-sm">
            Plus écoutés depuis
            @if (idleMonths !== null) {
              <strong>{{ months(idleMonths) }}</strong>
            } @else {
              un moment
            }
          </label>
        </div>
        @if (idleMonths !== null) {
          <hlm-slider
            aria-label="Plus écoutés depuis, en mois"
            [min]="idle.min"
            [max]="idle.max"
            [value]="[idleMonths]"
            (valueChange)="set({ idleMonths: $event[0] })"
          />
        }
      </div>

      @let rate = rules().skipRate;
      <div class="grid gap-2">
        <div class="flex items-center gap-3">
          <hlm-switch
            inputId="cleanup-skip"
            [checked]="rate !== null"
            (checkedChange)="set({ skipRate: $event ? skip.initial / 100 : null })"
          />
          <label for="cleanup-skip" class="text-sm">
            Souvent passés
            @if (rate !== null) {
              : <strong>{{ rate | percent }}</strong> des lancements, sur au moins
              <strong>{{ rules().minStarts }}</strong>
            }
          </label>
        </div>
        @if (rate !== null) {
          <hlm-slider
            aria-label="Part des lancements passés, en %"
            [min]="skip.min"
            [max]="skip.max"
            [step]="5"
            [value]="[rate * 100]"
            (valueChange)="set({ skipRate: $event[0] / 100 })"
          />
          <hlm-slider
            aria-label="Nombre de lancements minimum"
            [min]="starts.min"
            [max]="starts.max"
            [value]="[rules().minStarts]"
            (valueChange)="set({ minStarts: $event[0] })"
          />
        }
      </div>
    </div>

    <p class="text-muted-foreground text-xs">
      Un titre est retenu s'il répond à l'un des critères activés.
      @if (reference(); as date) {
        Les durées se comptent jusqu'à ta dernière écoute importée, le {{ date | date: 'd MMMM yyyy' }}.
      }
    </p>
  `,
})
export class CleanupPanel {
  readonly rules = model.required<CleanupRules>();
  /** Dernière écoute importée, date ISO. */
  readonly reference = input<string | null>(null);

  protected readonly presets = PRESETS;
  protected readonly added = ADDED;
  protected readonly idle = IDLE;
  protected readonly skip = SKIP;
  protected readonly starts = STARTS;
  protected readonly months = months;

  protected readonly activePreset = computed(() => {
    const rules = this.rules();
    return PRESETS.find((preset) => sameRules(preset.rules, rules))?.label;
  });

  protected set(change: Partial<CleanupRules>): void {
    this.rules.update((rules) => ({ ...rules, ...change }));
  }
}
