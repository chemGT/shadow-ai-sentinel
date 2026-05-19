import cors from 'cors';
import express from 'express';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'shadow-ai-sentinel-api' });
});

app.listen(PORT, () => {
  console.log(`[Shadow AI Sentinel] API listening on port ${PORT}`);
});
