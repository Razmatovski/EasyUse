import handler from '../api/estimate';

describe('/api/estimate handler', () => {
  it('returns estimate with serviceability data', async () => {
    const req: any = {
      method: 'POST',
      body: {
        area_m2: '2-4',
        scope: 'tiling_only',
        tile_type: '<=60x60',
        plumbing: {
          wall_hung_wc: 0,
          shower_or_bath: 0,
          vanity_sink: 0,
          rain_shower: 0,
          floor_heating: 0
        },
        bathrooms: 1,
        postal_code: '50-001'
      }
    };
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res: any = { status };
    await handler(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      low: 2400,
      high: 2800,
      days_min: 8,
      days_max: 12,
      serviceable: true,
      distance_km: 0
    });
  });
});
