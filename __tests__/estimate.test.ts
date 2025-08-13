import { calculateEstimate } from '../estimate';

describe('calculateEstimate', () => {
  it('computes estimate for basic tiling only case', () => {
    const result = calculateEstimate('2-4', 'tiling_only', '<=60x60', {
      wall_hung_wc: 0,
      shower_or_bath: 0,
      vanity_sink: 0,
      rain_shower: 0,
      floor_heating: 0
    }, 1);
    expect(result).toEqual({ low: 2400, high: 2800, days_min: 8, days_max: 12 });
  });
});
