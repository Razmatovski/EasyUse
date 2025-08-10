import { calculateEstimate } from '../estimate';

describe('calculateEstimate', () => {
  it('computes estimate for basic tiling only case', () => {
    const result = calculateEstimate('2-4', 'tiling_only', '<=60x60', {
      wall_hung_wc: false,
      shower_or_bath: false,
      vanity_sink: false,
      rain_shower: false,
      floor_heating: false
    });
    expect(result).toEqual({ low: 2400, high: 2800, days_min: 8, days_max: 12 });
  });
});
