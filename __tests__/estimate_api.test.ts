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
          wall_hung_wc: false,
          shower_or_bath: false,
          vanity_sink: false,
          rain_shower: false,
          floor_heating: false
        },
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
