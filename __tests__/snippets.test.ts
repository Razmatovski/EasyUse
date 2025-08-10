import { haversineKm, calculateEstimate, buildWhatsAppLink } from '../snippets';

describe('haversineKm', () => {
  it('returns zero for identical points', () => {
    const a = { lat: 0, lon: 0 };
    expect(haversineKm(a, a)).toBe(0);
  });
});

describe('calculateEstimate', () => {
  it('computes estimate with addons', () => {
    const result = calculateEstimate('2-4', 'tiling_only', '<=60x60', {
      wall_hung_wc: true,
      shower_or_bath: false,
      vanity_sink: false,
      rain_shower: false,
      floor_heating: false,
    });
    expect(result.low).toBeGreaterThan(0);
    expect(result.high).toBeGreaterThan(result.low);
  });
});

describe('buildWhatsAppLink', () => {
  it('encodes message in URL', () => {
    const url = buildWhatsAppLink({
      phone: '123456789',
      lang: 'en',
      payload: {
        name: 'John',
        phone: '123',
        estimate: { low: 1, high: 2, days_min: 3, days_max: 4 },
      },
    });
    expect(url).toContain('https://wa.me/123456789?text=');
  });
});
