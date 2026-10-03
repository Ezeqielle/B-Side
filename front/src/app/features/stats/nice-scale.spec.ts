import { niceTicks } from './nice-scale';

describe('niceTicks', () => {
  it('rounds the top up to a 1, 2 or 5 step', () => {
    expect(niceTicks(2035)).toEqual([0, 1000, 2000, 3000]);
    expect(niceTicks(343)).toEqual([0, 100, 200, 300, 400]);
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
  });

  it('still draws an axis without data', () => {
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});
