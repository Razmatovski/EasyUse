import { buildWhatsAppLink } from '../wa';

describe('buildWhatsAppLink', () => {
  it('generates correct link with encoded message', () => {
    const link = buildWhatsAppLink({
      phone: '48500111222',
      lang: 'en',
      payload: {
        name: 'John',
        phone: '+48123456789',
        estimate: { low: 2000, high: 3000, days_min: 10, days_max: 15 },
        callback: 'day'
      }
    });
    const encoded = link.split('?text=')[1];
    const decoded = decodeURIComponent(encoded);
    expect(decoded).toBe(
`Hello! I'm interested in a turnkey bathroom.
Estimate: 2000-3000 PLN, timeline: 10-15 days.
Please contact me. Preference: day.`
    );
  });
});
