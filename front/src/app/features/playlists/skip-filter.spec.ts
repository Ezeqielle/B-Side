import { skipFilterOf, skipParamsOf } from './skip-filter';

describe('skipFilterOf', () => {
  it('reads both thresholds', () => {
    expect(skipFilterOf({ skips: '3', rate: '60' })).toEqual({ minSkips: 3, minRate: 60 });
  });

  it('disables a missing or invalid threshold', () => {
    expect(skipFilterOf({})).toEqual({ minSkips: null, minRate: null });
    expect(skipFilterOf({ skips: 'abc', rate: '' })).toEqual({ minSkips: null, minRate: null });
  });

  it('keeps thresholds within the slider bounds', () => {
    expect(skipFilterOf({ skips: '0', rate: '250' })).toEqual({ minSkips: 1, minRate: 100 });
    expect(skipFilterOf({ skips: '99', rate: '1' })).toEqual({ minSkips: 20, minRate: 5 });
  });
});

describe('skipParamsOf', () => {
  it('only writes enabled thresholds', () => {
    expect(skipParamsOf({ minSkips: 3, minRate: null })).toEqual({ skips: '3' });
    expect(skipParamsOf({ minSkips: null, minRate: 60 })).toEqual({ rate: '60' });
    expect(skipParamsOf({ minSkips: null, minRate: null })).toEqual({});
  });

  it('round-trips through the URL', () => {
    const filter = { minSkips: 5, minRate: 70 };
    expect(skipFilterOf(skipParamsOf(filter))).toEqual(filter);
  });
});
