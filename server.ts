import express from 'express';
import { calculateEstimate } from './estimate';

const app = express();
app.use(express.json());

app.post('/api/estimate', (req, res) => {
  const { area_m2, scope, tile_type, plumbing } = req.body;
  const estimate = calculateEstimate(area_m2, scope, tile_type, plumbing);
  res.json(estimate);
});

app.post('/api/leads', (_req, res) => {
  res.json({ message: 'Lead received' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
