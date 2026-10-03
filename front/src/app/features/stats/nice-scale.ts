/**
 * Graduations rondes (1, 2 ou 5 × 10^n) couvrant `max` : [0, pas, 2 × pas…].
 */
export function niceTicks(max: number, count = 4): number[] {
  const rough = Math.max(max, 1) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const nice = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  // Des écoutes : jamais de graduation décimale
  const step = Math.max(1, nice);
  const top = Math.ceil(Math.max(max, 1) / step) * step;

  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}
