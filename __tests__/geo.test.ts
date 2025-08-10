import { distanceFromZip } from '../helpers/geo';

describe('distanceFromZip', () => {
  it('returns 0 for Wroclaw zip', () => {
    expect(distanceFromZip('50-001')).toEqual({ distance_km: 0, serviceable: true });
  });

  it('computes distance for Warsaw and marks unserviceable', () => {
    expect(distanceFromZip('00-001')).toEqual({ distance_km: 301.4, serviceable: false });
  });

  it('returns null for unknown zip', () => {
    expect(distanceFromZip('99-999')).toEqual({ distance_km: null, serviceable: true });
  });
});
