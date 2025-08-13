import express from 'express';
import path from 'path';
import { calculateEstimate } from './estimate';
import { distanceFromZip } from './helpers/geo';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

app.post('/api/estimate', (req, res) => {
  const { area_m2, scope, tile_type, plumbing, bathrooms, postal_code } = req.body;
  const estimate = calculateEstimate(area_m2, scope, tile_type, plumbing, bathrooms);
  const geo = postal_code ? distanceFromZip(postal_code) : { serviceable: true, distance_km: null };
  res.json({ ...estimate, ...geo });
});

app.post('/api/leads', (_req, res) => {
  res.json({ message: 'Lead received' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
